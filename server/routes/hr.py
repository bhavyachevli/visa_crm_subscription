from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user
from models.schemas import LeaveRequestCreate

router = APIRouter(prefix="/api/hr", tags=["hr"])

@router.post("/attendance/clock-in")
def clock_in(current_user = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = db.attendanceRecords.find_one({"userId": ObjectId(current_user["_id"]), "workDate": today})
    
    if record and record.get("checkInAt"):
        raise HTTPException(status_code=400, detail="Already clocked in today")
        
    if record:
        db.attendanceRecords.update_one({"_id": record["_id"]}, {"$set": {"checkInAt": datetime.now(timezone.utc)}})
    else:
        db.attendanceRecords.insert_one({
            "userId": ObjectId(current_user["_id"]),
            "workDate": today,
            "checkInAt": datetime.now(timezone.utc),
            "checkOutAt": None,
            "approvalStatus": "PENDING",
            "createdAt": datetime.now(timezone.utc)
        })
    return {"message": "Clocked in"}

@router.post("/attendance/clock-out")
def clock_out(current_user = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = db.attendanceRecords.find_one({"userId": ObjectId(current_user["_id"]), "workDate": today})
    
    if not record or not record.get("checkInAt"):
        raise HTTPException(status_code=400, detail="Not clocked in")
        
    db.attendanceRecords.update_one({"_id": record["_id"]}, {"$set": {"checkOutAt": datetime.now(timezone.utc)}})
    return {"message": "Clocked out"}

@router.get("/attendance/me")
def get_my_attendance(current_user = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = db.attendanceRecords.find_one({"userId": ObjectId(current_user["_id"]), "workDate": today})
    if record:
        record["_id"] = str(record["_id"])
        record["userId"] = str(record["userId"])
        if record.get("checkInAt"):
            record["checkInAt"] = record["checkInAt"].replace(tzinfo=timezone.utc).isoformat()
        if record.get("checkOutAt"):
            record["checkOutAt"] = record["checkOutAt"].replace(tzinfo=timezone.utc).isoformat()
        if record.get("createdAt"):
            record["createdAt"] = record["createdAt"].replace(tzinfo=timezone.utc).isoformat()
    return record

@router.post("/leave")
def request_leave(leave: LeaveRequestCreate, current_user = Depends(get_current_user)):
    doc = leave.model_dump()
    doc["userId"] = ObjectId(current_user["_id"])
    doc["status"] = "PENDING"
    doc["createdAt"] = datetime.now(timezone.utc)
    db.leaveRequests.insert_one(doc)
    return {"message": "Leave requested"}

@router.get("/leave/me")
def get_my_leave(current_user = Depends(get_current_user)):
    cursor = db.leaveRequests.find({"userId": ObjectId(current_user["_id"])}).sort("createdAt", -1)
    leaves = []
    for l in cursor:
        l["_id"] = str(l["_id"])
        l["userId"] = str(l["userId"])
        leaves.append(l)
    return leaves

@router.get("/attendance")
def list_attendance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("CEO", "DIRECTOR", "HR"):
        raise HTTPException(status_code=403, detail="Access denied")

    # CEO sees all attendance records
    if current_user["role"] == "CEO":
        query = {}
    elif current_user["role"] == "DIRECTOR":
        # Director sees ONLY non-Director users in their branch
        # (Branch Admins, Admins, HR) — NOT other Directors
        subordinate_roles = ["BRANCH_ADMIN", "ADMIN", "HR"]
        branch_id = current_user.get("branchId")
        if branch_id:
            users_in_branch = [
                u["_id"] for u in db.users.find({
                    "branchId": ObjectId(branch_id),
                    "role": {"$in": subordinate_roles}
                })
            ]
            query = {"userId": {"$in": users_in_branch}}
        elif current_user.get("country"):
            users_in_country = [
                u["_id"] for u in db.users.find({
                    "country": current_user.get("country"),
                    "role": {"$in": subordinate_roles}
                })
            ]
            query = {"userId": {"$in": users_in_country}}
        else:
            query = {"userId": {"$in": []}}
    else:
        # HR role — scoped by branch or country
        if current_user.get("branchId"):
            users_in_branch = [u["_id"] for u in db.users.find({"branchId": current_user["branchId"]})]
            query = {"userId": {"$in": users_in_branch}}
        elif current_user.get("country"):
            users_in_country = [u["_id"] for u in db.users.find({"country": current_user.get("country")})]
            query = {"userId": {"$in": users_in_country}}
        else:
            query = {}

    records = list(db.attendanceRecords.find(query).sort("workDate", -1))

    # Resolve user details
    user_ids = list(set(r["userId"] for r in records))
    users_cursor = db.users.find({"_id": {"$in": user_ids}})
    users_map = {str(u["_id"]): u.get("name", "Unknown") for u in users_cursor}

    for r in records:
        r["_id"] = str(r["_id"])
        r["userId"] = str(r["userId"])
        r["userName"] = users_map.get(r["userId"], "Unknown")
        if r.get("checkInAt"):
            r["checkInAt"] = r["checkInAt"].replace(tzinfo=timezone.utc).isoformat()
        if r.get("checkOutAt"):
            r["checkOutAt"] = r["checkOutAt"].replace(tzinfo=timezone.utc).isoformat()
    return records

@router.get("/leave")
def list_leaves(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("CEO", "DIRECTOR", "HR"):
        raise HTTPException(status_code=403, detail="Access denied")

    # CEO sees ALL leave requests (including Directors)
    if current_user["role"] == "CEO":
        query = {}
    elif current_user["role"] == "DIRECTOR":
        # Director sees ONLY non-Director users in their branch
        # (Branch Admins, Admins, HR) — NOT other Directors
        subordinate_roles = ["BRANCH_ADMIN", "ADMIN", "HR"]
        branch_id = current_user.get("branchId")
        if branch_id:
            users_in_branch = [
                u["_id"] for u in db.users.find({
                    "branchId": ObjectId(branch_id),
                    "role": {"$in": subordinate_roles}
                })
            ]
            query = {"userId": {"$in": users_in_branch}}
        elif current_user.get("country"):
            users_in_country = [
                u["_id"] for u in db.users.find({
                    "country": current_user.get("country"),
                    "role": {"$in": subordinate_roles}
                })
            ]
            query = {"userId": {"$in": users_in_country}}
        else:
            query = {"userId": {"$in": []}}
    else:
        # HR role — scoped by branch or country
        if current_user.get("branchId"):
            users_in_branch = [u["_id"] for u in db.users.find({"branchId": current_user["branchId"]})]
            query = {"userId": {"$in": users_in_branch}}
        elif current_user.get("country"):
            users_in_country = [u["_id"] for u in db.users.find({"country": current_user.get("country")})]
            query = {"userId": {"$in": users_in_country}}
        else:
            query = {}

    leaves = list(db.leaveRequests.find(query).sort("createdAt", -1))

    # Resolve user details
    user_ids = list(set(l["userId"] for l in leaves))
    users_cursor = db.users.find({"_id": {"$in": user_ids}})
    users_map = {str(u["_id"]): {"name": u.get("name", "Unknown"), "role": u.get("role", "")} for u in users_cursor}

    for l in leaves:
        l["_id"] = str(l["_id"])
        l["userId"] = str(l["userId"])
        l["userName"] = users_map.get(l["userId"], {}).get("name", "Unknown")
        l["userRole"] = users_map.get(l["userId"], {}).get("role", "")
    return leaves

@router.patch("/leave/{leave_id}/status")
def update_leave_status(leave_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("CEO", "DIRECTOR", "HR"):
        raise HTTPException(status_code=403, detail="Access denied")

    new_status = payload.get("status")
    if new_status not in ("APPROVED", "REJECTED", "PENDING"):
        raise HTTPException(status_code=400, detail="Invalid status")

    # Fetch leave and the requester
    leave = db.leaveRequests.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    requester = db.users.find_one({"_id": leave["userId"]})
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    requester_role = requester.get("role", "")

    if current_user["role"] == "DIRECTOR":
        # Director can ONLY approve non-Director users in their country
        # Directors cannot approve other Directors' leaves — only CEO can
        if requester_role == "DIRECTOR":
            raise HTTPException(status_code=403, detail="Directors cannot approve another Director's leave. Only CEO can.")
        subordinate_roles = ["BRANCH_ADMIN", "ADMIN", "HR"]
        if requester_role not in subordinate_roles:
            raise HTTPException(status_code=403, detail="You can only approve leaves for Branch Admins, Admins, and HR.")
        branch_id = current_user.get("branchId")
        if branch_id:
            if str(requester.get("branchId")) != str(branch_id):
                raise HTTPException(status_code=403, detail="Cannot update leave for user outside your branch")
        elif requester.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot update leave for user outside your country")

    elif current_user["role"] == "HR":
        # HR cannot approve Director leaves either
        if requester_role == "DIRECTOR":
            raise HTTPException(status_code=403, detail="HR cannot approve a Director's leave.")
        if current_user.get("branchId") and requester.get("branchId") != current_user["branchId"]:
            raise HTTPException(status_code=403, detail="Cannot update leave for user outside your branch")
        elif current_user.get("country") and requester.get("country") != current_user["country"]:
            raise HTTPException(status_code=403, detail="Cannot update leave for user outside your country")

    # CEO has no restrictions — can approve anyone

    result = db.leaveRequests.update_one(
        {"_id": ObjectId(leave_id)},
        {"$set": {"status": new_status, "updatedAt": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": f"Leave status updated to {new_status}"}

@router.patch("/attendance/{record_id}/status")
def update_attendance_status(record_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("CEO", "DIRECTOR", "HR"):
        raise HTTPException(status_code=403, detail="Access denied")

    new_status = payload.get("status")
    if new_status not in ("APPROVED", "REJECTED", "PENDING"):
        raise HTTPException(status_code=400, detail="Invalid status")

    # Fetch attendance record and the employee
    record = db.attendanceRecords.find_one({"_id": ObjectId(record_id)})
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    requester = db.users.find_one({"_id": record["userId"]})
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    requester_role = requester.get("role", "")

    if current_user["role"] == "DIRECTOR":
        # Director can ONLY approve non-Director users in their country
        # Directors cannot approve other Directors' attendance — only CEO can
        if requester_role == "DIRECTOR":
            raise HTTPException(status_code=403, detail="Directors cannot approve another Director's attendance. Only CEO can.")
        subordinate_roles = ["BRANCH_ADMIN", "ADMIN", "HR"]
        if requester_role not in subordinate_roles:
            raise HTTPException(status_code=403, detail="You can only approve attendance for Branch Admins, Admins, and HR.")
        branch_id = current_user.get("branchId")
        if branch_id:
            if str(requester.get("branchId")) != str(branch_id):
                raise HTTPException(status_code=403, detail="Cannot update attendance for user outside your branch")
        elif requester.get("country") != current_user.get("country"):
            raise HTTPException(status_code=403, detail="Cannot update attendance for user outside your country")

    elif current_user["role"] == "HR":
        # HR cannot approve Director attendance either
        if requester_role == "DIRECTOR":
            raise HTTPException(status_code=403, detail="HR cannot approve a Director's attendance.")
        if current_user.get("branchId") and requester.get("branchId") != current_user["branchId"]:
            raise HTTPException(status_code=403, detail="Cannot update attendance for user outside your branch")
        elif current_user.get("country") and requester.get("country") != current_user["country"]:
            raise HTTPException(status_code=403, detail="Cannot update attendance for user outside your country")

    # CEO has no restrictions — can approve anyone

    result = db.attendanceRecords.update_one(
        {"_id": ObjectId(record_id)},
        {"$set": {"approvalStatus": new_status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"message": f"Attendance status updated to {new_status}"}

