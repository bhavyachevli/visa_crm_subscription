"""
Auth routes: login, Google OAuth, hierarchical account creation, MFA, logout, tenant registration.

Role hierarchy:
  CEO → creates → DIRECTOR (assigns country)
  DIRECTOR → creates → BRANCH_ADMIN (in own country only)
  BRANCH_ADMIN → cannot create accounts
"""
from fastapi import APIRouter, Response, Request, HTTPException, Depends, BackgroundTasks
from bson import ObjectId
import os
from datetime import datetime, timezone
import pyotp
import random

from utils.db import db, coordinator_db, db_context, client
from utils.auth_utils import hash_password, verify_password, create_access_token, generate_totp_secret, decode_access_token
from utils.google_auth import verify_google_token
from models.schemas import (
    UserCreate, UserLogin, VerifyMfa, VerifyEnableMfa,
    CreateUserByAdmin, GoogleAuthRequest,
    ForgotPasswordRequest, VerifyForgotPasswordOTP, ResetPasswordRequest,
    TenantRegister
)
from middleware.auth import get_current_user
from utils.rate_limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize_user(user: dict) -> dict:
    """Return a JSON-safe user dict for the session payload."""
    return {
        "sub": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "country": user.get("country"),
        "branchId": str(user["branchId"]) if user.get("branchId") else None,
        "tokenVersion": user.get("tokenVersion", 1),
        "db_name": user.get("db_name") or db_context.get().name,
        "tenant_id": str(user.get("tenant_id")) if user.get("tenant_id") else None,
    }

_IS_PRODUCTION = os.environ.get("ENV", "development") == "production"

def create_session(user: dict, response: Response):
    """Create JWT session cookie and return user info."""
    payload = _serialize_user(user)
    token = create_access_token(payload)
    response.set_cookie(
        key="nexus_session",
        value=token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=_IS_PRODUCTION,
    )
    return {"ok": True, "role": user["role"], "country": user.get("country")}

# ─── Tenant Public Registration ───────────────────────────────────────────────

@router.post("/register-tenant")
def register_tenant(req: TenantRegister):
    """
    Public endpoint for new companies to subscribe.
    Creates coordinator tenant metadata, global user lookup, and seeds the tenant database with CEO.
    """
    # Normalize email
    email_clean = req.email.strip().lower()
    
    if coordinator_db.users.find_one({"email": email_clean}):
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Map planId to seatsLimit and profilesLimit
    plan_id = req.planId.strip().lower() if req.planId else "starter"
    if plan_id not in ("starter", "growth", "agency"):
        plan_id = "starter"
        
    seats_limit = 1
    profiles_limit = 100
    
    if plan_id == "growth":
        seats_limit = 5
        profiles_limit = 500
    elif plan_id == "agency":
        seats_limit = 999999
        profiles_limit = 999999

    # 1. Create Tenant metadata in coordinator
    tenant_id = ObjectId()
    db_name = f"nexus_tenant_{str(tenant_id)}"
    
    tenant_doc = {
        "_id": tenant_id,
        "company_name": req.companyName.strip(),
        "owner_email": email_clean,
        "db_name": db_name,
        "subscription_status": "inactive",  # Starts inactive, requires payment checkout
        "planId": plan_id,
        "seatsLimit": seats_limit,
        "profilesLimit": profiles_limit,
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "createdAt": datetime.now(timezone.utc)
    }
    coordinator_db.tenants.insert_one(tenant_doc)

    pwd_hash = hash_password(req.password)

    # 2. Create User mapping globally in coordinator for login routing
    coordinator_db.users.insert_one({
        "email": email_clean,
        "passwordHash": pwd_hash,
        "role": "CEO",
        "tenant_id": tenant_id,
        "db_name": db_name,
        "googleId": None
    })

    # 3. Seed the tenant database
    token_token = db_context.set(client[db_name])
    try:
        # Create default CEO user
        db.users.insert_one({
            "email": email_clean,
            "name": req.name.strip(),
            "passwordHash": pwd_hash,
            "googleId": None,
            "role": "CEO",
            "country": None,
            "branchId": None,
            "createdBy": None,
            "isActive": True,
            "emailVerifiedAt": datetime.now(timezone.utc),
            "totpEnabled": False,
            "totpSecret": None,
            "tenant_id": tenant_id,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        })

        # Seed initial default branch
        db.branches.insert_one({
            "name": "Main Office",
            "city": "HQ",
            "country": "India"
        })
    finally:
        db_context.reset(token_token)

    return {
        "success": True,
        "message": "Tenant registered successfully. Please proceed to payment.",
        "tenantId": str(tenant_id),
        "email": email_clean
    }

