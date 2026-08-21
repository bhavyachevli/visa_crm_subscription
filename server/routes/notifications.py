from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def _serialize(notif: dict) -> dict:
    notif["_id"] = str(notif["_id"])
    notif["userId"] = str(notif["userId"])
    if notif.get("createdAt"):
        notif["createdAt"] = notif["createdAt"].replace(tzinfo=timezone.utc).isoformat()
    return notif

@router.get("")
def get_notifications(current_user = Depends(get_current_user)):
    """Retrieve all notifications for the current logged-in user."""
    cursor = db.notifications.find({"userId": ObjectId(current_user["_id"])}).sort("createdAt", -1)
    notifs = []
    for doc in cursor:
        notifs.append(_serialize(doc))
    return notifs

@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, current_user = Depends(get_current_user)):
    """Mark a notification as read."""
    result = db.notifications.update_one(
        {"_id": ObjectId(notification_id), "userId": ObjectId(current_user["_id"])},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.post("/read-all")
def mark_all_read(current_user = Depends(get_current_user)):
    """Mark all notifications of the current user as read."""
    db.notifications.update_many(
        {"userId": ObjectId(current_user["_id"]), "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}

@router.delete("/{notification_id}")
def delete_notification(notification_id: str, current_user = Depends(get_current_user)):
    """Delete a specific notification."""
    result = db.notifications.delete_one(
        {"_id": ObjectId(notification_id), "userId": ObjectId(current_user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}
