"""
WhatsApp Business API Webhook
Receives incoming messages from WhatsApp and auto-creates leads in the tenant database.

Setup:
1. Create a Meta Business account at https://business.facebook.com
2. Add a WhatsApp Business app in Meta Developer Console
3. Configure the webhook URL to: https://your-render-backend.com/api/whatsapp/webhook
4. Set WHATSAPP_VERIFY_TOKEN in Render environment variables
5. Set WHATSAPP_ACCESS_TOKEN in Render environment variables

Free tier: 1,000 conversations/month
"""
import os
import json
import hmac
import hashlib
import requests
from fastapi import APIRouter, Request, Response, HTTPException
from datetime import datetime, timezone
from utils.db import coordinator_db, client as mongo_client

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "nexus_whatsapp_token")
ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
APP_SECRET   = os.environ.get("WHATSAPP_APP_SECRET", "")

# ─── Webhook Verification (GET) ──────────────────────────────────────────────

@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Meta calls this endpoint to verify your webhook URL.
    It sends hub.mode, hub.verify_token, hub.challenge.
    We must respond with hub.challenge if the token matches.
    """
    params = dict(request.query_params)
    mode      = params.get("hub.mode")
    token     = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        print(f"[WhatsApp] Webhook verified successfully.")
        return Response(content=challenge, media_type="text/plain")

    raise HTTPException(status_code=403, detail="Verification token mismatch")


# ─── Incoming Message Handler (POST) ─────────────────────────────────────────

@router.post("/webhook")
async def receive_message(request: Request):
    """
    Receives incoming WhatsApp messages and auto-creates leads.
    Meta sends a JSON payload with message details.
    """
    body = await request.body()

    # Verify signature if APP_SECRET is configured
    if APP_SECRET:
        signature = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(
            APP_SECRET.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        data = json.loads(body)
    except Exception:
        return {"status": "ok"}

    # Navigate WhatsApp payload structure
    try:
        entry = data.get("entry", [])
        if not entry:
            return {"status": "ok"}

        changes = entry[0].get("changes", [])
        if not changes:
            return {"status": "ok"}

        value = changes[0].get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return {"status": "ok"}

        msg = messages[0]
        from_number = msg.get("from", "")  # WhatsApp number e.g. "919876543210"
        msg_type    = msg.get("type", "")
        timestamp   = msg.get("timestamp", "")

        # Extract text content
        text = ""
        if msg_type == "text":
            text = msg.get("text", {}).get("body", "")
        elif msg_type == "interactive":
            text = msg.get("interactive", {}).get("button_reply", {}).get("title", "")

        if not from_number or not text:
            return {"status": "ok"}

        print(f"[WhatsApp] Message from +{from_number}: {text[:100]}")

        # Parse enquiry intent from message
        lead_data = _parse_lead_from_message(from_number, text)

        # Auto-create lead in the default (main) tenant database
        _create_whatsapp_lead(lead_data, from_number)

        # Send auto-reply back to the user
        _send_whatsapp_reply(from_number)

    except Exception as e:
        print(f"[WhatsApp] Error processing message: {e}")

    return {"status": "ok"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_lead_from_message(phone: str, text: str) -> dict:
    """
    Parse basic lead info from the WhatsApp message text.
    In a real integration you'd use an NLP model or conversation flow.
    """
    text_lower = text.lower()

    # Try to detect visa type from keywords
    visa_type = "General Enquiry"
    if any(k in text_lower for k in ["canada", "pr", "express entry"]):
        visa_type = "Canada PR"
    elif any(k in text_lower for k in ["uk", "united kingdom", "tier"]):
        visa_type = "UK Visa"
    elif any(k in text_lower for k in ["australia", "aus"]):
        visa_type = "Australia PR"
    elif any(k in text_lower for k in ["student", "study", "university", "college"]):
        visa_type = "Student Visa"
    elif any(k in text_lower for k in ["usa", "us", "america", "h1b", "f1"]):
        visa_type = "USA Visa"

    return {
        "name": f"WhatsApp Lead (+{phone})",
        "phone": f"+{phone}",
        "email": "",
        "source": "WhatsApp",
        "visa_type": visa_type,
        "message": text[:500],
        "status": "New",
        "priority": "Medium",
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "notes": [
            {
                "text": f"Auto-captured from WhatsApp: {text[:300]}",
                "createdAt": datetime.now(timezone.utc)
            }
        ]
    }


def _create_whatsapp_lead(lead_data: dict, phone: str):
    """
    Insert a lead into the first/default active tenant database.
    In a multi-tenant setup, you'd match the phone to a tenant by their WhatsApp number.
    """
    # Find the most recently created active tenant
    tenant = coordinator_db.tenants.find_one(
        {"subscription_status": {"$in": ["active", "trialing"]}},
        sort=[("createdAt", -1)]
    )

    if not tenant:
        print("[WhatsApp] No active tenant found to create lead in.")
        return

    db_name = tenant.get("db_name")
    if not db_name:
        return

    tenant_db = mongo_client[db_name]

    # Check for duplicate (same phone in last 24 hours)
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    existing = tenant_db.leads.find_one({
        "phone": lead_data["phone"],
        "createdAt": {"$gte": cutoff}
    })
    if existing:
        print(f"[WhatsApp] Duplicate lead for {phone} — skipping.")
        return

    result = tenant_db.leads.insert_one(lead_data)
    print(f"[WhatsApp] ✅ Lead created: {result.inserted_id} in {db_name}")


def _send_whatsapp_reply(to_number: str):
    """
    Send an automated WhatsApp reply back to the user.
    Requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars.
    """
    access_token  = ACCESS_TOKEN
    phone_id      = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")

    if not access_token or not phone_id:
        print("[WhatsApp] ACCESS_TOKEN or PHONE_NUMBER_ID not set — skipping auto-reply.")
        return

    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {
            "body": (
                "👋 Thank you for contacting us!\n\n"
                "We have received your enquiry and one of our counselors will "
                "get back to you within 24 hours.\n\n"
                "🌐 Learn more: https://nexuscrm-orpin.vercel.app\n\n"
                "— Nexus CRM Team"
            )
        }
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            print(f"[WhatsApp] ✅ Auto-reply sent to +{to_number}")
        else:
            print(f"[WhatsApp] Reply failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"[WhatsApp] Reply error: {e}")


# ─── Status endpoint ─────────────────────────────────────────────────────────

@router.get("/status")
async def whatsapp_status():
    """Returns configuration status for WhatsApp integration."""
    return {
        "configured": bool(ACCESS_TOKEN and VERIFY_TOKEN),
        "verify_token_set": bool(VERIFY_TOKEN),
        "access_token_set": bool(ACCESS_TOKEN),
        "app_secret_set": bool(APP_SECRET),
        "phone_number_id_set": bool(os.environ.get("WHATSAPP_PHONE_NUMBER_ID")),
        "webhook_url": "POST /api/whatsapp/webhook",
        "verify_url": "GET /api/whatsapp/webhook"
    }
