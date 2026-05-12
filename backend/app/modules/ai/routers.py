from fastapi import APIRouter
from app.modules.ai.schemas import AIProfileContext
from app.modules.ai.services import AIService

router = APIRouter(prefix="/ai", tags=["Artificial Intelligence"])
ai_service = AIService()

@router.get("/patient/{patient_id}", response_model=AIProfileContext)
async def get_patient_ai_context(patient_id: str):
    """
    Obtiene insights, recomendaciones y alertas inteligentes para un paciente específico.
    Utiliza caché para no re-inferir constantemente.
    """
    return await ai_service.get_patient_ai_context(patient_id)
