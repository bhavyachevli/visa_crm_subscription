import os
import shutil
import pathlib
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── File validation constants ────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".xlsx", ".xls"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/case/{case_id}")
async def upload_document(
    case_id: str, 
    name: str = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    case = db.immigration_cases.find_one({"_id": ObjectId(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
    await file.seek(0)

    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    case_dir = os.path.join(UPLOAD_DIR, "cases", case_id)
    os.makedirs(case_dir, exist_ok=True)
    
    file_path = os.path.join(case_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = {
        "caseId": ObjectId(case_id),
        "name": name,
        "originalFileName": file.filename,
        "storedPath": f"cases/{case_id}/{safe_filename}",
        "uploadedAt": datetime.now(timezone.utc),
        "uploadedBy": ObjectId(current_user["_id"])
    }
    db.documents.insert_one(doc)
    return {"message": "Document uploaded"}

@router.get("/case/{case_id}")
def get_documents(case_id: str, current_user = Depends(get_current_user)):
    docs = list(db.documents.find({"caseId": ObjectId(case_id)}).sort("uploadedAt", -1))
    for d in docs:
        d["_id"] = str(d["_id"])
        d["caseId"] = str(d["caseId"])
        d["uploadedBy"] = str(d["uploadedBy"])
    return docs

@router.get("/download/{doc_id}")
def download_document(doc_id: str, current_user = Depends(get_current_user)):
    doc = db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = os.path.join(UPLOAD_DIR, doc["storedPath"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
        
    return FileResponse(path=file_path, filename=doc["originalFileName"])

@router.get("/cases/{case_id}/{filename}")
def serve_case_file(case_id: str, filename: str, current_user=Depends(get_current_user)):
    # Prevent path traversal: resolve final path and ensure it stays within UPLOAD_DIR
    base = pathlib.Path(UPLOAD_DIR).resolve()
    target = (base / "cases" / case_id / filename).resolve()
    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not target.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(path=str(target), filename=filename)

@router.post("/lead/{lead_id}")
async def upload_lead_document(
    lead_id: str,
    name: str = Form(...),
    category: str = Form("Other"),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    lead = db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
    await file.seek(0)

    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    lead_dir = os.path.join(UPLOAD_DIR, "leads", lead_id)
    os.makedirs(lead_dir, exist_ok=True)
    
    file_path = os.path.join(lead_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = {
        "leadId": ObjectId(lead_id),
        "name": name,
        "category": category,
        "originalFileName": file.filename,
        "storedPath": f"leads/{lead_id}/{safe_filename}",
        "uploadedAt": datetime.now(timezone.utc),
        "uploadedBy": ObjectId(current_user["_id"])
    }
    db.documents.insert_one(doc)
    return {"message": "Document uploaded"}

@router.get("/lead/{lead_id}")
def get_lead_documents(lead_id: str, current_user = Depends(get_current_user)):
    docs = list(db.documents.find({"leadId": ObjectId(lead_id)}).sort("uploadedAt", -1))
    for d in docs:
        d["_id"] = str(d["_id"])
        d["leadId"] = str(d["leadId"])
        if "caseId" in d:
            d["caseId"] = str(d["caseId"])
        d["uploadedBy"] = str(d["uploadedBy"])
    return docs

@router.delete("/{doc_id}")
def delete_document(doc_id: str, current_user = Depends(get_current_user)):
    doc = db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Only CEO can delete documents
    if current_user["role"] != "CEO":
        raise HTTPException(status_code=403, detail="Only CEO can delete documents")
    
    file_path = os.path.join(UPLOAD_DIR, doc["storedPath"])
    if os.path.exists(file_path):
        os.remove(file_path)
        
    db.documents.delete_one({"_id": ObjectId(doc_id)})
    return {"message": "Document deleted"}
