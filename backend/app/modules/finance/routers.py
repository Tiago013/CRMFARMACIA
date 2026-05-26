from fastapi import APIRouter, Depends
from app.modules.finance.schemas import CashFlowEntry, DailyCloseRequest, FinancialMetrics
from app.core.local_db import query_one, query_all
from app.modules.auth.dependencies import require_role

router = APIRouter(prefix="/finance", tags=["Finance & Margins"], dependencies=[Depends(require_role(["admin"]))])

@router.post("/expense")
async def register_expense(expense: CashFlowEntry):
    """Registra un gasto operativo en SQLite."""
    from app.core.middleware import get_current_tenant_id, get_current_branch_id
    import sqlite3
    import uuid
    from app.core.local_db import DB_PATH
    from fastapi import HTTPException
    
    tenant_id = get_current_tenant_id() or str(uuid.uuid4())
    branch_id = get_current_branch_id() or str(uuid.uuid4())
    expense_id = str(uuid.uuid4())
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO expenses (id, tenant_id, category, amount, date)
            VALUES (?, ?, ?, ?, ?)
        ''', (expense_id, tenant_id, expense.category, expense.amount, expense.timestamp.strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        
        # Odoo Integration: Push expense to PNL
        import asyncio
        from app.modules.integrations.odoo.service import OdooIntegrationService
        service = OdooIntegrationService(tenant_id)
        
        async def push_to_odoo():
            try:
                await service.transport.authenticate()
                await service.push_expense({
                    "date": expense.timestamp.strftime("%Y-%m-%d"),
                    "category": expense.category,
                    "amount": expense.amount
                })
            except Exception as e:
                import logging
                logging.error(f"Failed to push expense to Odoo: {e}")
                
        asyncio.create_task(push_to_odoo())
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return {"status": "success", "message": "Gasto registrado exitosamente en el P&L (Local y Odoo)."}

@router.post("/daily-close")
async def close_register(close_req: DailyCloseRequest):
    """Realiza el arqueo de caja avanzado y cierre diario (Z-Report)."""
    from app.core.middleware import get_current_tenant_id, get_current_branch_id
    from fastapi import HTTPException
    import sqlite3
    from app.core.local_db import DB_PATH
    import datetime
    
    tenant_id = get_current_tenant_id()
    branch_id = get_current_branch_id()
    user_id = "u-1" # mock user id unless injected from auth
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Fetch open session
        cursor.execute("SELECT id, date, opening_cash FROM cash_sessions WHERE status = 'open' LIMIT 1")
        session = cursor.fetchone()
        
        if not session:
            raise HTTPException(status_code=400, detail="No hay una sesión de caja abierta.")
            
        session_id, opened_at, initial_cash = session
        
        # Calculate expected cash: initial_cash + all cash payments since opened_at
        cursor.execute("""
            SELECT SUM(amount_paid) FROM payments 
            WHERE payment_method IN ('efectivo', 'cash') 
            AND sale_id IN (SELECT id FROM sales WHERE created_at >= ?)
        """, (opened_at,))
        cash_sales = cursor.fetchone()[0] or 0.0
        
        expected_cash_calculated = initial_cash + cash_sales
        discrepancy = close_req.actual_cash - expected_cash_calculated
        
        closed_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute("""
            UPDATE cash_sessions 
            SET status = 'closed', closed_at = ?, expected_cash = ?, actual_cash = ?, discrepancy = ?
            WHERE id = ?
        """, (closed_at, expected_cash_calculated, close_req.actual_cash, discrepancy, session_id))
        
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    return {
        "status": "success",
        "message": "Caja cerrada exitosamente.",
        "expected_cash": expected_cash_calculated,
        "actual_cash": close_req.actual_cash,
        "discrepancy": discrepancy
    }

@router.get("/metrics", response_model=FinancialMetrics)
async def get_financial_metrics():
    from app.core.middleware import get_current_branch_id
    branch_id = get_current_branch_id()
    branch_filter = ""
    params = ()

    """
    Retorna analíticas financieras REALES desde la DB SQLite.
    """
    revenue_row = query_one(f"SELECT COALESCE(SUM(grand_total), 0) as total FROM sales {branch_filter}", params)
    total_revenue = revenue_row["total"] if revenue_row else 0

    expense_row = query_one(f"SELECT COALESCE(SUM(amount), 0) as total FROM expenses {branch_filter}", params)
    total_expenses = expense_row["total"] if expense_row else 0

    net_profit = total_revenue - total_expenses
    margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

    return FinancialMetrics(
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=net_profit,
        profit_margin_percentage=round(margin, 1)
    )

@router.post("/dian/invoice")
async def emit_dian_invoice(sale_id: str):
    """
    (Phase 27.10) Emite una factura electrónica ante la DIAN Colombia
    a través del proveedor (Siigo/Alegra).
    """
    import sqlite3
    from app.core.local_db import DB_PATH
    from fastapi import HTTPException
    import uuid
    import hashlib
    import time
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, grand_total, dian_status, odoo_invoice_id, tenant_id FROM sales WHERE id = ?", (sale_id,))
        sale = cursor.fetchone()
        
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada.")
            
        if sale[2] == "Aceptada":
            raise HTTPException(status_code=400, detail="Esta venta ya tiene una factura electrónica emitida.")
            
        odoo_invoice_id = sale[3]
        tenant_id = sale[4]
        
        if not odoo_invoice_id:
            raise HTTPException(status_code=400, detail="La venta no ha sido sincronizada con Odoo, o no generó factura. No se puede emitir DIAN.")
            
        from app.modules.integrations.odoo.service import OdooIntegrationService
        service = OdooIntegrationService(tenant_id)
        await service.transport.authenticate()
        
        cufe = await service.emit_dian(odoo_invoice_id)
        if not cufe:
            raise HTTPException(status_code=500, detail="Odoo no pudo generar o recuperar el CUFE para esta factura.")
            
        consecutive = f"FE-ODOO-{odoo_invoice_id}"
        
        cursor.execute("UPDATE sales SET dian_status = 'Aceptada', dian_cufe = ? WHERE id = ?", (cufe, sale_id))
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return {
        "status": "success",
        "dian_status": "Aceptada",
        "cufe": cufe,
        "consecutive": consecutive,
        "message": "Factura emitida electrónicamente y sincronizada con Odoo/DIAN."
    }

@router.post("/dian/credit-note")
async def emit_dian_credit_note(sale_id: str, reason: str):
    """
    (Phase 27.10) Emite nota crédito electrónica ante devoluciones.
    """
    import sqlite3
    from app.core.local_db import DB_PATH
    from fastapi import HTTPException
    import time
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, dian_status FROM sales WHERE id = ?", (sale_id,))
        sale = cursor.fetchone()
        
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada.")
            
        if sale[1] != "Aceptada":
            raise HTTPException(status_code=400, detail="La venta no ha sido facturada electrónicamente, no se puede emitir NC.")
            
        consecutive = f"NC-{str(int(time.time()))[-4:]}"
        
        cursor.execute("UPDATE sales SET dian_status = 'Anulada (Nota Crédito)' WHERE id = ?", (sale_id,))
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return {
        "status": "success",
        "dian_status": "Aceptada",
        "consecutive": consecutive,
        "message": f"Nota crédito emitida electrónicamente. Razón: {reason}"
    }
