import os
import requests

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends an OTP email via Brevo's HTTP API (more reliable than SMTP).
    Requires BREVO_API_KEY environment variable.
    """
    api_key = os.environ.get("BREVO_API_KEY")
    from_email = os.environ.get("SMTP_FROM_EMAIL", "bhavyachevli967@gmail.com")
    from_name = "Nexus CRM"

    print(f"[BREVO API] Sending OTP to {to_email} from {from_email}")
    print(f"[BREVO API] API Key: {'SET' if api_key else 'NOT SET - add BREVO_API_KEY to Render!'}")

    if not api_key:
        print("[ERROR] BREVO_API_KEY not set. Cannot send email.")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }

    body_text = f"""Hello,

You requested a password reset for your Nexus CRM account.

Your OTP code is: {otp}

This code is valid for 15 minutes. If you did not request this, please ignore this email.

Best regards,
Nexus CRM Team"""

    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email}],
        "subject": "Nexus CRM - Password Reset OTP",
        "textContent": body_text
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        print(f"[BREVO API] Response: {response.status_code} - {response.text}")

        if response.status_code == 201:
            print(f"[SUCCESS] OTP email sent to {to_email} via Brevo API.")
            return True
        else:
            print(f"[ERROR] Brevo API returned {response.status_code}: {response.text}")
            return False

    except Exception as e:
        print(f"[ERROR] Brevo API request failed: {type(e).__name__}: {e}")
        return False
