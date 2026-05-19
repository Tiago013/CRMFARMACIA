from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.local_db import query_all, query_one
from app.modules.crm.schemas import PatientCreate, PatientResponse, TimelineEventCreate
import uuid
import json

router = APIRouter(prefix="/crm", tags=["crm"])

@router.post("/patients")
async def create_patient(patient: PatientCreate):
    return {"status": "success", "id": str(uuid.uuid4())}

@router.get("/patients")
async def search_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
):
    """
    Lista pacientes REALES desde la base de datos SQLite.
    Soporta búsqueda por nombre, apellido o cédula.
    """
    if search:
        rows = query_all("""
            SELECT id, first_name, last_name, phone, document_id, status,
                   last_purchase_date, preferences, tags, ltv, segment
            FROM patients
            WHERE first_name LIKE ? OR last_name LIKE ? OR document_id LIKE ?
            ORDER BY last_name
            LIMIT ? OFFSET ?
        """, (f"%{search}%", f"%{search}%", f"%{search}%", limit, skip))
    else:
        rows = query_all("""
            SELECT id, first_name, last_name, phone, document_id, status,
                   last_purchase_date, preferences, tags, ltv, segment
            FROM patients
            ORDER BY last_name
            LIMIT ? OFFSET ?
        """, (limit, skip))

    # Parse JSON fields
    for row in rows:
        try:
            row["preferences"] = json.loads(row.get("preferences", "{}"))
        except (json.JSONDecodeError, TypeError):
            row["preferences"] = {}
        try:
            row["tags"] = json.loads(row.get("tags", "[]"))
        except (json.JSONDecodeError, TypeError):
            row["tags"] = []

    return rows

@router.get("/patients/{patient_id}")
async def get_patient_profile(patient_id: str):
    """
    Obtiene el perfil completo de un paciente con su historial de compras.
    """
    patient = query_one("SELECT * FROM patients WHERE id = ?", (patient_id,))
    if not patient:
        return {"error": "Paciente no encontrado"}

    # Parse JSON
    try:
        patient["preferences"] = json.loads(patient.get("preferences", "{}"))
    except (json.JSONDecodeError, TypeError):
        patient["preferences"] = {}
    try:
        patient["tags"] = json.loads(patient.get("tags", "[]"))
    except (json.JSONDecodeError, TypeError):
        patient["tags"] = []

    # Get purchase history
    purchases = query_all("""
        SELECT s.id, s.created_at as date, s.grand_total, p.brand_name, si.quantity, si.unit_price_at_sale
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE s.patient_id = ?
        ORDER BY s.created_at DESC
    """, (patient_id,))

    patient["purchase_history"] = purchases

    # Chart Data: Monthly totals
    chart_rows = query_all("""
        SELECT strftime('%Y-%m', created_at) as month, SUM(grand_total) as gasto
        FROM sales
        WHERE patient_id = ?
        GROUP BY month
        ORDER BY month
    """, (patient_id,))
    
    # Format months for chart
    months_map = {"01":"Ene", "02":"Feb", "03":"Mar", "04":"Abr", "05":"May", "06":"Jun", "07":"Jul", "08":"Ago", "09":"Sep", "10":"Oct", "11":"Nov", "12":"Dic"}
    chart_data = [{"name": months_map.get(row["month"].split("-")[1], ""), "gasto": row["gasto"]} for row in chart_rows]
    patient["chart_data"] = chart_data

    # Timeline (sales + mock communications)
    timeline = []
    for s in purchases[:5]:
        timeline.append({
            "id": s["id"], "type": "sale", "title": "Compra POS", 
            "date": s["date"], "desc": f"{s['brand_name']} x{s['quantity']}", 
            "icon": "ShoppingCart", "color": "bg-emerald-500"
        })
    # Add a mock message
    if timeline:
        timeline.append({
            "id": "msg-1", "type": "wa", "title": "Mensaje Enviado",
            "date": timeline[0]["date"], "desc": "Recordatorio de recompra enviado.",
            "icon": "MessageCircle", "color": "bg-[#25D366]"
        })
    patient["timeline"] = timeline
    
    # Calculate score based on LTV
    patient["score"] = min(100, int((patient.get("ltv", 0) / 1000000) * 100) + 40)

    return patient

@router.post("/patients/{patient_id}/notes")
async def add_patient_note(patient_id: str, note: str):
    return {"status": "success"}
