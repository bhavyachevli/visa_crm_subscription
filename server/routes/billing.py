import os
import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from middleware.auth import get_current_user
from utils.db import coordinator_db
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/billing", tags=["billing"])

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_mock")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "mock_secret")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Initialize Razorpay Client
if RAZORPAY_KEY_ID != "rzp_test_mock":
    try:
        rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as e:
        print(f"Error initializing Razorpay Client: {e}")
        rzp_client = None
else:
    rzp_client = None

class CheckoutRequest(BaseModel):
    planId: str = "starter" # "starter", "growth", "agency"
    billingCycle: str = "monthly" # "monthly", "yearly"

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    planId: str
    billingCycle: str

@router.post("/checkout")
async def create_checkout_session(req: CheckoutRequest, current_user=Depends(get_current_user)):
    """
    Creates a Razorpay Order or returns a mock order if running in dev mode.
    """
    tenant_id = current_user.get("tenantId") or current_user.get("tenant_id")
    if not tenant_id:
         raise HTTPException(status_code=400, detail="User tenant context is missing")
         
    tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
         raise HTTPException(status_code=404, detail="Tenant organization not found")

    plan_id = req.planId.strip().lower()
    cycle = req.billingCycle.strip().lower()

    if plan_id not in ("starter", "growth", "agency"):
         raise HTTPException(status_code=400, detail="Invalid plan tier selected")
    if cycle not in ("monthly", "yearly"):
         cycle = "monthly"

    # Prices in INR
    prices = {
         "starter": {"monthly": 3000, "yearly": 29999},
         "growth": {"monthly": 5000, "yearly": 49999},
         "agency": {"monthly": 10000, "yearly": 99999}
    }
    amount = prices[plan_id][cycle]
    amount_paise = amount * 100

    if RAZORPAY_KEY_ID == "rzp_test_mock" or rzp_client is None:
        # Mock Razorpay Order ID for sandbox testing
        mock_order_id = f"order_mock_{ObjectId()}"
        return {
            "order_id": mock_order_id,
            "amount": amount_paise,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID,
            "company_name": tenant.get("company_name", "Nexus CRM"),
            "plan_id": plan_id,
            "cycle": cycle,
            "is_mock": True
        }

    try:
        # Create a real Razorpay Order
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt_{tenant_id}",
            "notes": {
                "tenant_id": str(tenant_id),
                "plan_id": plan_id,
                "cycle": cycle
            }
        }
        order = rzp_client.order.create(data=order_data)
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
            "company_name": tenant.get("company_name", "Nexus CRM"),
            "plan_id": plan_id,
            "cycle": cycle,
            "is_mock": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {str(e)}")

@router.post("/verify-payment")
async def verify_payment(req: PaymentVerifyRequest, current_user=Depends(get_current_user)):
    """
    Verifies Razorpay payment signature and activates the organization plan limits.
    """
    tenant_id = current_user.get("tenantId") or current_user.get("tenant_id")
    if not tenant_id:
         raise HTTPException(status_code=400, detail="User tenant context is missing")

    # 1. Signature Verification
    if RAZORPAY_KEY_ID == "rzp_test_mock" or rzp_client is None:
        # Sandbox verification succeeds instantly
        pass
    else:
        try:
            params_dict = {
                'razorpay_order_id': req.razorpay_order_id,
                'razorpay_payment_id': req.razorpay_payment_id,
                'razorpay_signature': req.razorpay_signature
            }
            rzp_client.utility.verify_payment_signature(params_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Payment signature verification failed: {str(e)}")

    # 2. Map resource limits
    plan_id = req.planId.strip().lower()
    seats_limit = 5
    profiles_limit = 100
    if plan_id == "growth":
         seats_limit = 15
         profiles_limit = 450
    elif plan_id == "agency":
         seats_limit = 999999
         profiles_limit = 999999

    # 3. Update database
    coordinator_db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": {
            "subscription_status": "active",
            "planId": plan_id,
            "seatsLimit": seats_limit,
            "profilesLimit": profiles_limit,
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "updatedAt": datetime.now(timezone.utc)
        }}
    )

    return {"success": True, "message": "Payment verified and plan activated successfully"}

@router.post("/portal")
async def create_portal_session(current_user=Depends(get_current_user)):
    """
    Dummy/No-op redirect back to Billing screen for billing adjustments.
    """
    return {"url": f"{FRONTEND_URL}/billing?message=portal_unavailable"}

@router.post("/mock-activate")
async def mock_activate_subscription(payload: dict):
    """
    Utility endpoint to manually activate a tenant's subscription.
    """
    tenant_id_str = payload.get("tenant_id")
    action = payload.get("action", "activate")
    plan_id = payload.get("plan_id", "growth").strip().lower()

    if plan_id not in ("starter", "growth", "agency"):
         plan_id = "growth"

    seats_limit = 5
    profiles_limit = 100
    if plan_id == "growth":
         seats_limit = 15
         profiles_limit = 450
    elif plan_id == "agency":
         seats_limit = 999999
         profiles_limit = 999999
         
    if not tenant_id_str:
         raise HTTPException(status_code=400, detail="tenant_id is required")

    status = "active" if action == "activate" else "inactive"
    
    result = coordinator_db.tenants.update_one(
         {"_id": ObjectId(tenant_id_str)},
         {"$set": {
             "subscription_status": status,
             "planId": plan_id,
             "seatsLimit": seats_limit,
             "profilesLimit": profiles_limit,
             "razorpay_order_id": f"order_manual_{tenant_id_str}",
             "razorpay_payment_id": f"pay_manual_{tenant_id_str}"
          }}
    )
    
    if result.matched_count == 0:
         raise HTTPException(status_code=404, detail="Tenant not found")
         
    return {"success": True, "message": f"Tenant subscription updated to {status} (Plan: {plan_id})"}
