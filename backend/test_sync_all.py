import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.service import OdooIntegrationService

async def main():
    print("Iniciando sincronización masiva desde Odoo...")
    service = OdooIntegrationService("tenant_123")
    
    try:
        await service.pull_initial_inventory()
        await service.pull_historical_sales()
        print("✅ Sincronización masiva exitosa!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
