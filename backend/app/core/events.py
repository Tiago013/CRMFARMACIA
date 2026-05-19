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
        Publica un Domain Event para ser consumido asíncronamente por otros módulos.
        """
        logger.info(f"Publicando evento '{topic}': {json.dumps(payload)}")
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
