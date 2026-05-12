from fastapi import APIRouter
from app.modules.saas.schemas import TenantSettings

router = APIRouter(prefix="/saas", tags=["SaaS Core"])

@router.get("/settings", response_model=TenantSettings)
async def get_tenant_settings():
    """
    Obtiene la configuración y feature flags del tenant activo (Farmacia).
    """
    return TenantSettings(
        theme_color="#4F46E5",
        logo_url="/logo_default.png",
        feature_flags={
            "enable_ai_forecasting": True,
            "enable_whatsapp_crm": True,
            "advanced_pos": True
        }
    )
