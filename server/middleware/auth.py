"""
Auth middleware: decode session cookie and get current user.
Also provides role-checking dependency helpers.
"""
from fastapi import Request, HTTPException, status, Depends
from utils.auth_utils import decode_access_token
from utils.db import db
from bson import ObjectId


def get_current_user(request: Request):
    """Decode JWT session cookie and return the full user document."""
    token = request.cookies.get("pangaea_session")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Check token version for revocation
    token_version = payload.get("tokenVersion", 1)
    user_token_version = user.get("tokenVersion", 1)
    if token_version != user_token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked/logged out")

    if not user.get("isActive", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return user


# ─── Role-Checking Dependencies ───────────────────────────────────────────────

def require_ceo(current_user=Depends(get_current_user)):
    """Only CEO can access this endpoint."""
    if current_user["role"] != "CEO":
        raise HTTPException(status_code=403, detail="CEO access required")
    return current_user


def require_ceo_or_director(current_user=Depends(get_current_user)):
    """CEO or Director can access this endpoint."""
    if current_user["role"] not in ("CEO", "DIRECTOR"):
        raise HTTPException(status_code=403, detail="Director or CEO access required")
    return current_user


def require_lead_edit_permission(current_user=Depends(get_current_user)):
    """Branch Admins cannot edit leads."""
    if current_user["role"] == "BRANCH_ADMIN":
        raise HTTPException(status_code=403, detail="Branch Admins do not have permission to edit leads")
    return current_user


# ─── Scoping Helpers (used in route handlers) ─────────────────────────────────

def get_lead_scope_query(current_user: dict) -> dict:
    """
    Returns an empty dict so all users can see all leads.
    """
    return {}
