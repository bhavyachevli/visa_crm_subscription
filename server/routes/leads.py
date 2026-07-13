"""
Leads route — RBAC enforced:
  GET  /api/leads        → scoped by role (CEO=all, Director=country, BranchAdmin=branch)
  POST /api/leads        → CEO, Director, Branch Admin can create
  PATCH /api/leads/:id   → CEO and Director only (Branch Admin blocked)
  DELETE /api/leads/:id  → CEO only
"""
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime, timezone

from utils.db import db
from middleware.auth import get_current_user
from models.schemas import LeadCreate, LeadUpdate, LeadTransferRequest, DuplicateLeadRequest

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _get_lead_code(lead: dict, branches_map: dict = None, users_map: dict = None) -> str:
    created_by = lead.get("createdBy")
    creator_city = None
    if created_by:
        if users_map is not None and str(created_by) in users_map:
            creator_city = users_map[str(created_by)].get("city")
            if not creator_city:
                creator_branch_id = users_map[str(created_by)].get("branchId")
                if creator_branch_id and branches_map:
                    creator_city = branches_map.get(str(creator_branch_id))
        else:
            creator = db.users.find_one({"_id": ObjectId(created_by)})
            if creator:
                creator_city = creator.get("city")
                if not creator_city and creator.get("branchId"):
                    branch = db.branches.find_one({"_id": ObjectId(creator["branchId"])})
                    if branch:
                        creator_city = branch.get("city")
                        
    if not creator_city:
        branch_id = lead.get("branchId")
        if branch_id:
            if branches_map is not None:
                creator_city = branches_map.get(str(branch_id))
            else:
                branch = db.branches.find_one({"_id": ObjectId(branch_id)})
                if branch:
                    creator_city = branch.get("city")
                    
    branch_city = creator_city.strip().upper() if creator_city else "LEAD"
    lead_no_str = str(lead.get("leadNo") or 1).zfill(4)
    return f"{branch_city}-{lead_no_str}"


def _serialize_lead(lead: dict, branches_map: dict = None, users_map: dict = None) -> dict:
    lead["_id"] = str(lead["_id"])
    lead["branchId"] = str(lead["branchId"]) if lead.get("branchId") else None
    lead["ownerId"] = str(lead["ownerId"]) if lead.get("ownerId") else None
    lead["referringPartnerId"] = str(lead["referringPartnerId"]) if lead.get("referringPartnerId") else None
    if lead.get("createdBy"):
        lead["createdBy"] = str(lead["createdBy"])
    lead["leadCode"] = _get_lead_code(lead, branches_map, users_map)
    return lead


def _sync_flat_properties(lead_dict: dict):
    # 1. Sync phone from phoneNumbers
    if "phoneNumbers" in lead_dict and lead_dict["phoneNumbers"]:
        pref = next((p for p in lead_dict["phoneNumbers"] if p.get("isPreferred")), lead_dict["phoneNumbers"][0])
        code = pref.get("contactCode") or "+91"
        num = pref.get("contactNumber") or ""
        lead_dict["phone"] = f"{code} {num}".strip() if num else ""
        lead_dict["contactCode"] = code
        lead_dict["contactType"] = pref.get("contactType") or "Personal"
        
    # 2. Sync email from emailAddresses
    if "emailAddresses" in lead_dict and lead_dict["emailAddresses"]:
        pref = next((e for e in lead_dict["emailAddresses"] if e.get("isPreferred")), lead_dict["emailAddresses"][0])
        lead_dict["email"] = pref.get("emailAddress") or ""
        lead_dict["emailType"] = pref.get("emailType") or "Personal"
        
    # 3. Sync address from addresses
    if "addresses" in lead_dict and lead_dict["addresses"]:
        pref = next((a for a in lead_dict["addresses"] if a.get("isDefault")), lead_dict["addresses"][0])
        lead_dict["addressLine1"] = pref.get("addressLine1") or ""
        lead_dict["addressLine2"] = pref.get("addressLine2") or ""
        lead_dict["country"] = pref.get("country") or ""
        lead_dict["state"] = pref.get("state") or ""
        lead_dict["city"] = pref.get("city") or ""
        lead_dict["zipcode"] = pref.get("zipcode") or ""
        lead_dict["addressType"] = pref.get("addressType") or "Permanent"


