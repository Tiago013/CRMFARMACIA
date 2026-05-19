from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.modules.analytics.schemas import DashboardSnapshot
from app.modules.analytics.services import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics & BI"])
analytics_service = AnalyticsService()

@router.get("/snapshot", response_model=DashboardSnapshot)
async def get_dashboard_snapshot(db: AsyncSession = Depends(get_db)):
    # Aquí lo simulamos con un dummy para el MVP
    tenant_id = "tenant_123"
    return await analytics_service.get_dashboard_snapshot(db, tenant_id)

@router.get("/reports/top-products")
async def get_top_products():
    """Retorna los 20 productos más vendidos."""
    return await analytics_service.get_top_products()

@router.get("/reports/vip-patients")
async def get_vip_patients():
    """Retorna los 50 pacientes con mayor LTV."""
    return await analytics_service.get_vip_patients()

@router.get("/reports/churn-risk")
async def get_churn_risk():
    """Retorna pacientes crónicos que no han comprado en 30 días."""
    return await analytics_service.get_churn_risk()

@router.get("/reports/stagnant-inventory")
async def get_stagnant_inventory():
    """Retorna inventario estancado sin movimiento en >45 días."""
    return await analytics_service.get_stagnant_inventory()
