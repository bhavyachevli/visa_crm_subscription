import sys
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
from bson import ObjectId

def verify_archive():
    print("[INFO] Connecting to MongoDB...")
    client = MongoClient("mongodb://localhost:27017")
    db = client["pangaea_crm"]
    
    # Check cases
    cases_col = db.immigration_cases
    cases_count = cases_col.count_documents({})
    print(f"[INFO] Found {cases_count} cases total in db.immigration_cases.")
    
    if cases_count == 0:
        print("[WARNING] No cases found to test. Please create a case via the client UI first.")
        sys.exit(0)
        
    # Find any case
    case = cases_col.find_one()
    case_id = case["_id"]
    tracking_id = case.get("trackingId", "N/A")
    client_id = case.get("clientId")
    client_name = "Jane Doe"
    if client_id:
        lead = db.leads.find_one({"_id": ObjectId(client_id)})
        if lead:
            client_name = lead.get("fullName", "Unknown")
            
    print(f"[INFO] Selected case {tracking_id} for client '{client_name}' (ID: {case_id})")
    
    # Update this case to Approved with approvedAt = 25 hours ago
    past_approved_time = datetime.now(timezone.utc) - timedelta(hours=25)
    
    result = cases_col.update_one(
        {"_id": case_id},
        {"$set": {
            "pipelineStage": "Approved",
            "stage": "Approved",
            "approvedAt": past_approved_time,
            "updatedAt": past_approved_time
        }}
    )
    
    if result.modified_count > 0:
        print(f"[SUCCESS] Updated case {tracking_id} to 'Approved' stage.")
        print(f"[SUCCESS] Set approvedAt/updatedAt to: {past_approved_time} (25 hours ago).")
        print("[INFO] This case should now appear under the 'Approved Documents' tab in the UI, and NOT in the 'Approved' column of the Pipeline Board.")
    else:
        print("[INFO] Case was already updated or not modified.")

if __name__ == "__main__":
    verify_archive()
