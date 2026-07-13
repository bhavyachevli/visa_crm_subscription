from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime, timezone
from utils.db import db
from middleware.auth import get_current_user
from models.schemas import InvoiceCreate, PaymentCreate
from utils.pdf_gen import generate_invoice_pdf

router = APIRouter(prefix="/api/finance", tags=["finance"])

def generate_invoice_number():
    year = datetime.now().year
    count = db.invoices.count_documents({}) + 1
    return f"INV-{year}-{count:05d}"

@router.post("/invoices")
def create_invoice(invoice: InvoiceCreate, current_user = Depends(get_current_user)):
    inv_number = generate_invoice_number()
    
    total_gross = 0
    lines = []
    
    for line in invoice.lines:
        net = line.quantity * line.unitExGst
        gst = net * (line.gstRatePct / 100)
        gross = net + gst
        total_gross += gross
        
        lines.append({
            "description": line.description,
            "quantity": line.quantity,
            "unitExGst": line.unitExGst,
            "gstRatePct": line.gstRatePct,
            "grossAmount": gross
        })
        
    inv_dict = {
        "leadId": ObjectId(invoice.leadId),
        "number": inv_number,
        "status": "DRAFT",
        "currency": invoice.currency,
        "notes": invoice.notes,
        "dueDate": invoice.dueDate,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "createdById": str(current_user["_id"]),
        "totalAmount": total_gross,
        "paidAmount": 0
    }
    
    result = db.invoices.insert_one(inv_dict)
    
    for idx, line in enumerate(lines):
        line["invoiceId"] = result.inserted_id
        line["sortOrder"] = idx
        db.invoiceLines.insert_one(line)
        
    return {"id": str(result.inserted_id), "number": inv_number}

@router.get("/invoices")
def get_all_invoices(current_user = Depends(get_current_user)):
    if current_user["role"] not in ["DIRECTOR", "ADMIN", "FINANCE"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    cursor = db.invoices.find().sort("createdAt", -1)
    invs = []
    for inv in cursor:
        inv_id_str = str(inv["_id"])
        inv["_id"] = inv_id_str
        inv["leadId"] = str(inv["leadId"])
        # Fetch the lines to build a description summary
        lines = list(db.invoiceLines.find({"invoiceId": ObjectId(inv_id_str)}).sort("sortOrder", 1))
        desc_list = [line.get("description", "") for line in lines if line.get("description")]
        inv["description"] = " + ".join(desc_list) if desc_list else "No description"
        invs.append(inv)
    return invs

@router.get("/invoices/lead/{lead_id}")
def get_lead_invoices(lead_id: str, current_user = Depends(get_current_user)):
    cursor = db.invoices.find({"leadId": ObjectId(lead_id)}).sort("createdAt", -1)
    invs = []
    for inv in cursor:
        inv_id_str = str(inv["_id"])
        inv["_id"] = inv_id_str
        inv["leadId"] = str(inv["leadId"])
        # Fetch the lines to build a description summary
        lines = list(db.invoiceLines.find({"invoiceId": ObjectId(inv_id_str)}).sort("sortOrder", 1))
        desc_list = [line.get("description", "") for line in lines if line.get("description")]
        inv["description"] = " + ".join(desc_list) if desc_list else "No description"
        invs.append(inv)
    return invs

@router.post("/invoices/{invoice_id}/payments")
def add_payment(invoice_id: str, payment: PaymentCreate, current_user = Depends(get_current_user)):
    invoice = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice["status"] == "VOID":
        raise HTTPException(status_code=400, detail="Cannot pay void invoice")
        
    pay_dict = {
        "invoiceId": ObjectId(invoice_id),
        "amount": payment.amount,
        "method": payment.method,
        "reference": payment.reference,
        "paidAt": datetime.now(timezone.utc),
        "recordedById": str(current_user["_id"])
    }
    
    db.payments.insert_one(pay_dict)
    
    new_paid = invoice.get("paidAmount", 0) + payment.amount
    status = "PARTIAL"
    if new_paid >= invoice["totalAmount"]:
        status = "PAID"
        
    db.invoices.update_one({"_id": ObjectId(invoice_id)}, {
        "$set": {
            "paidAmount": new_paid,
            "status": status,
            "updatedAt": datetime.now(timezone.utc)
        }
    })
    
    return {"message": "Payment recorded"}

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: str):
    invoice = db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    lead = db.leads.find_one({"_id": invoice["leadId"]})
    lines = list(db.invoiceLines.find({"invoiceId": ObjectId(invoice_id)}).sort("sortOrder", 1))
    
    pdf_buffer = generate_invoice_pdf(invoice, lead, lines)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={invoice['number']}.pdf"}
    )
