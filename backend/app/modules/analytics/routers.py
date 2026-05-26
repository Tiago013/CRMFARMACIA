from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.database import get_db
from app.modules.analytics.schemas import DashboardSnapshot
from app.modules.analytics.services import AnalyticsService
from app.modules.auth.dependencies import require_role

router = APIRouter(prefix="/analytics", tags=["Analytics & BI"], dependencies=[Depends(require_role(["admin", "regente"]))])
analytics_service = AnalyticsService()

@router.get("/snapshot-test")
async def get_dashboard_snapshot_test(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
):
    print("TEST ENDPOINT HIT!")
    return await analytics_service.get_dashboard_snapshot(db, "tenant_123", period)

@router.get("/snapshot", response_model=DashboardSnapshot)
async def get_dashboard_snapshot(
    period: str = Query("7d", regex="^(7d|month|quarter|year)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard snapshot con filtros por período y variaciones porcentuales reales.
    Períodos válidos: 7d, month, quarter, year.
    """
    print("BACKEND WAS HIT BY FRONTEND!!!", flush=True)
    from app.core.middleware import get_current_tenant_id
    tenant_id = get_current_tenant_id() or "tenant_123"
    return await analytics_service.get_dashboard_snapshot(db, tenant_id, period)

@router.get("/odoo-pnl")
async def get_odoo_pnl_data(
    period: str = Query("7d", regex="^(7d|month|quarter|year)$")
):
    """Retorna la utilidad neta contable oficial desde Odoo ERP."""
    from app.core.middleware import get_current_tenant_id
    from app.modules.integrations.odoo.service import OdooIntegrationService
    tenant_id = get_current_tenant_id() or "tenant_123"
    service = OdooIntegrationService(tenant_id)
    return await service.get_odoo_pnl(period)

@router.get("/reports/top-products")
async def get_top_products():
    """Retorna los 20 productos más vendidos."""
    return await analytics_service.get_top_products()

@router.get("/reports/vip-patients")
async def get_vip_patients():
    """Retorna los 50 pacientes con mayor LTV."""
    try:
        return await analytics_service.get_vip_patients()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise

@router.get("/reports/churn-risk")
async def get_churn_risk():
    """Retorna pacientes crónicos que no han comprado en 30 días."""
    return await analytics_service.get_churn_risk()

@router.get("/reports/stagnant-inventory")
async def get_stagnant_inventory():
    """Retorna inventario estancado sin movimiento en >45 días."""
    return await analytics_service.get_stagnant_inventory()

@router.get("/sales-by-date")
async def get_sales_by_date(date: str = Query(...)):
    """Retorna la lista de ventas de un día específico (MM-DD o YYYY-MM-DD)."""
    from app.core.local_db import query_all
    # The frontend sends '05-20' etc. We try to match the end of the date.
    rows = query_all(f"""
        SELECT id, strftime('%H:%M', created_at) as time, grand_total as total, method as payment_method
        FROM sales
        WHERE date(created_at) LIKE ?
        ORDER BY created_at DESC
    """, (f"%{date}",))
    return [{"id": r["id"], "time": r["time"], "total": r["total"], "payment_method": r["payment_method"] or 'cash'} for r in rows]

@router.post("/reports/custom")
async def run_custom_report(
    payload: dict = Body(..., example={"dimensions": ["categoria"], "metrics": ["ventas_totales"]}),
):
    """
    Generador dinámico de reportes.
    Dimensiones permitidas: fecha, mes, categoria, producto, paciente, metodo_pago, sucursal.
    Métricas permitidas: ventas_totales, cantidad_ventas, unidades_vendidas, ticket_promedio, margen_bruto.
    """
    dimensions = payload.get("dimensions", [])
    metrics = payload.get("metrics", [])
    return await analytics_service.run_custom_report(dimensions, metrics)
