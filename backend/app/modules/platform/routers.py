from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Dict, Any

router = APIRouter(prefix="/platform", tags=["Public Platform API"])

def verify_api_key(x_api_key: str = Header(...)):
    """Simula validación de API Key para integraciones de Partners B2B."""
    if x_api_key != "farmaai_partner_test_key":
        raise HTTPException(status_code=403, detail="Invalid Partner API Key")
    return True

@router.post("/webhooks/register", dependencies=[Depends(verify_api_key)])
async def register_webhook(target_url: str, event_type: str):
    """
    Permite a terceros (Partners, ERPs) registrar Webhooks para escuchar eventos
    como 'OrderPlaced' o 'InventoryLow'.
    """
    return {
        "status": "success",
        "message": f"Webhook registrado para el evento {event_type}",
        "target_url": target_url
    }

@router.post("/partner/prescriptions", dependencies=[Depends(verify_api_key)])
async def receive_digital_prescription(payload: Dict[str, Any]):
    """
    Endpoint API-First para clínicas u hospitales externos enviando recetas
    médicas directamente a la farmacia (Marketplace/Ecosistema).
    """
    return {
        "status": "received",
        "prescription_id": "rx_1094820",
        "message": "Receta digital ingerida exitosamente al portal de pacientes."
    }