# ─── Standard Email/Password Login ────────────────────────────────────────────

@router.post("/login")
def login(creds: UserLogin, response: Response, _rl=Depends(limiter.limit(5, 60))):
    email_clean = creds.email.strip().lower()
    
    # 1. Look up globally in coordinator
    coord_user = coordinator_db.users.find_one({"email": email_clean})
    if not coord_user or not verify_password(creds.password, coord_user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    db_name = coord_user.get("db_name")
    if not db_name:
        raise HTTPException(status_code=400, detail="Invalid user tenant configuration")

    # 2. Switch context to the tenant database to load full profile
    token_token = db_context.set(client[db_name])
    try:
        user = db.users.find_one({"email": email_clean})
        if not user:
            raise HTTPException(status_code=404, detail="User profile not found in tenant database")
            
        if not user.get("isActive", True):
            raise HTTPException(status_code=403, detail="Account has been deactivated")

        if user.get("totpEnabled"):
            response.set_cookie(key="nexus_mfa_pending", value=str(user["_id"]), httponly=True, max_age=600)
            return {"needsMfa": True}

        # Keep tenant_id on user mapping
        user["tenant_id"] = coord_user.get("tenant_id")
        return create_session(user, response)
    finally:
        db_context.reset(token_token)

# ─── Google OAuth: Sign In ─────────────────────────────────────────────────

@router.post("/google/login")
def google_login(req: GoogleAuthRequest, response: Response, _rl=Depends(limiter.limit(5, 60))):
    """
    User signs in with Google. Verifies the ID token server-side,
    finds the user globally, switches database, then creates session.
    """
    try:
        google_data = verify_google_token(req.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    email_clean = google_data["email"].strip().lower()

    # Look up globally in coordinator
    coord_user = coordinator_db.users.find_one({
        "$or": [
            {"googleId": google_data["googleId"]},
            {"email": email_clean}
        ]
    })
    
    if not coord_user:
        raise HTTPException(
            status_code=404,
            detail="No account found. Please register or ask your administrator to create your account."
        )

    db_name = coord_user.get("db_name")
    if not db_name:
        raise HTTPException(status_code=400, detail="Invalid user tenant configuration")

    # Switch database context
    token_token = db_context.set(client[db_name])
    try:
        user = db.users.find_one({"email": email_clean})
        if not user:
            raise HTTPException(status_code=404, detail="User profile not found in tenant database")

        # Link googleId if missing
        if not user.get("googleId") or not coord_user.get("googleId"):
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"googleId": google_data["googleId"], "emailVerifiedAt": datetime.now(timezone.utc)}}
            )
            coordinator_db.users.update_one(
                {"_id": coord_user["_id"]},
                {"$set": {"googleId": google_data["googleId"]}}
            )
            user = db.users.find_one({"_id": user["_id"]})

        if not user.get("isActive", True):
            raise HTTPException(status_code=403, detail="Account has been deactivated")

        user["tenant_id"] = coord_user.get("tenant_id")
        return create_session(user, response)
    finally:
        db_context.reset(token_token)

# ─── Google OAuth: Create Account (hierarchical) ───────────────────────────

