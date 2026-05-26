from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.local_db import query_all, query_one
from app.modules.crm.schemas import PatientCreate, PatientUpdate, PatientResponse, TimelineEventCreate
from app.modules.auth.dependencies import require_role
import uuid
import json

router = APIRouter(prefix="/crm", tags=["crm"], dependencies=[Depends(require_role(["admin", "regente"]))])

@router.post("/patients")
async def create_patient(patient: PatientCreate):
    from app.core.middleware import get_current_tenant_id
    from app.core.usage import UsageService
    import sqlite3
    from app.core.local_db import DB_PATH
    from app.modules.events.bus import EventBus
    
    tenant_id = get_current_tenant_id() or "tenant_123"
    UsageService.check_limit(tenant_id, "patients")
    
    patient_id = str(uuid.uuid4())
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO patients (id, tenant_id, first_name, last_name, document_id, phone, preferences, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            patient_id, tenant_id, patient.first_name, patient.last_name, 
            patient.document_id, patient.phone, 
            json.dumps(patient.preferences) if patient.preferences else "{}",
            json.dumps(patient.tags) if patient.tags else "[]"
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    # Trigger async sync to Odoo using EventBus
    await EventBus.publish("sync_patient_to_odoo", tenant_id=tenant_id, patient_id=patient_id)
    
    return {"status": "success", "id": patient_id}

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
    from app.core.middleware import get_current_tenant_id
    tenant_id = get_current_tenant_id() or "tenant_123"

    if search:
        rows = query_all("""
            SELECT id, first_name, last_name, phone, document_id, status,
                   last_purchase_date, preferences, tags, ltv, segment
            FROM patients
            WHERE tenant_id = ? AND (first_name LIKE ? OR last_name LIKE ? OR document_id LIKE ?)
            ORDER BY last_name
            LIMIT ? OFFSET ?
        """, (tenant_id, f"%{search}%", f"%{search}%", f"%{search}%", limit, skip))
    else:
        rows = query_all("""
            SELECT id, first_name, last_name, phone, document_id, status,
                   last_purchase_date, preferences, tags, ltv, segment
            FROM patients
            WHERE tenant_id = ?
            ORDER BY last_name
            LIMIT ? OFFSET ?
        """, (tenant_id, limit, skip))

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

@router.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient_update: PatientUpdate):
    """
    Actualiza el perfil de un paciente y sincroniza con Odoo.
    """
    from app.core.middleware import get_current_tenant_id
    import sqlite3
    from app.core.local_db import DB_PATH
    from app.modules.events.bus import EventBus

    tenant_id = get_current_tenant_id() or "tenant_123"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Build update query dynamically
        update_fields = []
        params = []
        for key, value in patient_update.model_dump(exclude_unset=True).items():
            if key in ["preferences", "tags"]:
                value = json.dumps(value)
            update_fields.append(f"{key} = ?")
            params.append(value)
            
        if not update_fields:
            return {"status": "success", "message": "No fields to update"}
            
        params.extend([patient_id, tenant_id])
        query = f"UPDATE patients SET {', '.join(update_fields)}, odoo_sync_status = 'pending' WHERE id = ? AND tenant_id = ?"
        
        cursor.execute(query, tuple(params))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    # Trigger async sync to Odoo using EventBus
    await EventBus.publish("sync_patient_to_odoo", tenant_id=tenant_id, patient_id=patient_id)
    
    return {"status": "success", "id": patient_id}

