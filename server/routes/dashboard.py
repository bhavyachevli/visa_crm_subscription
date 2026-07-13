"""
Dashboard metrics — scoped by role:
  CEO          → global metrics
  Director     → country-scoped metrics
  Branch Admin → branch-scoped metrics
"""
from fastapi import APIRouter, Depends
from bson import ObjectId
from utils.db import db
from middleware.auth import get_current_user, get_lead_scope_query

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/metrics")
def get_metrics(current_user=Depends(get_current_user)):
    # Get the scoped query filter
    lead_match = get_lead_scope_query(current_user)

    new_enquiries = db.leads.count_documents({**lead_match, "leadStatus": "NEW"})
    total_leads = db.leads.count_documents(lead_match)
    qualified_leads = db.leads.count_documents({**lead_match, "leadStatus": "QUALIFIED"})
    on_hold = db.leads.count_documents({**lead_match, "leadStatus": "ON_HOLD"})
    conversion = (qualified_leads / total_leads * 100) if total_leads > 0 else 0

    # Active cases (global for now, can scope later)
    if current_user["role"] == "CEO":
        active_cases = db.immigration_cases.count_documents({"pipelineStage": {"$nin": ["Approved", "Rejected"]}})
    else:
        # Scope cases via leads in scope
        scoped_lead_ids = [l["_id"] for l in db.leads.find(lead_match, {"_id": 1})]
        active_cases = db.immigration_cases.count_documents({
            "clientId": {"$in": scoped_lead_ids},
            "pipelineStage": {"$nin": ["Approved", "Rejected"]}
        })

    return {
        "newEnquiries": new_enquiries,
        "activeCases": active_cases,
        "conversionPct": round(conversion, 1),
        "onHold": on_hold,
        "totalLeads": total_leads,
        "role": current_user["role"],
        "scope": current_user.get("country", "Global"),
    }
