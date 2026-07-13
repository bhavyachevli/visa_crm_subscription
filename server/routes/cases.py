from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user
from models.schemas import CaseCreate

router = APIRouter(prefix="/api/cases", tags=["cases"])

@router.post("")
def create_case(case: CaseCreate, current_user = Depends(get_current_user)):
    # Seed default checklist based on visaType
    v_type = case.visaType or "Student"
    t_country = case.targetCountry or "Canada"
    p_line = case.productLine or "CANADA"
    
    mock_reqs = [
        {"documentName": "Passport", "isMandatory": True, "description": "Valid passport"},
        {"documentName": "Proof of Funds", "isMandatory": True, "description": "Bank statements or financial support"},
        {"documentName": "Application Form", "isMandatory": True, "description": "Completed visa application form"}
    ]
    if v_type == "Student":
        mock_reqs.append({"documentName": "Letter of Acceptance", "isMandatory": True, "description": "Official school acceptance letter"})
        mock_reqs.append({"documentName": "Academic Transcripts", "isMandatory": False, "description": "High school/university certificates"})
        mock_reqs.append({"documentName": "IELTS/Language Test", "isMandatory": False, "description": "Proof of English proficiency"})
    elif v_type == "PR":
        mock_reqs.append({"documentName": "Education Credential Assessment (ECA)", "isMandatory": True, "description": "WES or equivalent report"})
        mock_reqs.append({"documentName": "Language Test Results", "isMandatory": True, "description": "IELTS or CELPIP scorecard"})
        mock_reqs.append({"documentName": "Police Clearance Certificate", "isMandatory": True, "description": "PCC from country of residence"})
    elif v_type == "Work":
        mock_reqs.append({"documentName": "Job Offer Letter", "isMandatory": True, "description": "Signed employment contract"})
        mock_reqs.append({"documentName": "LMIA or Equivalent Support", "isMandatory": False, "description": "Labour Market Impact Assessment"})
    elif v_type == "Visitor":
        mock_reqs.append({"documentName": "Travel Itinerary", "isMandatory": False, "description": "Flight booking or tour plan"})
        mock_reqs.append({"documentName": "Invitation Letter", "isMandatory": False, "description": "Letter from relative/friend in target country"})

    t_id = str(ObjectId())
    db.visa_templates.insert_one({"_id": ObjectId(t_id), "documentRequirements": mock_reqs})
    
    checklist = [
        {
            "documentName": req["documentName"],
            "isMandatory": req["isMandatory"],
            "status": "Pending Upload",
            "fileUrl": None,
            "rejectionReason": None,
            "uploadedAt": None
        }
        for req in mock_reqs
    ]
    
    new_case = {
        "clientId": ObjectId(case.leadId),
        "visaTemplateId": ObjectId(t_id),
        "trackingId": f"CASE-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "pipelineStage": case.stage or "Intake",
        "stage": case.stage or "Intake",
        "documents": checklist,
        "assignedAgentId": ObjectId(current_user["_id"]),
        "visaType": v_type,
        "targetCountry": t_country,
        "productLine": p_line,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    result = db.immigration_cases.insert_one(new_case)
    return {"message": "Case created", "id": str(result.inserted_id), "trackingId": new_case["trackingId"]}

@router.get("/lead/{lead_id}")
def get_cases_for_lead(lead_id: str, current_user = Depends(get_current_user)):
    query_id = None
    try:
        query_id = ObjectId(lead_id)
    except Exception:
        pass
    
    query = {"clientId": lead_id}
    if query_id:
        query = {"$or": [{"clientId": query_id}, {"clientId": lead_id}]}
        
    cases_cursor = db.immigration_cases.find(query).sort("createdAt", -1)
    cases = []
    for c in cases_cursor:
        c["_id"] = str(c["_id"])
        c["leadId"] = str(c["clientId"])
        c["clientId"] = str(c["clientId"])
        if "visaTemplateId" in c:
            c["visaTemplateId"] = str(c["visaTemplateId"])
        if "assignedAgentId" in c:
            c["assignedAgentId"] = str(c["assignedAgentId"])
        c["stage"] = c.get("stage") or c.get("pipelineStage") or "Intake"
        cases.append(c)
    return cases

@router.patch("/{case_id}/stage")
def update_case_stage(case_id: str, stage_data: dict, current_user = Depends(get_current_user)):
    new_stage = stage_data.get("stage")
    if not new_stage:
        raise HTTPException(status_code=400, detail="Stage is required")
        
    update_fields = {
        "stage": new_stage, 
        "pipelineStage": new_stage, 
        "updatedAt": datetime.now(timezone.utc)
    }
    if new_stage == "Approved":
        update_fields["approvedAt"] = datetime.now(timezone.utc)
    else:
        update_fields["approvedAt"] = None
        
    db.immigration_cases.update_one(
        {"_id": ObjectId(case_id)},
        {"$set": update_fields}
    )
    return {"message": "Stage updated"}
