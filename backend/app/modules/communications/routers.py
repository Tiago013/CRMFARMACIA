from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.modules.auth.dependencies import get_current_user
from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService
from app.core.local_db import query_one
from pydantic import BaseModel

router = APIRouter(prefix="/communications", tags=["Communications"])

class SendTemplateRequest(BaseModel):
    template_id: int
    res_model: str
    res_id: int

@router.get("/whatsapp/templates")
async def get_whatsapp_templates(current_user: dict = Depends(get_current_user)):
    """Get all approved WhatsApp templates from Odoo."""
    service = OdooWhatsAppService(current_user["tenant_id"])
    templates = await service.get_templates()
    return templates

@router.get("/whatsapp/{patient_id}/messages")
async def get_whatsapp_messages(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Get WhatsApp message history for a patient from Odoo."""
    # First, get the odoo_partner_id of the patient
    patient = query_one("SELECT odoo_partner_id FROM patients WHERE id = ?", (patient_id,))
    if not patient or not patient["odoo_partner_id"]:
        return []
        
    odoo_partner_id = int(patient["odoo_partner_id"])
    service = OdooWhatsAppService(current_user["tenant_id"])
    messages = await service.get_messages(odoo_partner_id)
    return messages

@router.post("/whatsapp/{patient_id}/send-template")
async def send_whatsapp_template(patient_id: str, req: SendTemplateRequest, current_user: dict = Depends(get_current_user)):
    """Send a WhatsApp template to a patient using Odoo."""
    patient = query_one("SELECT odoo_partner_id FROM patients WHERE id = ?", (patient_id,))
    if not patient or not patient["odoo_partner_id"]:
        raise HTTPException(status_code=404, detail="Paciente no sincronizado con Odoo.")
        
    odoo_partner_id = int(patient["odoo_partner_id"])
    service = OdooWhatsAppService(current_user["tenant_id"])
    success = await service.send_template(odoo_partner_id, req.template_id, req.res_model, req.res_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Error enviando plantilla a través de Odoo.")
        
    return {"status": "success", "message": "Plantilla enviada exitosamente."}

@router.get("/whatsapp/{patient_id}/records")
async def get_patient_records(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch recent Sale Orders and Invoices for a patient from Odoo to link to templates."""
    patient = query_one("SELECT odoo_partner_id FROM patients WHERE id = ?", (patient_id,))
    if not patient or not patient["odoo_partner_id"]:
        return {"sales": [], "invoices": []}
        
    service = OdooWhatsAppService(current_user["tenant_id"])
    if not service.transport:
        return {"sales": [], "invoices": []}
        
    try:
        odoo_partner_id = int(patient["odoo_partner_id"])
        # Get Sale Orders
        sales = await service.transport.execute_kw(
            model="sale.order",
            method="search_read",
            args=[[("partner_id", "=", odoo_partner_id)]],
            kwargs={"fields": ["id", "name", "date_order", "amount_total"], "limit": 10, "order": "date_order desc"}
        )
        
        # Get Invoices
        invoices = await service.transport.execute_kw(
            model="account.move",
            method="search_read",
            args=[[("partner_id", "=", odoo_partner_id), ("move_type", "=", "out_invoice")]],
            kwargs={"fields": ["id", "name", "invoice_date", "amount_total"], "limit": 10, "order": "invoice_date desc"}
        )
        
        return {"sales": sales, "invoices": invoices}
    except Exception as e:
        import logging
        logging.error(f"Error fetching patient records from Odoo: {e}")
        return {"sales": [], "invoices": []}
