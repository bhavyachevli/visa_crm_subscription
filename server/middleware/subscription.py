"""
Subscription verification middleware: Check if the user's organization has an active Stripe subscription.
"""
from fastapi import Depends, HTTPException, status
from middleware.auth import get_current_user
from utils.db import coordinator_db
from bson import ObjectId

def require_active_subscription(current_user=Depends(get_current_user)):
    """
    Checks if the user's organization has an active/trialing subscription in coordinator_db.
    """
    subscription_status = "inactive"
    tenant_id = current_user.get("tenant_id")
    if tenant_id:
        tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id)})
        if tenant:
            subscription_status = tenant.get("subscription_status", "inactive")
            
    if subscription_status not in ("active", "trialing"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active subscription required. Please upgrade your plan."
        )
        
    return current_user

def require_plan_tier(allowed_tiers: list):
    """
    Dependency generator to restrict endpoints to specific plan levels.
    Usage: Depends(require_plan_tier(["growth", "agency"]))
    """
    def dependency(current_user=Depends(get_current_user)):
        tenant_id = current_user.get("tenant_id")
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing tenant context")
            
        tenant = coordinator_db.tenants.find_one({"_id": ObjectId(tenant_id)})
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant organization not found")
            
        if tenant.get("subscription_status") not in ("active", "trialing"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Active subscription required. Please upgrade your plan."
            )
            
        if tenant.get("planId", "starter") not in allowed_tiers:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Restricted feature. Requires one of these plan tiers: {', '.join(allowed_tiers)}."
            )
        return current_user
    return dependency


