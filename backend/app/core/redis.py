import redis.asyncio as redis
from app.core.config import settings

# Global Redis pool
redis_client = None

async def init_redis_pool():
    global redis_client
    redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

async def close_redis_pool():
    global redis_client
    if redis_client:
        await redis_client.close()

def get_redis_client() -> redis.Redis:
    return redis_client
