"""
Google OAuth ID Token Verification Utility.
Uses google-auth library to verify tokens server-side (secure).
"""
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

def verify_google_token(credential: str) -> dict:
    """
    Verifies a Google ID token and returns the decoded payload.
    Returns dict with: sub (googleId), email, name, picture
    Raises ValueError if token is invalid.
    """
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    
    if not GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID is not configured in environment variables.")
    
    try:
        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10
        )
        
        # Ensure the token was issued for our app
        if id_info.get("aud") != GOOGLE_CLIENT_ID:
            raise ValueError("Token audience mismatch.")
        
        return {
            "googleId": id_info["sub"],
            "email": id_info["email"],
            "name": id_info.get("name", ""),
            "picture": id_info.get("picture", ""),
            "emailVerified": id_info.get("email_verified", False),
        }
    except Exception as e:
        raise ValueError(f"Invalid Google token: {str(e)}")
