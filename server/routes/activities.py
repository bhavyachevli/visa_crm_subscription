from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/activities", tags=["activities"])

class ActivityCreate(BaseModel):
    leadId: str
    type: str
    body: str
    model_config = {"extra": "allow"}

@router.post("")
def create_activity(activity: ActivityCreate, current_user = Depends(get_current_user)):
    act_dict = activity.model_dump()
    act_dict["leadId"] = ObjectId(activity.leadId)
    act_dict["userId"] = ObjectId(current_user["_id"])
    act_dict["createdAt"] = datetime.now(timezone.utc)
    
    result = db.activities.insert_one(act_dict)
    return {"id": str(result.inserted_id)}

@router.get("/lead/{lead_id}")
def get_activities(lead_id: str, current_user = Depends(get_current_user)):
    cursor = db.activities.aggregate([
        {"$match": {"leadId": ObjectId(lead_id)}},
        {"$lookup": {
            "from": "users",
            "localField": "userId",
            "foreignField": "_id",
            "as": "user"
        }},
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"createdAt": -1}}
    ])
    
    acts = []
    for a in cursor:
        a["_id"] = str(a["_id"])
        a["leadId"] = str(a["leadId"])
        a["userId"] = str(a["userId"]) if a.get("userId") else None
        if a.get("user"):
            a["userName"] = a["user"].get("name")
            del a["user"]
        acts.append(a)
    return acts
