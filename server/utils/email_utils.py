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


def send_welcome_email(to_email: str, name: str, company_name: str, trial_ends_at) -> bool:
    """
    Sends a branded HTML welcome email to a new CEO after workspace registration.
    """
    api_key = os.environ.get("BREVO_API_KEY")
    from_email = os.environ.get("SMTP_FROM_EMAIL", "bhavyachevli967@gmail.com")
    from_name = "Nexus CRM"

    if not api_key:
        print("[WARN] BREVO_API_KEY not set — skipping welcome email.")
        return False

    trial_date_str = trial_ends_at.strftime("%d %B %Y") if trial_ends_at else "3 days from now"
    frontend_url = os.environ.get("FRONTEND_URL", "https://nexuscrm-orpin.vercel.app")

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#059669);padding:40px 40px 32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">🚀 Welcome to Nexus CRM!</h1>
            <p style="color:#d1fae5;margin:8px 0 0;font-size:15px;">Your workspace is ready, {name}!</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#94a3b8;font-size:15px;margin:0 0 20px;">Hi <strong style="color:#fff;">{name}</strong>,</p>
            <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">
              Your organization <strong style="color:#10b981;">{company_name}</strong> has been successfully registered on Nexus CRM.
              You now have a <strong style="color:#fff;">3-day free trial</strong> to explore all features!
            </p>
            <!-- Trial Banner -->
            <div style="background:#064e3b;border:1px solid #10b981;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
              <p style="color:#10b981;font-size:13px;font-weight:700;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">⏳ Trial Period</p>
              <p style="color:#d1fae5;font-size:15px;margin:0;">Your free trial expires on <strong>{trial_date_str}</strong>. Subscribe before then to keep full access.</p>
            </div>
            <!-- Features -->
            <p style="color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">What you can do now:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;color:#94a3b8;font-size:14px;">✅ &nbsp;Manage leads and student pipelines</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#94a3b8;font-size:14px;">✅ &nbsp;Create branches, directors, and counselors</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#94a3b8;font-size:14px;">✅ &nbsp;Track attendance and manage HR</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#94a3b8;font-size:14px;">✅ &nbsp;Assign tasks and set appointments</td>
              </tr>
            </table>
            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="{frontend_url}/dashboard" style="background:#10b981;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block;">
                Go to My Dashboard →
              </a>
            </div>
            <p style="color:#475569;font-size:13px;text-align:center;margin:0;">
              Need help? Reply to this email or contact our support team.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
            <p style="color:#334155;font-size:12px;margin:0;">© 2025 Nexus CRM · Built for immigration & visa consultancies</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }
    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email, "name": name}],
        "subject": f"🎉 Welcome to Nexus CRM — {company_name} workspace is ready!",
        "htmlContent": html_body
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 201:
            print(f"[SUCCESS] Welcome email sent to {to_email}")
            return True
        else:
            print(f"[ERROR] Brevo welcome email failed: {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Welcome email failed: {e}")
        return False