@router.post("/google/create-account")
def google_create_account(
    req: GoogleAuthRequest,
    response: Response,
    current_user=Depends(get_current_user)
):
    """
    Authenticated users create a new account for someone else using Google.
    Admin also updates coordinator global users table.
    """
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Branch Admins cannot create accounts")

    try:
        google_data = verify_google_token(req.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    email_clean = google_data["email"].strip().lower()

    # Validate role hierarchy
    if req.role == "DIRECTOR":
        if current_user["role"] != "CEO":
            raise HTTPException(status_code=403, detail="Only CEO can create Director accounts")
        if not req.branchId:
            raise HTTPException(status_code=400, detail="Branch is required for Director accounts")
        branch = db.branches.find_one({"_id": ObjectId(req.branchId)})
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        country = branch.get("country")
        branch_id = ObjectId(req.branchId)

    elif req.role in ("BRANCH_ADMIN", "ADMIN"):
        if current_user["role"] != "DIRECTOR":
            raise HTTPException(status_code=403, detail="Only Directors can create Branch Admin accounts")
        if not req.branchId:
            raise HTTPException(status_code=400, detail="Branch is required for Branch Admin accounts")
        branch = db.branches.find_one({"_id": ObjectId(req.branchId)})
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot assign admin to branch outside your country")
        country = current_user.get("country")
        branch_id = ObjectId(req.branchId)

    elif req.role == "HR":
        if current_user["role"] not in ("CEO", "DIRECTOR"):
            raise HTTPException(status_code=403, detail="Only CEO or Directors can create HR accounts")
        
        if current_user["role"] == "CEO":
            country = req.country or None
            branch_id = ObjectId(req.branchId) if req.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if country and branch.get("country") != country:
                    raise HTTPException(status_code=400, detail="Branch country does not match assigned country")
                if not country:
                    country = branch.get("country")
        else:
            country = current_user.get("country")
            branch_id = ObjectId(req.branchId) if req.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if branch.get("country") != current_user.get("country"):
                    raise HTTPException(status_code=403, detail="Cannot assign HR to branch outside your country")
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Check coordinator globally first
    if coordinator_db.users.find_one({"email": email_clean}):
        raise HTTPException(status_code=400, detail="This email is already registered")

    tenant_id_str = current_user.get("tenant_id")
    tenant_id = ObjectId(tenant_id_str) if tenant_id_str else None

    # Check seats limit
    if tenant_id_str:
        tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id_str)})
        if tenant:
            seats_limit = tenant.get("seatsLimit", 1)
            current_seats = db.users.count_documents({})
            if current_seats >= seats_limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Upgrade required. Your plan allows up to {seats_limit} team seat(s)."
                )

    # Insert in tenant database
    new_user = {
        "email": email_clean,
        "name": google_data["name"],
        "googleId": google_data["googleId"],
        "passwordHash": None,
        "role": req.role,
        "country": country,
        "state": req.state,
        "city": req.city,
        "area": req.area,
        "branchId": branch_id,
        "createdBy": current_user["_id"],
        "emailVerifiedAt": datetime.now(timezone.utc),
        "isActive": True,
        "totpEnabled": False,
        "totpSecret": None,
        "tenant_id": tenant_id,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id

    # Insert globally in coordinator mapping
    coordinator_db.users.insert_one({
        "email": email_clean,
        "passwordHash": None,
        "role": req.role,
        "tenant_id": tenant_id,
        "db_name": db_context.get().name,
        "googleId": google_data["googleId"]
    })

    return create_session(new_user, response)

# ─── Admin Creates Account With Email+Password (for Director/BRANCH_ADMIN/HR) ───

@router.post("/create-user")
def create_user_by_admin(
    data: CreateUserByAdmin,
    current_user=Depends(get_current_user)
):
    """
    Hierarchical account creation. Adds mapping to global coordinator users table.
    """
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Branch Admins cannot create accounts")

    if data.role == "CEO":
        raise HTTPException(status_code=403, detail="CEO accounts cannot be created via this endpoint")

    email_clean = data.email.strip().lower()

    if data.role == "DIRECTOR":
        if current_user["role"] != "CEO":
            raise HTTPException(status_code=403, detail="Only CEO can create Director accounts")
        if not data.branchId:
            raise HTTPException(status_code=400, detail="Branch is required when creating a Director account")
        branch = db.branches.find_one({"_id": ObjectId(data.branchId)})
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        country = data.country or branch.get("country")
        branch_id = ObjectId(data.branchId)

    elif data.role in ("BRANCH_ADMIN", "ADMIN"):
        if current_user["role"] != "DIRECTOR":
            raise HTTPException(status_code=403, detail="Only Directors can create Branch Admin accounts")
        if not data.branchId:
            raise HTTPException(status_code=400, detail="Branch is required when creating a Branch Admin account")
        branch = db.branches.find_one({"_id": ObjectId(data.branchId)})
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        if branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot assign admin to branch outside your country")
        country = current_user.get("country")
        branch_id = ObjectId(data.branchId)

    elif data.role == "HR":
        if current_user["role"] not in ("CEO", "DIRECTOR"):
            raise HTTPException(status_code=403, detail="Only CEO or Directors can create HR accounts")
        
        if current_user["role"] == "CEO":
            country = data.country or None
            branch_id = ObjectId(data.branchId) if data.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if country and branch.get("country") != country:
                    raise HTTPException(status_code=400, detail="Branch country does not match assigned country")
                if not country:
                    country = branch.get("country")
        else:
            country = current_user.get("country")
            branch_id = ObjectId(data.branchId) if data.branchId else None
            if branch_id:
                branch = db.branches.find_one({"_id": branch_id})
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
                if branch.get("country") != current_user.get("country"):
                    raise HTTPException(status_code=403, detail="Cannot assign HR to branch outside your country")
    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Check coordinator globally first
    if coordinator_db.users.find_one({"email": email_clean}):
        raise HTTPException(status_code=400, detail="Email already registered")

    pwd_hash = hash_password(data.password)
    tenant_id_str = current_user.get("tenant_id")
    tenant_id = ObjectId(tenant_id_str) if tenant_id_str else None

    # Check seats limit
    if tenant_id_str:
        tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id_str)})
        if tenant:
            seats_limit = tenant.get("seatsLimit", 1)
            current_seats = db.users.count_documents({})
            if current_seats >= seats_limit:
                raise HTTPException(
                    status_code=403,
                    detail=f"Upgrade required. Your plan allows up to {seats_limit} team seat(s)."
                )

    # Insert in tenant database
    new_user = {
        "email": email_clean,
        "name": data.name,
        "passwordHash": pwd_hash,
        "rawPassword": data.password,
        "googleId": None,
        "role": data.role,
        "country": country,
        "state": data.state,
        "city": data.city,
        "area": data.area,
        "branchId": branch_id,
        "createdBy": current_user["_id"],
        "emailVerifiedAt": datetime.now(timezone.utc),
        "isActive": True,
        "totpEnabled": False,
        "totpSecret": None,
        "tenant_id": tenant_id,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(new_user)

    # Insert globally in coordinator mapping
    coordinator_db.users.insert_one({
        "email": email_clean,
        "passwordHash": pwd_hash,
        "rawPassword": data.password,
        "role": data.role,
        "tenant_id": tenant_id,
        "db_name": db_context.get().name,
        "googleId": None
    })

    return {"message": "Account created successfully", "userId": str(result.inserted_id)}

# ─── Forgot Password / Reset Password ──────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, _rl=Depends(limiter.limit(3, 60))):
    from utils.email_utils import send_otp_email

    email_clean = req.email.strip().lower()
    user = coordinator_db.users.find_one({"email": email_clean})
    if not user:
        return {"message": "If an account exists, an OTP has been sent."}

    otp = str(random.randint(100000, 999999))

    # Store OTP globally in coordinator
    coordinator_db.passwordResets.update_one(
        {"email": email_clean},
        {
            "$set": {
                "otp": hash_password(otp),
                "createdAt": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

    # Dev backup file
    with open("latest_otp.txt", "w") as f:
        f.write(f"OTP for {email_clean} is: {otp}\n")

    background_tasks.add_task(send_otp_email, email_clean, otp)
    return {"message": "If an account exists, an OTP has been sent."}

@router.post("/verify-reset-otp")
def verify_reset_otp(req: VerifyForgotPasswordOTP, _rl=Depends(limiter.limit(5, 60))):
    email_clean = req.email.strip().lower()
    reset_doc = coordinator_db.passwordResets.find_one({"email": email_clean})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
        
    age = (datetime.now(timezone.utc) - reset_doc["createdAt"].replace(tzinfo=timezone.utc)).total_seconds()
    if age > 900:
        coordinator_db.passwordResets.delete_one({"email": email_clean})
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    if not verify_password(req.otp, reset_doc["otp"]):
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    return {"message": "OTP verified successfully."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, _rl=Depends(limiter.limit(3, 60))):
    email_clean = req.email.strip().lower()
    reset_doc = coordinator_db.passwordResets.find_one({"email": email_clean})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired request.")
        
    age = (datetime.now(timezone.utc) - reset_doc["createdAt"].replace(tzinfo=timezone.utc)).total_seconds()
    if age > 900:
        coordinator_db.passwordResets.delete_one({"email": email_clean})
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    if not verify_password(req.otp, reset_doc["otp"]):
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    coord_user = coordinator_db.users.find_one({"email": email_clean})
    if not coord_user:
        raise HTTPException(status_code=404, detail="User not found.")

    pwd_hash = hash_password(req.newPassword)

    # 1. Update in coordinator
    coordinator_db.users.update_one(
        {"_id": coord_user["_id"]},
        {"$set": {"passwordHash": pwd_hash, "rawPassword": req.newPassword}}
    )
    
    # 2. Update in tenant DB
    db_name = coord_user.get("db_name")
    if db_name:
        token_token = db_context.set(client[db_name])
        try:
            db.users.update_one(
                {"email": email_clean},
                {
                    "$set": {"passwordHash": pwd_hash, "rawPassword": req.newPassword},
                    "$inc": {"tokenVersion": 1}
                }
            )
        finally:
            db_context.reset(token_token)
            
    # Consume OTP
    coordinator_db.passwordResets.delete_one({"email": email_clean})
    return {"message": "Password reset successfully. You can now login."}

# ─── MFA ──────────────────────────────────────────────────────────────────────

@router.post("/mfa")
def verify_mfa(request: Request, response: Response, mfa_data: VerifyMfa, _rl=Depends(limiter.limit(10, 60))):
    user_id_str = request.cookies.get("nexus_mfa_pending")
    email_clean = mfa_data.email.strip().lower()
    
    # Look up coordinator first to find tenant DB
    coord_user = coordinator_db.users.find_one({
        "$or": [
            {"_id": ObjectId(user_id_str)} if user_id_str else {"email": "IMPOSSIBLE_email"},
            {"email": email_clean}
        ]
    })
    
    if not coord_user:
        raise HTTPException(status_code=400, detail="Invalid MFA request")

    db_name = coord_user.get("db_name")
    if not db_name:
        raise HTTPException(status_code=400, detail="Invalid tenant DB setup")

    # Switch context to tenant DB to check TOTP secret
    token_token = db_context.set(client[db_name])
    try:
        if user_id_str:
            user = db.users.find_one({"_id": ObjectId(user_id_str)})
        else:
            user = db.users.find_one({"email": email_clean})

        if not user or not user.get("totpEnabled"):
            raise HTTPException(status_code=400, detail="Invalid MFA request")

        totp = pyotp.TOTP(user["totpSecret"])
        if not totp.verify(mfa_data.code):
            raise HTTPException(status_code=401, detail="Invalid code")

        response.delete_cookie("nexus_mfa_pending")
        user["tenant_id"] = coord_user.get("tenant_id")
        return create_session(user, response)
    finally:
        db_context.reset(token_token)

@router.post("/totp/setup")
def totp_setup(current_user=Depends(get_current_user)):
    secret = generate_totp_secret()
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"totpSecret": secret}})
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=current_user["email"], issuer_name="Nexus CRM")
    return {"secret": secret, "uri": uri}

