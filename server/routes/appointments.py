"""
Appointments route — RBAC scoped:
  CEO          → all appointments globally
  DIRECTOR     → appointments of users in their country
  BRANCH_ADMIN/ADMIN → appointments in their branch
  HR           → appointments scoped by country/branch
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone

from utils.db import db
from middleware.auth import get_current_user
from models.schemas import AppointmentCreate, AppointmentUpdate

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

VALID_STATUSES = ("SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW")
VALID_TYPES = ("IN_PERSON", "VIDEO_CALL", "PHONE")


def _serialize(appt: dict) -> dict:
    appt["_id"] = str(appt["_id"])
    if appt.get("createdBy"):
        appt["createdBy"] = str(appt["createdBy"])
    if appt.get("assigneeId"):
        appt["assigneeId"] = str(appt["assigneeId"])
    if appt.get("leadId"):
        appt["leadId"] = str(appt["leadId"])
    if appt.get("createdAt"):
        appt["createdAt"] = appt["createdAt"].replace(tzinfo=timezone.utc).isoformat()
    if appt.get("updatedAt"):
        appt["updatedAt"] = appt["updatedAt"].replace(tzinfo=timezone.utc).isoformat()
    return appt


def _get_scoped_user_ids(current_user: dict):
    """Return list of user ObjectIds visible to current_user. None means all."""
    role = current_user["role"]
    if role == "CEO":
        return None  # no filter
    elif role == "DIRECTOR":
        branch_id = current_user.get("branchId")
        if branch_id:
            users = db.users.find({"branchId": branch_id})
            return [u["_id"] for u in users]
        else:
            users = db.users.find({
                "country": current_user.get("country"),
            })
            return [u["_id"] for u in users]
    elif role in ("BRANCH_ADMIN", "ADMIN"):
        branch_id = current_user.get("branchId")
        if branch_id:
            users = db.users.find({"branchId": branch_id})
            return [u["_id"] for u in users]
        return [current_user["_id"]]
    elif role == "HR":
        if current_user.get("branchId"):
            users = db.users.find({"branchId": current_user["branchId"]})
            return [u["_id"] for u in users]
        elif current_user.get("country"):
            users = db.users.find({"country": current_user["country"]})
            return [u["_id"] for u in users]
        return None
    return [current_user["_id"]]


@router.post("")
def create_appointment(appt: AppointmentCreate, current_user=Depends(get_current_user)):
    if appt.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(VALID_TYPES)}")

    doc = appt.model_dump()
    doc["status"] = "SCHEDULED"
    doc["createdBy"] = current_user["_id"]

    # assigneeId defaults to creator
    if appt.assigneeId:
        doc["assigneeId"] = ObjectId(appt.assigneeId)
    else:
        doc["assigneeId"] = current_user["_id"]

    if appt.leadId:
        lead = db.leads.find_one({"_id": ObjectId(appt.leadId)})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        doc["leadId"] = ObjectId(appt.leadId)
        doc["leadName"] = lead.get("fullName", "Unknown")
    else:
        doc["leadId"] = None
        doc["leadName"] = None

    doc["createdAt"] = datetime.now(timezone.utc)
    doc["updatedAt"] = datetime.now(timezone.utc)

    result = db.appointments.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Appointment created"}


@router.get("/me")
def get_my_appointments(current_user=Depends(get_current_user)):
    """Returns appointments assigned to the current user."""
    cursor = db.appointments.find(
        {"assigneeId": current_user["_id"]}
    ).sort([("appointmentDate", 1), ("appointmentTime", 1)])

    appts = []
    for a in cursor:
        a = _serialize(a)
        # Resolve assignee name
        if a.get("assigneeId"):
            u = db.users.find_one({"_id": ObjectId(a["assigneeId"])})
            a["assigneeName"] = u.get("name", "Unknown") if u else "Unknown"
        appts.append(a)
    return appts


@router.get("")
def list_appointments(current_user=Depends(get_current_user)):
    """Returns role-scoped list of all appointments."""
    scoped_ids = _get_scoped_user_ids(current_user)

    if scoped_ids is None:
        query = {}
    else:
        query = {"assigneeId": {"$in": scoped_ids}}

    cursor = db.appointments.find(query).sort(
        [("appointmentDate", 1), ("appointmentTime", 1)]
    )

    # Build assignee name map
    appts = list(cursor)
    assignee_ids = list(set(a["assigneeId"] for a in appts if a.get("assigneeId")))
    users_map = {
        str(u["_id"]): u.get("name", "Unknown")
        for u in db.users.find({"_id": {"$in": assignee_ids}})
    }

    result = []
    for a in appts:
        a = _serialize(a)
        a["assigneeName"] = users_map.get(a.get("assigneeId", ""), "Unknown")
        result.append(a)
    return result


@router.patch("/{appt_id}")
def update_appointment(appt_id: str, data: AppointmentUpdate, current_user=Depends(get_current_user)):
    appt = db.appointments.find_one({"_id": ObjectId(appt_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Only creator or CEO/Director can edit
    is_creator = str(appt.get("createdBy")) == str(current_user["_id"])
    is_manager = current_user["role"] in ("CEO", "DIRECTOR")
    if not is_creator and not is_manager:
        raise HTTPException(status_code=403, detail="You can only edit your own appointments")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}

    if "status" in updates and updates["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be: {', '.join(VALID_STATUSES)}")

    if "type" in updates and updates["type"] not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be: {', '.join(VALID_TYPES)}")

    if "leadId" in updates and updates["leadId"]:
        lead = db.leads.find_one({"_id": ObjectId(updates["leadId"])})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        updates["leadId"] = ObjectId(updates["leadId"])
        updates["leadName"] = lead.get("fullName", "Unknown")

    if "assigneeId" in updates and updates["assigneeId"]:
        updates["assigneeId"] = ObjectId(updates["assigneeId"])

    updates["updatedAt"] = datetime.now(timezone.utc)
    db.appointments.update_one({"_id": ObjectId(appt_id)}, {"$set": updates})
    return {"message": "Appointment updated"}


@router.delete("/{appt_id}")
def delete_appointment(appt_id: str, current_user=Depends(get_current_user)):
    appt = db.appointments.find_one({"_id": ObjectId(appt_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user["role"] != "CEO":
        raise HTTPException(status_code=403, detail="Only CEO can delete appointments")

    db.appointments.delete_one({"_id": ObjectId(appt_id)})
    return {"message": "Appointment deleted"}
