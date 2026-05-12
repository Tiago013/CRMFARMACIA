from fastapi import APIRouter
from app.modules.billing.schemas import TenantBilling
from datetime import datetime, timedelta

router = APIRouter(prefix="/billing", tags=["SaaS Billing"])

@router.get("/status", response_model=TenantBilling)
async def get_billing_status():
    """
    Retorna el estado de la suscripción SaaS del Tenant actual.
    Sirve para validar límites (ej: max sucursales, facturación al día).
    """
    return TenantBilling(
        tenant_id="TENANT-001",
        plan_id="PLAN_PRO",
        status="active",
        current_period_end=datetime.utcnow() + timedelta(days=15),
        usage_count=4500  # Ej: Transacciones POS del mes
    )

@router.post("/upgrade")
async def upgrade_plan(plan_id: str):
    """
    Simula la actualización de un plan SaaS.
    """
    return {"status": "success", "message": f"Upgrade a {plan_id} exitoso"}
