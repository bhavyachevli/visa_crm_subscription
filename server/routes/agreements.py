import os
import shutil
import pathlib
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/agreements", tags=["agreements"])
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "public", "uploads", "agreements")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── File validation constants ────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("")
async def upload_agreement(
    region: str = Form(...),
    kind: str = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
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
    target_dir = os.path.join(UPLOAD_DIR, region, kind)
    os.makedirs(target_dir, exist_ok=True)
    
    file_path = os.path.join(target_dir, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc = {
        "region": region,
        "kind": kind,
        "originalFileName": file.filename,
        "storedPath": f"agreements/{region}/{kind}/{safe_filename}",
        "createdAt": datetime.now(timezone.utc)
    }
    db.agreementUploads.insert_one(doc)
    return {"message": "Agreement uploaded"}

@router.get("")
def get_agreements(region: str = None, current_user = Depends(get_current_user)):
    query = {}
    if region:
        query["region"] = region
    cursor = db.agreementUploads.find(query).sort("createdAt", -1)
    agreements = []
    for a in cursor:
        a["_id"] = str(a["_id"])
        agreements.append(a)
    return agreements
