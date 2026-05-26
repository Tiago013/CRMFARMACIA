import asyncio
from app.modules.integrations.odoo.service import OdooIntegrationService

async def main():
    service = OdooIntegrationService("tenant_123")
    await service.transport.authenticate()
    pnl = await service.get_odoo_pnl()
    print("PNL:", pnl)

asyncio.run(main())