# ─── Create Lead ──────────────────────────────────────────────────────────────

@router.post("")
async def create_lead(request: Request, lead: LeadCreate, current_user=Depends(get_current_user)):
    """All roles can create leads, but Branch Admins can only create for their own branch."""
    lead_dict = lead.model_dump(exclude_unset=True)
    _sync_flat_properties(lead_dict)

    # Debug logging
    try:
        import json
        from bson import json_util
        raw_body = await request.json()
        debug_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "lead_debug.txt")
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(json.dumps({
                "raw_body": raw_body,
                "parsed_lead_dict": lead_dict
            }, default=json_util.default, indent=2))
    except Exception as e:
        print(f"Error in debug logging: {e}")

    # Branch Admins can only create leads for their own branch
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        if str(current_user.get("branchId")) != lead.branchId:
            raise HTTPException(status_code=403, detail="Branch Admins can only create leads for their own branch")

    # Directors can only create leads for their own branch
    if current_user["role"] == "DIRECTOR":
        branch_id = current_user.get("branchId")
        if branch_id:
            if str(branch_id) != lead.branchId:
                raise HTTPException(status_code=403, detail="Directors can only create leads for their own branch")
        else:
            # Fallback for legacy Directors
            branch = db.branches.find_one({"_id": ObjectId(lead.branchId)})
            if not branch or branch.get("country") != current_user.get("country"):
                raise HTTPException(status_code=403, detail="Directors can only create leads for branches in their country")

    lead_dict["branchId"] = ObjectId(lead.branchId)
    if lead.ownerId:
        lead_dict["ownerId"] = ObjectId(lead.ownerId)
    if lead.referringPartnerId:
        lead_dict["referringPartnerId"] = ObjectId(lead.referringPartnerId)

    lead_dict["createdAt"] = datetime.now(timezone.utc)
    lead_dict["updatedAt"] = datetime.now(timezone.utc)
    lead_dict["createdBy"] = current_user["_id"]

    if lead.consentContact:
        lead_dict["consentAt"] = datetime.now(timezone.utc)

    # Assign persistent leadNo
    max_lead = db.leads.find_one(sort=[("leadNo", -1)])
    next_lead_no = (max_lead.get("leadNo") or 0) + 1 if max_lead else 1
    lead_dict["leadNo"] = next_lead_no

    result = db.leads.insert_one(lead_dict)
    return {"message": "Lead created successfully", "id": str(result.inserted_id)}


# ─── List Leads ───────────────────────────────────────────────────────────────

@router.get("")
def get_leads(scope: str = "all", current_user=Depends(get_current_user)):
    """Returns leads scoped to the user's role and scope parameter."""
    query = {}
    
    if scope == "my":
        query["ownerId"] = current_user["_id"]
    else:
        role = current_user["role"]
        if role == "DIRECTOR":
            branch_id = current_user.get("branchId")
            if branch_id:
                query["branchId"] = branch_id
            else:
                country = current_user.get("country")
                if country:
                    country_branches = list(db.branches.find({"country": country}, {"_id": 1}))
                    branch_ids = [b["_id"] for b in country_branches]
                    query["branchId"] = {"$in": branch_ids}
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            branch_id = current_user.get("branchId")
            if branch_id:
                query["branchId"] = branch_id

    leads_cursor = db.leads.find(query).sort("createdAt", -1)

    # Pre-fetch branches to map branchId -> city
    branches_cursor = db.branches.find({}, {"_id": 1, "city": 1})
    branches_map = {str(b["_id"]): b.get("city", "LEAD").strip().upper() for b in branches_cursor}

    # Pre-fetch users to map userId -> {city, branchId}
    users_cursor = db.users.find({}, {"_id": 1, "city": 1, "branchId": 1})
    users_map = {str(u["_id"]): {"city": u.get("city"), "branchId": str(u["branchId"]) if u.get("branchId") else None} for u in users_cursor}

    leads = []
    for lead in leads_cursor:
        serialized = _serialize_lead(lead, branches_map, users_map)
        if serialized.get("ownerId"):
            owner = db.users.find_one({"_id": ObjectId(serialized["ownerId"])})
            serialized["ownerName"] = owner.get("name") if owner else "Unassigned"
        else:
            serialized["ownerName"] = "Unassigned"
        leads.append(serialized)
    return leads