@router.post("/totp/enable")
def totp_enable(data: VerifyEnableMfa, current_user=Depends(get_current_user)):
    if not current_user.get("totpSecret"):
        raise HTTPException(status_code=400, detail="MFA setup not initiated")
    totp = pyotp.TOTP(current_user["totpSecret"])
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"totpEnabled": True}})
    return {"message": "MFA enabled successfully"}

@router.post("/totp/disable")
def totp_disable(current_user=Depends(get_current_user)):
    db.users.update_one({"_id": current_user["_id"]}, {"$set": {"totpEnabled": False, "totpSecret": None}})
    return {"message": "MFA disabled successfully"}

# ─── Session ──────────────────────────────────────────────────────────────────

@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("nexus_session")
    if token:
        try:
            payload = decode_access_token(token)
            if payload and "sub" in payload:
                # We need to know user's database name to update tokenVersion
                db_name = payload.get("db_name")
                if db_name:
                    token_token = db_context.set(client[db_name])
                    try:
                        db.users.update_one(
                            {"_id": ObjectId(payload["sub"])},
                            {"$inc": {"tokenVersion": 1}}
                        )
                    finally:
                        db_context.reset(token_token)
        except Exception:
            pass
    response.delete_cookie("nexus_session")
    return {"ok": True}

@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    # Look up subscription status in the coordinator database for safety
    subscription_status = "inactive"
    plan_id = "starter"
    seats_limit = 1
    profiles_limit = 100
    
    tenant_id_str = current_user.get("tenant_id")
    if tenant_id_str:
        tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id_str)})
        if tenant:
            subscription_status = tenant.get("subscription_status", "inactive")
            plan_id = tenant.get("planId", "starter")
            seats_limit = tenant.get("seatsLimit", 1)
            profiles_limit = tenant.get("profilesLimit", 100)
            
    # Count usage in tenant database
    current_seats = db.users.count_documents({})
    current_profiles = db.leads.count_documents({})
            
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "country": current_user.get("country"),
        "branchId": str(current_user["branchId"]) if current_user.get("branchId") else None,
        "totpEnabled": current_user.get("totpEnabled", False),
        "isActive": current_user.get("isActive", True),
        "subscriptionStatus": subscription_status,
        "planId": plan_id,
        "limits": {
            "seatsLimit": seats_limit,
            "profilesLimit": profiles_limit
        },
        "usage": {
            "seatsCount": current_seats,
            "profilesCount": current_profiles
        },
        "tenantId": str(tenant_id_str) if tenant_id_str else None
    }


