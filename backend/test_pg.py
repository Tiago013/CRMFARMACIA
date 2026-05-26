import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def f():
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text('SELECT 1'))
            print('SUCCESS')
    except Exception as e:
        print(f"FAILED: {e}")

asyncio.run(f())