# ─── Get Single Lead ──────────────────────────────────────────────────────────

@router.get("/{lead_id}")
def get_lead(lead_id: str, current_user=Depends(get_current_user)):
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify access scope
    # If the user is the owner, they can always see it
    has_access = False
    if str(lead.get("ownerId")) == str(current_user["_id"]):
        has_access = True
    else:
        role = current_user["role"]
        if role == "CEO":
            has_access = True
        elif role == "DIRECTOR":
            branch = db.branches.find_one({"_id": lead.get("branchId")})
            if branch and branch.get("country") == current_user.get("country"):
                has_access = True
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            if str(lead.get("branchId")) == str(current_user.get("branchId")):
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    serialized = _serialize_lead(lead)
    
    # Lookup owner name
    if serialized.get("ownerId"):
        owner = db.users.find_one({"_id": ObjectId(serialized["ownerId"])})
        serialized["ownerName"] = owner.get("name") if owner else "Unassigned"
        serialized["ownerEmail"] = owner.get("email") if owner else ""
    else:
        serialized["ownerName"] = "Unassigned"
        serialized["ownerEmail"] = ""
        
    # Lookup creator name
    if serialized.get("createdBy"):
        creator = db.users.find_one({"_id": ObjectId(serialized["createdBy"])})
        serialized["creatorName"] = creator.get("name") if creator else "System"
    else:
        serialized["creatorName"] = "System"
        
    # Lookup branch name
    if serialized.get("branchId"):
        branch = db.branches.find_one({"_id": ObjectId(serialized["branchId"])})
        serialized["branchName"] = branch.get("name") if branch else "Unknown"
    else:
        serialized["branchName"] = "Unknown"

    # Fetch related leads sharing the same email or phone (flat or inside lists)
    phones_to_check = set()
    if lead.get("phone"):
        phones_to_check.add(lead["phone"].strip())
        parts = lead["phone"].split(None, 1)
        if len(parts) > 1:
            phones_to_check.add(parts[1].strip())
    if lead.get("phoneNumbers"):
        for pn in lead["phoneNumbers"]:
            num = pn.get("contactNumber")
            if num:
                phones_to_check.add(num.strip())
                code = pn.get("contactCode") or ""
                if code:
                    phones_to_check.add(f"{code} {num}".strip())
                    phones_to_check.add(f"{code}{num}".strip())

    emails_to_check = set()
    if lead.get("email"):
        emails_to_check.add(lead["email"].strip().lower())
    if lead.get("emailAddresses"):
        for em in lead["emailAddresses"]:
            email_val = em.get("emailAddress")
            if email_val:
                emails_to_check.add(email_val.strip().lower())

    or_clauses = []
    for email in emails_to_check:
        or_clauses.append({"email": email})
        or_clauses.append({"emailAddresses.emailAddress": email})
    for phone in phones_to_check:
        or_clauses.append({"phone": phone})
        or_clauses.append({"phoneNumbers.contactNumber": phone})

    related_leads = []
    if or_clauses:
        related_cursor = db.leads.find({"$or": or_clauses}).sort("createdAt", -1)
        for r_lead in related_cursor:
            related_leads.append({
                "id": str(r_lead["_id"]),
                "productLine": r_lead.get("productLine", "Unknown"),
                "fullName": r_lead.get("fullName", "Unknown")
            })

    if not any(r["id"] == str(lead["_id"]) for r in related_leads):
        related_leads.append({
            "id": str(lead["_id"]),
            "productLine": lead.get("productLine", "Unknown"),
            "fullName": lead.get("fullName", "Unknown")
        })

    serialized["relatedLeads"] = related_leads
    return serialized


# ─── Update Lead ──────────────────────────────────────────────────────────────

