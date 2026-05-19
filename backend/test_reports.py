import asyncio
import sys
from app.modules.analytics.services import AnalyticsService

async def main():
    service = AnalyticsService()
    
    print("Testing VIP Patients")
    try:
        vip = await service.get_vip_patients()
        print(f"VIP patients count: {len(vip)}")
    except Exception as e:
        print(f"Error VIP: {e}")

    print("Testing Churn Risk")
    try:
        churn = await service.get_churn_risk()
        print(f"Churn risk count: {len(churn)}")
    except Exception as e:
        print(f"Error Churn: {e}")

    print("Testing Stagnant Inventory")
    try:
        stag = await service.get_stagnant_inventory()
        print(f"Stagnant count: {len(stag)}")
    except Exception as e:
        print(f"Error Stagnant: {e}")

if __name__ == '__main__':
    asyncio.run(main())
