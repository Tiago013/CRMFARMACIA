import asyncio
import logging
from app.modules.analytics.services import AnalyticsService

logging.basicConfig(level=logging.INFO)

async def test():
    service = AnalyticsService(tenant_id='tenant_123')
    try:
        res = service.get_analytics_snapshot(period="month")
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
