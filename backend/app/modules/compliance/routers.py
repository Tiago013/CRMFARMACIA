from fastapi import APIRouter, Request
from app.modules.compliance.schemas import PrivacyConsentRequest, DataSubjectAccessRequest
from app.core.audit import log_security_event

router = APIRouter(prefix="/compliance", tags=["Security & Compliance"])

@router.post("/consent")
async def register_privacy_consent(request: Request, consent: PrivacyConsentRequest):
    """
    Registra el consentimiento de tratamiento de datos (Habeas Data / GDPR).
    """
    client_host = request.client.host if request.client else "unknown"
    
    # Audit trail
    log_security_event(
        action="PRIVACY_CONSENT_REGISTERED",
        user_id="system", 
        resource=f"patient:{consent.patient_id}",
        details={
            "consent_given": consent.consent_given,
            "policy_version": consent.policy_version,
            "ip_address": client_host
        }
    )
    
    return {"status": "success", "message": "Consentimiento registrado exitosamente."}

@router.post("/dsar")
async def process_dsar(request: DataSubjectAccessRequest):
    """
    Procesa un Data Subject Access Request (exportar o eliminar datos del paciente).
    """
    log_security_event(
        action=f"DSAR_{request.request_type.upper()}_REQUESTED",
        user_id="system",
        resource=f"patient:{request.patient_id}",
        details={"reason": request.reason}
    )
    
    return {"status": "processing", "message": "Solicitud de derechos ARCO en proceso."}
