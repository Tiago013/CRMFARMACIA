import asyncio
from loguru import logger
from app.workers.odoo_sync import sync_patient_to_odoo, archive_patient_in_odoo

class EventBus:
    _pool = None

    @classmethod
    async def publish(cls, topic: str, **kwargs):
        """
        Executes background tasks locally using asyncio instead of Redis/Arq.
        """
        logger.info(f"Event published locally: {topic} with payload {kwargs}")
        
        # We mock the ctx object that Arq normally passes
        ctx = {}
        
        if topic == "sync_patient_to_odoo":
            asyncio.create_task(sync_patient_to_odoo(ctx, **kwargs))
        elif topic == "archive_patient_in_odoo":
            asyncio.create_task(archive_patient_in_odoo(ctx, **kwargs))
        else:
            logger.warning(f"Unknown topic: {topic}")

