import asyncio
import json
from typing import Callable, Dict, List, Any
import logging

logger = logging.getLogger("farmaai.events")

class EventBus:
    """
    Motor de Event-Driven Architecture (EDA) en memoria.
    En la próxima fase evolutiva, esto será reemplazado por un cliente
    de Apache Kafka, AWS SQS o RabbitMQ.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, topic: str, callback: Callable):
        if topic not in self._subscribers:
            self._subscribers[topic] = []
        self._subscribers[topic].append(callback)
        logger.info(f"Suscrito al tópico: {topic}")

    def unsubscribe(self, topic: str, callback: Callable):
        if topic in self._subscribers and callback in self._subscribers[topic]:
            self._subscribers[topic].remove(callback)
            logger.info(f"Desuscrito del tópico: {topic}")

    async def publish(self, topic: str, payload: dict):
        """
        Publica un Domain Event para ser consumido asíncronamente por otros módulos de forma inmediata.
        """
        logger.info(f"Publicando evento inmediato '{topic}': {json.dumps(payload)}")
        self._dispatch_event(topic, payload)

    def publish_on_commit(self, session, topic: str, payload: dict):
        """
        Encola un evento para ser emitido solo después del commit de la sesión de DB.
        """
        if "pending_events" not in session.info:
            session.info["pending_events"] = []
        session.info["pending_events"].append({"topic": topic, "payload": payload})
        logger.debug(f"Evento '{topic}' encolado para emitir tras commit.")

    def dispatch_pending_events(self, session):
        """
        Despacha todos los eventos encolados en la sesión. Se debe llamar desde un after_commit.
        """
        pending_events = session.info.pop("pending_events", [])
        for event in pending_events:
            logger.info(f"Publicando evento post-commit '{event['topic']}': {json.dumps(event['payload'])}")
            self._dispatch_event(event["topic"], event["payload"])

    def clear_pending_events(self, session):
        """
        Limpia los eventos encolados en la sesión. Se debe llamar desde un after_rollback.
        """
        session.info.pop("pending_events", None)
        logger.debug("Eventos pendientes descartados tras rollback.")

    def _dispatch_event(self, topic: str, payload: dict):
        if topic in self._subscribers:
            for callback in self._subscribers[topic]:
                # Fire and forget
                asyncio.create_task(self._safe_execute(callback, topic, payload))

    async def _safe_execute(self, callback: Callable, topic: str, payload: dict):
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(topic, payload)
            else:
                callback(topic, payload)
        except Exception as e:
            logger.error(f"Error procesando evento asíncrono '{topic}': {str(e)}", exc_info=True)

# Instancia global del Event Bus para el Monolito Modular
event_bus = EventBus()