@router.patch("/{lead_id}")
def update_lead(
    lead_id: str,
    updates: LeadUpdate,
    current_user=Depends(get_current_user)
):
    """
    CEO: can edit any lead.
    Director: can only edit leads within their country's branches.
    Branch Admin: can only edit leads within their own branch.
    """
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Directors can only edit leads in their branch
    if current_user["role"] == "DIRECTOR":
        branch_id = current_user.get("branchId")
        if branch_id:
            if str(lead.get("branchId")) != str(branch_id):
                raise HTTPException(status_code=403, detail="Cannot edit leads outside your branch")
        else:
            branch = db.branches.find_one({"_id": lead.get("branchId")})
            if not branch or branch.get("country") != current_user.get("country"):
                raise HTTPException(status_code=403, detail="Cannot edit leads outside your country")

    # Branch Admins/Admins can only edit leads in their own branch
    if current_user["role"] in ("BRANCH_ADMIN", "ADMIN"):
        if str(lead.get("branchId")) != str(current_user.get("branchId")):
            raise HTTPException(status_code=403, detail="Branch Admins can only edit leads in their own branch")

    update_dict = updates.model_dump(exclude_unset=True)
    _sync_flat_properties(update_dict)
    if not update_dict:
        return {"message": "No updates provided"}

    if "branchId" in update_dict and update_dict["branchId"]:
        update_dict["branchId"] = ObjectId(update_dict["branchId"])
    if "ownerId" in update_dict and update_dict["ownerId"]:
        update_dict["ownerId"] = ObjectId(update_dict["ownerId"])

    update_dict["updatedAt"] = datetime.now(timezone.utc)

    result = db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {"message": "Lead updated successfully"}


# ─── Delete Lead ──────────────────────────────────────────────────────────────

@router.delete("/{lead_id}")
def delete_lead(lead_id: str, current_user=Depends(get_current_user)):
    """Only CEO can delete leads."""
    if current_user["role"] != "CEO":
        raise HTTPException(status_code=403, detail="Only CEO can delete leads")

    result = db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {"message": "Lead deleted successfully"}


# ─── Transfer Leads ───────────────────────────────────────────────────────────

@router.post("/transfer")
def transfer_leads(req: LeadTransferRequest, current_user=Depends(get_current_user)):
    """Admin tool to bulk transfer leads between users."""
    if current_user["role"] not in ("CEO", "DIRECTOR"):
        raise HTTPException(status_code=403, detail="Only CEO or Director can transfer leads")

    # Validate destination
    if not db.users.find_one({"_id": ObjectId(req.destinationUserId)}):
        raise HTTPException(status_code=404, detail="Destination user not found")
    if not db.branches.find_one({"_id": ObjectId(req.destinationBranchId)}):
        raise HTTPException(status_code=404, detail="Destination branch not found")

    # Build query
    query = {"ownerId": ObjectId(req.sourceUserId)}
    
    if current_user["role"] == "DIRECTOR":
        branch_id = current_user.get("branchId")
        if branch_id:
            query["branchId"] = branch_id
        else:
            country = current_user.get("country")
            country_branches = list(db.branches.find({"country": country}, {"_id": 1}))
            branch_ids = [b["_id"] for b in country_branches]
            query["branchId"] = {"$in": branch_ids}

    # If limit is specified, fetch IDs first
    if req.limit and req.limit > 0:
        leads = list(db.leads.find(query).limit(req.limit))
        lead_ids = [lead["_id"] for lead in leads]
        if not lead_ids:
            return {"message": "No leads found to transfer", "transferred_count": 0}
        filter_query = {"_id": {"$in": lead_ids}}
    else:
        filter_query = query

    update_payload = {
        "$set": {
            "ownerId": ObjectId(req.destinationUserId),
            "branchId": ObjectId(req.destinationBranchId),
            "updatedAt": datetime.now(timezone.utc)
        }
    }

    result = db.leads.update_many(filter_query, update_payload)

    # Log audit
    db.activities.insert_one({
        "action": "LEAD_TRANSFER",
        "performedBy": current_user["_id"],
        "sourceUserId": ObjectId(req.sourceUserId),
        "destinationUserId": ObjectId(req.destinationUserId),
        "destinationBranchId": ObjectId(req.destinationBranchId),
        "transferReason": req.transferReason,
        "count": result.modified_count,
        "timestamp": datetime.now(timezone.utc)
    })

    return {"message": "Leads transferred successfully", "transferred_count": result.modified_count}


# ─── File Notes Endpoints ───────────────────────────────────────────────────

