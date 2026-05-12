import asyncio
from datetime import datetime
import uuid
from app.modules.communications.schemas import WhatsAppMessageRequest, WhatsAppMessageResponse

class WhatsAppService:
    def __init__(self):
        # En prod: self.api_key = settings.WHATSAPP_API_KEY
        pass

    async def send_message(self, request: WhatsAppMessageRequest) -> WhatsAppMessageResponse:
        """
        Simula el envío de un mensaje a través de WhatsApp Cloud API.
        En producción, usa httpx/axios para pegarle a `graph.facebook.com/vXX.0/PHONE_ID/messages`
        """
        # MOCK: Simulamos latencia de la red de WhatsApp
        await asyncio.sleep(0.3)
        
        message_id = f"wamid.{uuid.uuid4().hex[:16]}"
        
        print(f"[WhatsAppService] Enviando mensaje a {request.phone_number}: {request.message_text or request.template_name}")
        
        return WhatsAppMessageResponse(
            success=True,
            message_id=message_id,
            status="sent",
            timestamp=datetime.now().isoformat()
        )

    async def process_webhook(self, payload: dict) -> bool:
        """
        Procesa el webhook de llegada de WhatsApp.
        Actualiza el estado de los mensajes en la DB (sent, delivered, read) o recibe respuestas.
        """
        print(f"[WhatsAppService] Webhook recibido: {payload}")
        return True