@router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    """
    Elimina un paciente localmente y solicita su archivado en Odoo.
    """
    from app.core.middleware import get_current_tenant_id
    import sqlite3
    from app.core.local_db import DB_PATH
    from app.modules.events.bus import EventBus

    tenant_id = get_current_tenant_id() or "tenant_123"

    # Fetch to get odoo_partner_id before deleting
    patient = query_one("SELECT odoo_partner_id FROM patients WHERE id = ? AND tenant_id = ?", (patient_id, tenant_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM patients WHERE id = ? AND tenant_id = ?", (patient_id, tenant_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    if patient["odoo_partner_id"]:
        await EventBus.publish("archive_patient_in_odoo", tenant_id=tenant_id, odoo_partner_id=int(patient["odoo_partner_id"]))

    return {"status": "success", "message": "Paciente eliminado"}

@router.get("/patients/{patient_id}")
async def get_patient_profile(patient_id: str):
    """
    Obtiene el perfil completo de un paciente con su historial de compras.
    """
    from app.core.middleware import get_current_tenant_id
    tenant_id = get_current_tenant_id() or "tenant_123"

    patient = query_one("SELECT * FROM patients WHERE id = ? AND tenant_id = ?", (patient_id, tenant_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

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
        WHERE patient_id = ? AND status != 'refunded'
        GROUP BY month
        ORDER BY month
    """, (patient_id,))
    
    # Format months for chart
    months_map = {"01":"Ene", "02":"Feb", "03":"Mar", "04":"Abr", "05":"May", "06":"Jun", "07":"Jul", "08":"Ago", "09":"Sep", "10":"Oct", "11":"Nov", "12":"Dic"}
    chart_data = [{"name": months_map.get(row["month"].split("-")[1], ""), "gasto": row["gasto"]} for row in chart_rows]
    patient["chart_data"] = chart_data

    # Real Timeline (sales + notes + other events)
    timeline = []
    for s in purchases:
        timeline.append({
            "id": s["id"], "type": "sale", "title": "Compra POS", 
            "date": s["date"], "desc": f"{s['brand_name']} x{s['quantity']} (${s['grand_total']})", 
            "icon": "ShoppingCart", "color": "bg-emerald-500"
        })
        
    events = query_all("SELECT id, event_type, event_data, created_at FROM patient_timeline_events WHERE patient_id = ?", (patient_id,))
    for e in events:
        try:
            data = json.loads(e["event_data"])
        except:
            data = {}
        
        icon = "MessageCircle"
        color = "bg-blue-500"
        title = "Evento"
        desc = ""
        
        if e["event_type"] == "note_added":
            title = "Nota Añadida"
            desc = data.get("note", "")
            icon = "FileText"
            color = "bg-amber-500"
        elif e["event_type"] == "whatsapp_sent":
            title = "Mensaje Enviado"
            desc = data.get("message", "")
            icon = "MessageCircle"
            color = "bg-[#25D366]"
            
        timeline.append({
            "id": e["id"], "type": e["event_type"], "title": title,
            "date": e["created_at"], "desc": desc,
            "icon": icon, "color": color
        })
        
    # Sort timeline by date descending
    timeline.sort(key=lambda x: x["date"], reverse=True)
    patient["timeline"] = timeline[:20] # Pagination: First 20
    
    # Calculate Patient Score (0-100)
    # Based on Recency, Value (LTV) and Frequency
    score = 0
    ltv = patient.get("ltv", 0)
    avg_ltv_row = query_one("SELECT AVG(ltv) as avg_ltv FROM patients WHERE ltv > 0")
    avg_ltv = avg_ltv_row["avg_ltv"] if avg_ltv_row and avg_ltv_row["avg_ltv"] else 1
    
    # Value Component (max 40)
    value_score = min(40, (ltv / avg_ltv) * 20)
    
    # Recency Component (max 40)
    recency_score = 0
    if patient.get("last_purchase_date"):
        from datetime import datetime
        try:
            last_date = datetime.strptime(patient["last_purchase_date"].split(" ")[0], "%Y-%m-%d")
            days_since = (datetime.now() - last_date).days
            if days_since <= 15: recency_score = 40
            elif days_since <= 30: recency_score = 30
            elif days_since <= 60: recency_score = 20
            elif days_since <= 90: recency_score = 10
        except:
            pass
            
    # Adherence/Frequency Component (max 20)
    freq_score = 10
    if len(purchases) > 5: freq_score = 20
    elif len(purchases) > 2: freq_score = 15
    
    patient["score"] = int(value_score + recency_score + freq_score)
    
    # Alerts
    alerts = []
    if "alergias" in patient["preferences"] or "allergies" in patient["preferences"]:
        alergias = patient["preferences"].get("alergias", patient["preferences"].get("allergies", []))
        if alergias:
            alerts.append({"type": "critical", "message": f"Alergias registradas: {', '.join(alergias)}", "color": "red"})
            
    if ltv > avg_ltv * 2:
        alerts.append({"type": "opportunity", "message": "Paciente VIP: Oportunidad de Upsell", "color": "blue"})
        
    if patient["score"] < 40 and ltv > 0:
        alerts.append({"type": "warning", "message": "Riesgo Alto de Churn detectado.", "color": "amber"})
        
    patient["alerts"] = alerts

    return patient

@router.post("/patients/{patient_id}/notes")
async def add_patient_note(patient_id: str, note: str):
    from app.core.middleware import get_current_tenant_id
    from fastapi import HTTPException
    import sqlite3
    from app.core.local_db import DB_PATH
    import datetime
    
    tenant_id = get_current_tenant_id() or "t-1"
    user_id = "u-1" # mock user id unless injected
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        event_id = str(uuid.uuid4())
        event_data = json.dumps({"note": note})
        cursor.execute("""
            INSERT INTO patient_timeline_events (id, tenant_id, patient_id, user_id, event_type, event_data)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (event_id, tenant_id, patient_id, user_id, "note_added", event_data))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return {"status": "success", "message": "Nota añadida al timeline."}
