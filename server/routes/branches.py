"""
Branches route — scoped by role:
  CEO → sees all branches globally
  Director → sees branches in their country only
  Branch Admin → sees only their own branch
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone

from utils.db import db
from middleware.auth import get_current_user
from middleware.subscription import require_active_subscription
from models.schemas import BranchCreate

router = APIRouter(prefix="/api/meta/branches", tags=["branches"], dependencies=[Depends(require_active_subscription)])


@router.get("")
def get_branches(current_user=Depends(get_current_user)):
    """Returns branches scoped to the user's role."""
    role = current_user["role"]

    if role == "CEO":
        cursor = db.branches.find().sort("country", 1)
    elif role == "DIRECTOR":
        branch_id = current_user.get("branchId")
        if branch_id:
            try:
                cursor = db.branches.find({"_id": ObjectId(branch_id)})
            except Exception:
                cursor = db.branches.find({"_id": branch_id})
        else:
            cursor = db.branches.find({"country": current_user.get("country")}).sort("name", 1)
    elif role == "HR":
        branch_id = current_user.get("branchId")
        if branch_id:
            try:
                cursor = db.branches.find({"_id": ObjectId(branch_id)})
            except Exception:
                cursor = db.branches.find({"_id": branch_id})
        elif current_user.get("country"):
            cursor = db.branches.find({"country": current_user.get("country")}).sort("name", 1)
        else:
            cursor = db.branches.find().sort("country", 1)
    elif role == "BRANCH_ADMIN":
        branch_id = current_user.get("branchId")
        if branch_id:
            try:
                cursor = db.branches.find({"_id": ObjectId(branch_id)})
            except Exception:
                cursor = db.branches.find({"_id": branch_id})
        else:
            return []
    else:
        cursor = db.branches.find()

    branches = []
    for b in cursor:
        b["_id"] = str(b["_id"])
        if b.get("createdBy"):
            b["createdBy"] = str(b["createdBy"])
        branches.append(b)
    return branches


@router.post("")
def create_branch(branch: BranchCreate, current_user=Depends(get_current_user)):
    """
    CEO → can create branch in any country
    Director → can only create branch in their own country
    Branch Admin → no access
    """
    if current_user["role"] == "BRANCH_ADMIN":
        raise HTTPException(status_code=403, detail="Branch Admins cannot create branches")

    if not branch.country:
        raise HTTPException(status_code=400, detail="Country is required when creating a branch")

    # Directors can only create branches in their own country
    if current_user["role"] == "DIRECTOR":
        if branch.country != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Directors can only create branches in their own country")

    doc = branch.model_dump()
    doc["createdAt"] = datetime.now(timezone.utc)
    doc["createdBy"] = current_user["_id"]

    result = db.branches.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Branch created successfully"}


@router.get("/{branch_id}")
def get_branch(branch_id: str, current_user=Depends(get_current_user)):
    branch = db.branches.find_one({"_id": ObjectId(branch_id)})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    branch["_id"] = str(branch["_id"])
    if branch.get("createdBy"):
        branch["createdBy"] = str(branch["createdBy"])
    return branch


@router.delete("/{branch_id}")
def delete_branch(branch_id: str, current_user=Depends(get_current_user)):
    """
    CEO → can delete any branch
    Director → can only delete branches in their own country
    Branch Admin → no access
    """
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Branch Admins cannot delete branches")

    try:
        oid = ObjectId(branch_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid branch ID")

    branch = db.branches.find_one({"_id": oid})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Directors can only delete branches in their own country
    if current_user["role"] == "DIRECTOR":
        if branch.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Directors can only delete branches in their own country")

    # Safety check: do not delete if users are assigned to this branch
    assigned_users = db.users.count_documents({"branchId": oid})
    if assigned_users > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete branch — {assigned_users} user(s) are still assigned to it. Reassign them first."
        )

    db.branches.delete_one({"_id": oid})
    return {"message": "Branch deleted successfully"}
