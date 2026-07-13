from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user
from models.schemas import TaskCreate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.post("")
def create_task(task: TaskCreate, current_user = Depends(get_current_user)):
    task_dict = task.model_dump()
    task_dict["assigneeId"] = ObjectId(task.assigneeId)
    if task.leadId:
        task_dict["leadId"] = ObjectId(task.leadId)
    if task.caseId:
        task_dict["caseId"] = ObjectId(task.caseId)
        
    task_dict["createdAt"] = datetime.now(timezone.utc)
    task_dict["completedAt"] = None
    
    result = db.tasks.insert_one(task_dict)
    return {"id": str(result.inserted_id)}

@router.get("/me")
def get_my_tasks(current_user = Depends(get_current_user)):
    cursor = db.tasks.find({"assigneeId": ObjectId(current_user["_id"])}).sort("createdAt", -1)
    tasks = []
    raw_tasks = list(cursor)
    
    lead_ids = [t["leadId"] for t in raw_tasks if t.get("leadId")]
    case_ids = [t["caseId"] for t in raw_tasks if t.get("caseId")]
    
    leads_map = {str(l["_id"]): l.get("fullName", "Unknown") for l in db.leads.find({"_id": {"$in": lead_ids}})}
    cases_map = {str(c["_id"]): c.get("trackingId", "Unknown") for c in db.cases.find({"_id": {"$in": case_ids}})}
    
    for t in raw_tasks:
        t["_id"] = str(t["_id"])
        t["assigneeId"] = str(t["assigneeId"])
        t["assigneeName"] = current_user.get("name", "Me")
        t["leadId"] = str(t.get("leadId")) if t.get("leadId") else None
        t["leadName"] = leads_map.get(t["leadId"], "Unknown") if t["leadId"] else None
        t["caseId"] = str(t.get("caseId")) if t.get("caseId") else None
        t["caseTrackingId"] = cases_map.get(t["caseId"], "Unknown") if t["caseId"] else None
        tasks.append(t)
    return tasks

@router.get("")
def list_all_tasks(current_user = Depends(get_current_user)):
    role = current_user["role"]
    if role == "CEO":
        cursor = db.tasks.find({}).sort("createdAt", -1)
    elif role == "DIRECTOR":
        users_in_country = [u["_id"] for u in db.users.find({"country": current_user.get("country")})]
        cursor = db.tasks.find({"assigneeId": {"$in": users_in_country}}).sort("createdAt", -1)
    elif role == "HR":
        if current_user.get("branchId"):
            users_in_branch = [u["_id"] for u in db.users.find({"branchId": current_user["branchId"]})]
            cursor = db.tasks.find({"assigneeId": {"$in": users_in_branch}}).sort("createdAt", -1)
        elif current_user.get("country"):
            users_in_country = [u["_id"] for u in db.users.find({"country": current_user["country"]})]
            cursor = db.tasks.find({"assigneeId": {"$in": users_in_country}}).sort("createdAt", -1)
        else:
            cursor = db.tasks.find({}).sort("createdAt", -1)
    elif role in ("BRANCH_ADMIN", "ADMIN"):
        branch_id = current_user.get("branchId")
        if branch_id:
            users_in_branch = [u["_id"] for u in db.users.find({"branchId": branch_id})]
            cursor = db.tasks.find({"assigneeId": {"$in": users_in_branch}}).sort("createdAt", -1)
        else:
            cursor = db.tasks.find({"assigneeId": ObjectId(current_user["_id"])}).sort("createdAt", -1)
    else:
        cursor = db.tasks.find({"assigneeId": ObjectId(current_user["_id"])}).sort("createdAt", -1)
        
    tasks = []
    raw_tasks = list(cursor)
    
    user_ids = list(set(t["assigneeId"] for t in raw_tasks))
    lead_ids = list(set(t["leadId"] for t in raw_tasks if t.get("leadId")))
    case_ids = list(set(t["caseId"] for t in raw_tasks if t.get("caseId")))
    
    users_map = {str(u["_id"]): u.get("name", "Unknown") for u in db.users.find({"_id": {"$in": user_ids}})}
    leads_map = {str(l["_id"]): l.get("fullName", "Unknown") for l in db.leads.find({"_id": {"$in": lead_ids}})}
    cases_map = {str(c["_id"]): c.get("trackingId", "Unknown") for c in db.cases.find({"_id": {"$in": case_ids}})}
    
    for t in raw_tasks:
        t["_id"] = str(t["_id"])
        t["assigneeId"] = str(t["assigneeId"])
        t["assigneeName"] = users_map.get(t["assigneeId"], "Unknown")
        t["leadId"] = str(t.get("leadId")) if t.get("leadId") else None
        t["leadName"] = leads_map.get(t["leadId"], "Unknown") if t["leadId"] else None
        t["caseId"] = str(t.get("caseId")) if t.get("caseId") else None
        t["caseTrackingId"] = cases_map.get(t["caseId"], "Unknown") if t["caseId"] else None
        tasks.append(t)
    return tasks

@router.patch("/{task_id}/toggle")
def toggle_task(task_id: str, current_user = Depends(get_current_user)):
    task = db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_status = None if task.get("completedAt") else datetime.now(timezone.utc)
    db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": {"completedAt": new_status}})
    return {"completed": new_status is not None}
