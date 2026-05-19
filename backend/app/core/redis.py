import redis.asyncio as redis
from app.core.config import settings
import logging

logger = logging.getLogger("farmaai.redis")

# Global Redis pool
redis_client = None

async def init_redis_pool():
    global redis_client
    try:
        redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        await redis_client.ping()
        logger.info("Redis conectado exitosamente.")
    except Exception as e:
        logger.warning(f"Redis no disponible ({e}). El sistema funcionará sin caché ni eventos en tiempo real.")
        redis_client = None

async def close_redis_pool():
    global redis_client
    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass

def get_redis_client():
    return redis_client
