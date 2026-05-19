from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
import asyncio
import json
import logging
from app.core.events import event_bus
from app.core.middleware import get_current_tenant_id

logger = logging.getLogger("farmaai.events")

router = APIRouter(prefix="/events", tags=["Real-time Events"])

@router.get("/stream")
async def event_stream(request: Request):
    """
    Endpoint SSE (Server-Sent Events) para transmitir eventos en tiempo real al frontend.
    """
    tenant_id = get_current_tenant_id()
    if not tenant_id:
        tenant_id = "default" # Fallback if middleware not applied correctly
        
    queue = asyncio.Queue()

    async def put_in_queue(topic: str, payload: dict):
        # Enforce tenant isolation for real-time events
        event_tenant = str(payload.get("tenant_id", ""))
        
        # Only push to queue if event belongs to current tenant
        # or if there is no tenant specified (global event, though rare)
        if event_tenant and event_tenant != str(tenant_id):
            return
            
        await queue.put({
            "event": topic,
            "data": payload
        })

    # List of topics we want to expose to the frontend
    topics = [
        "sale.completed", 
        "inventory.stock_updated", 
        "patient.created", 
        "patient.updated", 
        "expense.registered", 
        "supplier.order_received"
    ]
    
    # Subscribe to all topics
    for topic in topics:
        event_bus.subscribe(topic, put_in_queue)

    async def event_generator():
        try:
            while True:
                # Si el cliente se desconecta, salimos
                if await request.is_disconnected():
                    logger.info(f"Cliente SSE desconectado (tenant: {tenant_id})")
                    break
                    
                try:
                    # Esperar por el próximo evento con un timeout pequeño 
                    # para poder verificar `is_disconnected()` periódicamente
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    
                    # Formato Server-Sent Events (SSE)
                    yield f"event: {event['event']}\n"
                    yield f"data: {json.dumps(event['data'])}\n\n"
                    
                except asyncio.TimeoutError:
                    # Ping keep-alive para mantener la conexión abierta
                    yield ": keep-alive\n\n"
        finally:
            # Cleanup: desuscribirse cuando el cliente cierra la conexión
            for topic in topics:
                event_bus.unsubscribe(topic, put_in_queue)

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable proxy buffering in Nginx
        }
    )
