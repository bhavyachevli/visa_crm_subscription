from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from utils.db import db
from utils.auth_utils import hash_password
from utils.rate_limiter import limiter  # noqa: F401 — exported for routes to import

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.leads import router as leads_router
from routes.branches import router as branches_router
from routes.cases import router as cases_router
from routes.activities import router as activities_router
from routes.documents import router as documents_router
from routes.finance import router as finance_router
from routes.hr import router as hr_router
from routes.tasks import router as tasks_router
from routes.agreements import router as agreements_router
from routes.dashboard import router as dashboard_router
from routes.immigration import router as immigration_router
from routes.appointments import router as appointments_router

_IS_PRODUCTION = os.environ.get("ENV", "development") == "production"

app = FastAPI(
    title="Pangaea Pathways CRM API",
    docs_url="/docs" if not _IS_PRODUCTION else None,
    redoc_url="/redoc" if not _IS_PRODUCTION else None,
)

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    origins = ["http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(leads_router)
app.include_router(branches_router)
app.include_router(cases_router)
app.include_router(activities_router)
app.include_router(documents_router)
app.include_router(finance_router)
app.include_router(hr_router)
app.include_router(tasks_router)
app.include_router(agreements_router)
app.include_router(dashboard_router)
app.include_router(immigration_router)
app.include_router(appointments_router)


@app.on_event("startup")
def seed_database():
    """Seed branches (with country) and the initial CEO account."""

    # ─── Seed Branches ───────────────────────────────────────────────────────
    branches = [
        {"name": "Australia HQ", "city": "Sydney",     "country": "Australia"},
        {"name": "Melbourne",    "city": "Melbourne",   "country": "Australia"},
        {"name": "Surat",        "city": "Surat",       "country": "India"},
        {"name": "Ahmedabad",    "city": "Ahmedabad",   "country": "India"},
    ]
    for b in branches:
        if not db.branches.find_one({"name": b["name"]}):
            db.branches.insert_one(b)
            print(f"[SUCCESS] Seeded branch: {b['name']} ({b['country']})")
        else:
            # Ensure existing branches have country and city fields
            db.branches.update_one(
                {"name": b["name"]},
                {"$set": {"country": b["country"], "city": b["city"]}}
            )

    # ─── Seed CEO Account ────────────────────────────────────────────────────
    ceo_email = os.environ.get("CEO_EMAIL")
    ceo_password = os.environ.get("CEO_PASSWORD")
    if not ceo_email or not ceo_password:
        raise RuntimeError(
            "CEO_EMAIL and CEO_PASSWORD must be set in environment variables. "
            "Add them to server/.env"
        )

    if not db.users.find_one({"role": "CEO"}):
        from datetime import datetime, timezone
        db.users.insert_one({
            "email": ceo_email,
            "name": "Pangaea CEO",
            "passwordHash": hash_password(ceo_password),
            "googleId": None,
            "role": "CEO",
            "country": None,   # CEO has global access, no country restriction
            "branchId": None,
            "createdBy": None,
            "isActive": True,
            "emailVerifiedAt": datetime.now(timezone.utc),
            "totpEnabled": False,
            "totpSecret": None,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        })
        print(f"[SUCCESS] Seeded CEO account: {ceo_email}")
    else:
        print("[INFO] CEO account already exists")

    # ─── Migrate Legacy Leads Contact & Address Formats ──────────────────────
    try:
        from bson import ObjectId
        print("[MIGRATION] Checking for legacy leads to migrate...")
        cursor = db.leads.find({
            "$or": [
                {"phoneNumbers": {"$exists": False}},
                {"emailAddresses": {"$exists": False}},
                {"addresses": {"$exists": False}}
            ]
        })
        
        count = 0
        for lead in cursor:
            update_doc = {}
            
            # 1. Migrate phone
            if "phoneNumbers" not in lead:
                phone_list = []
                phone_val = lead.get("phone")
                if phone_val:
                    code = "+91"
                    num = phone_val
                    if phone_val.startswith("+"):
                        parts = phone_val.split(" ", 1)
                        if len(parts) == 2:
                            code = parts[0]
                            num = parts[1]
                    phone_list.append({
                        "contactType": lead.get("contactType", "Personal"),
                        "contactCode": code,
                        "contactNumber": num,
                        "isPreferred": True
                    })
                update_doc["phoneNumbers"] = phone_list
                
            # 2. Migrate email
            if "emailAddresses" not in lead:
                email_list = []
                email_val = lead.get("email")
                if email_val:
                    email_list.append({
                        "emailType": lead.get("emailType", "Personal"),
                        "emailAddress": email_val,
                        "isPreferred": True
                    })
                update_doc["emailAddresses"] = email_list
                
            # 3. Migrate addresses
            if "addresses" not in lead:
                addr_list = []
                addr1 = lead.get("addressLine1")
                if addr1 or lead.get("country") or lead.get("city"):
                    addr_list.append({
                        "addressType": lead.get("addressType", "Permanent"),
                        "isDefault": True,
                        "addressLine1": addr1 or "",
                        "addressLine2": lead.get("addressLine2", ""),
                        "country": lead.get("country", ""),
                        "state": lead.get("state", ""),
                        "city": lead.get("city", ""),
                        "zipcode": lead.get("zipcode", "")
                    })
                update_doc["addresses"] = addr_list
                
            if update_doc:
                db.leads.update_one({"_id": lead["_id"]}, {"$set": update_doc})
                count += 1
                
        if count > 0:
            print(f"[MIGRATION SUCCESS] Migrated {count} legacy leads to list formats.")
        else:
            print("[MIGRATION INFO] No legacy leads needed migration.")
    except Exception as ex:
        print(f"[MIGRATION ERROR] Failed to run legacy leads migration: {ex}")

    # ─── Migrate / Assign leadNo to Existing Leads ───────────────────────────
    try:
        print("[MIGRATION] Checking for leads without leadNo...")
        all_leads = list(db.leads.find().sort("createdAt", 1))
        
        # Check if any lead is missing leadNo
        leads_needing_no = [l for l in all_leads if "leadNo" not in l]
        
        if leads_needing_no:
            print(f"[MIGRATION] Found {len(leads_needing_no)} leads without leadNo. Assigning numbers...")
            max_lead = db.leads.find_one(sort=[("leadNo", -1)])
            current_next_no = (max_lead.get("leadNo") or 0) + 1 if max_lead else 1
            
            for i, lead in enumerate(all_leads):
                if "leadNo" in lead:
                    continue
                
                lead_no = current_next_no
                current_next_no += 1
                
                # Extract identifiers for this lead
                emails_to_check = set()
                if lead.get("email"):
                    emails_to_check.add(lead["email"].strip().lower())
                for em in lead.get("emailAddresses", []):
                    val = em.get("emailAddress")
                    if val:
                        emails_to_check.add(val.strip().lower())
                        
                phones_to_check = set()
                if lead.get("phone"):
                    phones_to_check.add(lead["phone"].strip())
                for pn in lead.get("phoneNumbers", []):
                    num = pn.get("contactNumber")
                    if num:
                        phones_to_check.add(num.strip())
                
                # Find matching leads in subsequent list
                matching_ids = [lead["_id"]]
                for other_lead in all_leads[i+1:]:
                    if "leadNo" in other_lead:
                        continue
                    
                    other_emails = set()
                    if other_lead.get("email"):
                        other_emails.add(other_lead["email"].strip().lower())
                    for em in other_lead.get("emailAddresses", []):
                        val = em.get("emailAddress")
                        if val:
                            other_emails.add(val.strip().lower())
                            
                    other_phones = set()
                    if other_lead.get("phone"):
                        other_phones.add(other_lead["phone"].strip())
                    for pn in other_lead.get("phoneNumbers", []):
                        num = pn.get("contactNumber")
                        if num:
                            other_phones.add(num.strip())
                            
                    if (emails_to_check & other_emails) or (phones_to_check & other_phones):
                        matching_ids.append(other_lead["_id"])
                        other_lead["leadNo"] = lead_no
                
                db.leads.update_many(
                    {"_id": {"$in": matching_ids}},
                    {"$set": {"leadNo": lead_no}}
                )
                lead["leadNo"] = lead_no
                
            print("[MIGRATION SUCCESS] Finished assigning leadNo to all existing leads.")
        else:
            print("[MIGRATION INFO] All existing leads already have leadNo assigned.")
    except Exception as ex:
        print(f"[MIGRATION ERROR] Failed to run leadNo migration: {ex}")








from utils.countries import COUNTRIES

@app.get("/api/meta/countries")
def get_countries():
    """Returns a list of all countries with name, code, and dial code."""
    return COUNTRIES


@app.post("/api/meta/states")
def get_states(payload: dict):
    """Fetch states for a country using countriesnow.space API."""
    import requests
    country = payload.get("country")
    if not country:
        return {"states": []}
    try:
        res = requests.post("https://countriesnow.space/api/v0.1/countries/states", json={"country": country}, timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            if not data.get("error"):
                states = [s.get("name") for s in data.get("data", {}).get("states", [])]
                return {"states": sorted(states)}
    except Exception as e:
        print(f"Error fetching states: {e}")
    return {"states": []}


@app.post("/api/meta/cities")
def get_cities(payload: dict):
    """Fetch cities for a state in a country using countriesnow.space API."""
    import requests
    country = payload.get("country")
    state = payload.get("state")
    if not country or not state:
        return {"cities": []}
    try:
        res = requests.post("https://countriesnow.space/api/v0.1/countries/state/cities", json={"country": country, "state": state}, timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            if not data.get("error"):
                cities = data.get("data", [])
                return {"cities": sorted(cities)}
    except Exception as e:
        print(f"Error fetching cities: {e}")
    return {"cities": []}


@app.get("/")
def read_root():
    return {"message": "Welcome to Pangaea Pathways CRM API — RBAC v2.0"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