@router.get("/{lead_id}/notes")
def get_lead_notes(lead_id: str, current_user=Depends(get_current_user)):
    # Verify access to the lead
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    has_access = False
    if str(lead.get("ownerId")) == str(current_user["_id"]):
        has_access = True
    else:
        role = current_user["role"]
        if role == "CEO":
            has_access = True
        elif role == "DIRECTOR":
            branch_id = current_user.get("branchId")
            if branch_id:
                if str(lead.get("branchId")) == str(branch_id):
                    has_access = True
            else:
                branch = db.branches.find_one({"_id": lead.get("branchId")})
                if branch and branch.get("country") == current_user.get("country"):
                    has_access = True
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            if str(lead.get("branchId")) == str(current_user.get("branchId")):
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    notes_cursor = db.notes.find({"leadId": ObjectId(lead_id)}).sort("createdAt", -1)
    
    notes = []
    for note in notes_cursor:
        note["_id"] = str(note["_id"])
        note["leadId"] = str(note["leadId"])
        note["createdBy"] = str(note["createdBy"])
        notes.append(note)
    return notes


@router.post("/{lead_id}/notes")
async def create_lead_note(
    lead_id: str,
    body: str = Form(...),
    sendToClient: bool = Form(False),
    sendToAssigned: bool = Form(False),
    sendToStaff: bool = Form(False),
    sendToOthers: bool = Form(False),
    othersEmails: str = Form(None),
    file: UploadFile = File(None),
    current_user=Depends(get_current_user)
):
    # Verify access to the lead
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    has_access = False
    if str(lead.get("ownerId")) == str(current_user["_id"]):
        has_access = True
    else:
        role = current_user["role"]
        if role == "CEO":
            has_access = True
        elif role == "DIRECTOR":
            branch_id = current_user.get("branchId")
            if branch_id:
                if str(lead.get("branchId")) == str(branch_id):
                    has_access = True
            else:
                branch = db.branches.find_one({"_id": lead.get("branchId")})
                if branch and branch.get("country") == current_user.get("country"):
                    has_access = True
        elif role in ("BRANCH_ADMIN", "ADMIN"):
            if str(lead.get("branchId")) == str(current_user.get("branchId")):
                has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    attachment = None

    if file and file.filename:
        # File type validation
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = [".png", ".jpg", ".jpeg", ".gif", ".docx", ".doc", ".pdf"]
        if ext not in allowed_exts:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Supported formats: {', '.join(allowed_exts)}")
            
        # File size validation (2MB limit)
        contents = await file.read()
        size_bytes = len(contents)
        if size_bytes > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds maximum size of 2MB")
            
        await file.seek(0)
        
        safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
        notes_dir = os.path.join(UPLOAD_DIR, "notes", lead_id)
        os.makedirs(notes_dir, exist_ok=True)
        
        file_path = os.path.join(notes_dir, safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment = {
            "filename": file.filename,
            "storedPath": f"notes/{lead_id}/{safe_filename}",
            "size": size_bytes
        }

    note_doc = {
        "leadId": ObjectId(lead_id),
        "body": body,
        "sendToClient": sendToClient,
        "sendToAssigned": sendToAssigned,
        "sendToStaff": sendToStaff,
        "sendToOthers": sendToOthers,
        "othersEmails": othersEmails,
        "attachment": attachment,
        "createdAt": datetime.now(timezone.utc),
        "createdBy": ObjectId(current_user["_id"]),
        "creatorName": current_user.get("name", "Unknown User")
    }

    result = db.notes.insert_one(note_doc)
    note_id = str(result.inserted_id)

    # ─── Email dispatch simulations ──────────────────────────────────────────
    print(f"\n{'='*50}\n[DEV] FILE NOTE CREATED FOR LEAD: {lead.get('fullName')} (ID: {lead_id})")
    
    if sendToClient:
        client_email = lead.get("email", "N/A")
        print(f"[DEV EMAIL] Sent file note to Client ({lead.get('fullName')}) at email: {client_email}")
        
    if sendToAssigned:
        owner_id = lead.get("ownerId")
        if owner_id:
            owner = db.users.find_one({"_id": ObjectId(owner_id)})
            owner_email = owner.get("email", "N/A") if owner else "N/A"
            owner_name = owner.get("name", "N/A") if owner else "N/A"
            print(f"[DEV EMAIL] Sent file note to Assigned User ({owner_name}) at email: {owner_email}")
        else:
            print("[DEV EMAIL] Cannot send to assigned user: lead has no owner assigned.")
            
    if sendToStaff:
        # Find all staff members in the same branch
        branch_id = lead.get("branchId")
        if branch_id:
            staff_users = list(db.users.find({"branchId": branch_id}))
            print(f"[DEV EMAIL] Sent file note to {len(staff_users)} Staff Members of Branch ID {branch_id}")
            for su in staff_users:
                print(f"  - Staff: {su.get('name')} ({su.get('email')})")
        else:
            print("[DEV EMAIL] Cannot send to staff: lead has no branchId.")
            
    if sendToOthers and othersEmails:
        emails_list = [e.strip() for e in othersEmails.split(",") if e.strip()]
        print(f"[DEV EMAIL] Sent file note to custom recipients: {', '.join(emails_list)}")
        
    print(f"{'='*50}\n")

    # Add activity
    db.activities.insert_one({
        "leadId": ObjectId(lead_id),
        "userId": ObjectId(current_user["_id"]),
        "type": "FILE_NOTE",
        "body": f"Added File Note: {body[:100]}...",
        "createdAt": datetime.now(timezone.utc)
    })

    return {"message": "File Note created successfully", "id": note_id}


@router.get("/notes/download/{note_id}")
def download_note_attachment(note_id: str, current_user=Depends(get_current_user)):
    note = db.notes.find_one({"_id": ObjectId(note_id)})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    attachment = note.get("attachment")
    if not attachment:
        raise HTTPException(status_code=404, detail="No attachment for this note")
        
    file_path = os.path.join(UPLOAD_DIR, attachment["storedPath"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
        
    return FileResponse(path=file_path, filename=attachment["filename"])


# ─── Duplicate Lead and Service Check Endpoints ──────────────────────────────

@router.get("/{lead_id}/duplicate-check")
def check_duplicate_lead(
    lead_id: str,
    current_user=Depends(get_current_user)
):
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    phones_to_check = set()
    if lead.get("phone"):
        phones_to_check.add(lead["phone"].strip())
        parts = lead["phone"].split(None, 1)
        if len(parts) > 1:
            phones_to_check.add(parts[1].strip())
    if lead.get("phoneNumbers"):
        for pn in lead["phoneNumbers"]:
            num = pn.get("contactNumber")
            if num:
                phones_to_check.add(num.strip())
                code = pn.get("contactCode") or ""
                if code:
                    phones_to_check.add(f"{code} {num}".strip())
                    phones_to_check.add(f"{code}{num}".strip())

    emails_to_check = set()
    if lead.get("email"):
        emails_to_check.add(lead["email"].strip().lower())
    if lead.get("emailAddresses"):
        for em in lead["emailAddresses"]:
            email_val = em.get("emailAddress")
            if email_val:
                emails_to_check.add(email_val.strip().lower())

    or_clauses = []
    for email in emails_to_check:
        or_clauses.append({"email": email})
        or_clauses.append({"emailAddresses.emailAddress": email})
    for phone in phones_to_check:
        or_clauses.append({"phone": phone})
        or_clauses.append({"phoneNumbers.contactNumber": phone})
        
    if not or_clauses:
        return []
        
    duplicates = list(db.leads.find({
        "$or": or_clauses
    }))
    results = []
    for d in duplicates:
        branch_name = "Unknown"
        creator_city = None
        
        # Try to get creator's city first
        created_by = d.get("createdBy")
        if created_by:
            creator = db.users.find_one({"_id": ObjectId(created_by)})
            if creator:
                creator_city = creator.get("city")
                if not creator_city and creator.get("branchId"):
                    branch = db.branches.find_one({"_id": ObjectId(creator["branchId"])})
                    if branch:
                        creator_city = branch.get("city")
                        
        # Fallback to lead's own branch city
        if d.get("branchId"):
            branch = db.branches.find_one({"_id": ObjectId(d["branchId"])})
            if branch:
                branch_name = branch.get("name", "Unknown")
                if not creator_city:
                    creator_city = branch.get("city")
                    
        branch_city = creator_city.strip().upper() if creator_city else "LEAD"
                
        assignee_name = "Unassigned"
        if d.get("ownerId"):
            owner = db.users.find_one({"_id": ObjectId(d["ownerId"])})
            if owner:
                assignee_name = owner.get("name", "Unassigned")
                
        results.append({
            "id": str(d["_id"]),
            "branchName": branch_name,
            "leadCode": f"{branch_city}-{str(d.get('leadNo') or 1).zfill(4)}",
            "createdAt": d.get("createdAt").isoformat() if isinstance(d.get("createdAt"), datetime) else str(d.get("createdAt")),
            "service": d.get("productLine", "Unknown"),
            "assigneeName": assignee_name
        })
        
    return results


@router.post("/{lead_id}/duplicate")
def duplicate_lead(
    lead_id: str,
    req: DuplicateLeadRequest,
    current_user=Depends(get_current_user)
):
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Ensure leadNo is preserved from the original lead
    lead_no = lead.get("leadNo")
    if not lead_no:
        max_lead = db.leads.find_one(sort=[("leadNo", -1)])
        lead_no = (max_lead.get("leadNo") or 0) + 1 if max_lead else 1
        db.leads.update_one({"_id": lead["_id"]}, {"$set": {"leadNo": lead_no}})

    new_lead = dict(lead)
    new_lead.pop("_id", None)
    new_lead["leadNo"] = lead_no
    
    new_lead["productLine"] = req.productLine
    new_lead["ownerId"] = ObjectId(req.ownerId)
    new_lead["leadStatus"] = "NEW"
    new_lead["createdAt"] = datetime.now(timezone.utc)
    new_lead["updatedAt"] = datetime.now(timezone.utc)
    new_lead["createdBy"] = current_user["_id"]
    
    if req.comments:
        new_lead["notes"] = req.comments
        
    new_service = {
        "productLine": req.productLine,
        "assignTo": str(req.ownerId),
        "leadStatus": "NEW",
        "leadQuality": "1",
        "source": lead.get("source", "WEBSITE"),
        "comments": req.comments or ""
    }
    new_lead["services"] = [new_service]
    
    result = db.leads.insert_one(new_lead)
    new_id = str(result.inserted_id)
    
    # Audit log
    db.activities.insert_one({
        "leadId": ObjectId(lead_id),
        "userId": ObjectId(current_user["_id"]),
        "type": "SYSTEM",
        "body": f"Duplicated lead for service {req.productLine}. New Lead ID: {new_id}",
        "createdAt": datetime.now(timezone.utc)
    })
    
    db.activities.insert_one({
        "leadId": ObjectId(new_id),
        "userId": ObjectId(current_user["_id"]),
        "type": "SYSTEM",
        "body": f"Lead created by duplication from original Lead ID: {lead_id} with service {req.productLine}",
        "createdAt": datetime.now(timezone.utc)
    })
    
    if req.comments:
        db.notes.insert_one({
            "leadId": ObjectId(new_id),
            "body": req.comments,
            "sendToClient": req.sendEmail,
            "sendToAssigned": True,
            "sendToStaff": False,
            "sendToOthers": False,
            "createdAt": datetime.now(timezone.utc),
            "createdBy": ObjectId(current_user["_id"]),
            "creatorName": current_user.get("name", "Unknown User")
        })
        
    if req.followupType:
        db.activities.insert_one({
            "leadId": ObjectId(new_id),
            "userId": ObjectId(current_user["_id"]),
            "type": req.followupType,
            "subject": f"Scheduled {req.followupType}",
            "outcome": "Follow Up Later",
            "body": req.comments or f"Scheduled followup for service {req.productLine}",
            "createdAt": datetime.now(timezone.utc)
        })
        
    return {"message": "Lead duplicated successfully", "id": new_id}


# Temporary startup debug dump
try:
    import json
    from bson import json_util
    leads = list(db.leads.find().sort("createdAt", -1).limit(5))
    debug_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "lead_debug.txt")
    with open(debug_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(leads, default=json_util.default, indent=2))
    print(f"SUCCESS: Wrote {len(leads)} leads to lead_debug.txt")
except Exception as e:
    print(f"Error in startup debug dump: {e}")
