from fastapi import APIRouter, BackgroundTasks, Request
from app.modules.communications.schemas import WhatsAppMessageRequest, WhatsAppMessageResponse
from app.modules.communications.services import WhatsAppService

router = APIRouter(prefix="/communications", tags=["Communications"])
wa_service = WhatsAppService()

@router.post("/whatsapp/send", response_model=WhatsAppMessageResponse)
async def send_whatsapp_message(request: WhatsAppMessageRequest, background_tasks: BackgroundTasks):
    """
    Envía un mensaje o plantilla de WhatsApp de forma síncrona/asíncrona.
    """
    # En un caso real, la llamada a WS Cloud API podría ser lenta. 
    # Aquí lo simulamos rápido, pero podríamos encolarlo (BackgroundTasks o Celery)
    return await wa_service.send_message(request)

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Recibe eventos de WhatsApp Cloud API (mensajes entrantes, read receipts, etc).
    """
    payload = await request.json()
    background_tasks.add_task(wa_service.process_webhook, payload)
    return {"status": "ok"}

@router.get("/whatsapp/webhook")
async def verify_webhook(request: Request):
    """
    Endpoint para verificación inicial requerida por Facebook/Meta.
    """
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == "farmaai_secret_token_123":
        return int(params.get("hub.challenge", 0))
    return "Invalid verification token"
