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
    # En producción real, el tenant_id vendrá del Middleware/ContextVar
    # Aquí lo simulamos con un dummy para el MVP
    tenant_id = "tenant_123"
    return await analytics_service.get_dashboard_snapshot(db, tenant_id)
