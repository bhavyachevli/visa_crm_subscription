import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from middleware.auth import get_current_user
from utils.db import coordinator_db
from bson import ObjectId

router = APIRouter(prefix="/api/billing", tags=["billing"])

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "sk_test_mock")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_mock")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Initialize stripe
if STRIPE_SECRET_KEY != "sk_test_mock":
    stripe.api_key = STRIPE_SECRET_KEY

class CheckoutRequest(BaseModel):
    planId: str # "starter", "growth", "agency"
    billingCycle: str = "monthly" # "monthly", "yearly"

@router.post("/checkout")
async def create_checkout_session(req: CheckoutRequest, current_user=Depends(get_current_user)):
    """
    Creates a Stripe checkout session or a mock checkout session if running without keys.
    """
    tenant_id = current_user.get("tenantId") or current_user.get("tenant_id")
    if not tenant_id:
         raise HTTPException(status_code=400, detail="User tenant context is missing")
         
    tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
         raise HTTPException(status_code=404, detail="Tenant organization not found")

    email = current_user["email"]
    plan_id = req.planId.strip().lower()
    cycle = req.billingCycle.strip().lower()

    if plan_id not in ("starter", "growth", "agency"):
         raise HTTPException(status_code=400, detail="Invalid plan tier selected")
    if cycle not in ("monthly", "yearly"):
         cycle = "monthly"

    # Prices in INR (paise)
    prices = {
         "starter": {"monthly": 1, "yearly": 1},
         "growth": {"monthly": 1, "yearly": 1},
         "agency": {"monthly": 1, "yearly": 1}
    }
    amount = prices[plan_id][cycle]
    amount_paise = amount * 100

    if STRIPE_SECRET_KEY == "sk_test_mock":
        # Mock checkout session URL that immediately redirects back to our billing screen with mock flags
        mock_checkout_url = f"{FRONTEND_URL}/billing?mock_checkout_success=true&tenant_id={tenant_id}&plan_id={plan_id}&cycle={cycle}"
        return {
            "message": "Mock checkout session created successfully",
            "url": mock_checkout_url
        }

    try:
        # Real Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card', 'upi'],
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f"Nexus CRM {plan_id.capitalize()} Plan ({cycle.capitalize()})",
                    },
                    'unit_amount': amount_paise,
                    'recurring': {
                        'interval': 'month' if cycle == 'monthly' else 'year',
                    },
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{FRONTEND_URL}/dashboard?checkout=success",
            cancel_url=f"{FRONTEND_URL}/billing?checkout=cancel",
            customer_email=email,
            metadata={
                "tenant_id": str(tenant_id),
                "plan_id": plan_id,
                "cycle": cycle
            }
        )
        return {"url": session.url}
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

@router.post("/portal")
async def create_portal_session(current_user=Depends(get_current_user)):
    """
    Creates a Stripe Customer Portal session or a mock portal if running without keys.
    """
    tenant_id = current_user.get("tenantId") or current_user.get("tenant_id")
    if not tenant_id:
         raise HTTPException(status_code=400, detail="User tenant context is missing")
         
    tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
         raise HTTPException(status_code=404, detail="Tenant organization not found")

    customer_id = tenant.get("stripe_customer_id")

    if STRIPE_SECRET_KEY == "sk_test_mock" or not customer_id:
        # Mock customer portal URL
        mock_portal_url = f"{FRONTEND_URL}/billing?mock_portal=true&tenant_id={tenant_id}"
        return {
            "message": "Mock portal session created successfully",
            "url": mock_portal_url
        }

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{FRONTEND_URL}/billing"
        )
        return {"url": session.url}
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Stripe Webhook handler to listen to subscription activation and deletion.
    """
    payload = await request.body()

    if STRIPE_SECRET_KEY == "sk_test_mock":
         raise HTTPException(status_code=400, detail="Webhook signature verification failed in mock mode")

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook signature verification failed: {str(e)}")

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    # Extract metadata
    metadata = data_object.get("metadata", {})
    tenant_id_str = metadata.get("tenant_id")
    customer_id = data_object.get("customer")
    subscription_id = data_object.get("id")

    plan_id = metadata.get("plan_id", "starter")
    seats_limit = 1
    profiles_limit = 100
    if plan_id == "growth":
         seats_limit = 5
         profiles_limit = 500
    elif plan_id == "agency":
         seats_limit = 999999
         profiles_limit = 999999

    if not tenant_id_str:
         customer_email = data_object.get("customer_email") or data_object.get("email")
         if customer_email:
              tenant = coordinator_db.tenants.find_one({"owner_email": customer_email})
              if tenant:
                   tenant_id_str = str(tenant["_id"])

    if not tenant_id_str:
         return {"status": "ignored", "reason": "No tenant_id associated"}

    tenant_id = ObjectId(tenant_id_str)

    if event_type == "checkout.session.completed":
        # Subscription created
        coordinator_db.tenants.update_one(
            {"_id": tenant_id},
            {"$set": {
                "subscription_status": "active",
                "planId": plan_id,
                "seatsLimit": seats_limit,
                "profilesLimit": profiles_limit,
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id
            }}
        )
        return {"status": "success", "message": f"Tenant {tenant_id_str} plan {plan_id} subscription activated"}

    elif event_type in ("invoice.payment_succeeded", "customer.subscription.updated"):
        coordinator_db.tenants.update_one(
            {"_id": tenant_id},
            {"$set": {
                "subscription_status": "active"
            }}
        )
        return {"status": "success", "message": f"Tenant {tenant_id_str} subscription renewed"}

    elif event_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        coordinator_db.tenants.update_one(
            {"_id": tenant_id},
            {"$set": {
                "subscription_status": "inactive"
            }}
        )
        return {"status": "success", "message": f"Tenant {tenant_id_str} subscription deactivated"}

    return {"status": "ignored", "event": event_type}


# Helper route to simulate Stripe webhook payment activation locally
@router.post("/mock-activate")
async def mock_activate_subscription(payload: dict):
    """
    Utility endpoint only available in Test/Mock Mode to simulate Stripe payment webhook.
    """
    if STRIPE_SECRET_KEY != "sk_test_mock":
         raise HTTPException(status_code=403, detail="Not allowed outside Test/Mock mode")

    tenant_id_str = payload.get("tenant_id")
    action = payload.get("action", "activate") # activate / deactivate
    plan_id = payload.get("plan_id", "growth").strip().lower()

    if plan_id not in ("starter", "growth", "agency"):
         plan_id = "growth"

    seats_limit = 1
    profiles_limit = 100
    if plan_id == "growth":
         seats_limit = 5
         profiles_limit = 500
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
             "stripe_customer_id": f"cus_mock_{tenant_id_str}",
             "stripe_subscription_id": f"sub_mock_{tenant_id_str}"
          }}
    )
    
    if result.matched_count == 0:
         raise HTTPException(status_code=404, detail="Tenant not found")
         
    return {"success": True, "message": f"Tenant subscription updated to {status} (Plan: {plan_id})"}
