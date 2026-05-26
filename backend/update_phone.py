import httpx
import asyncio
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService

async def test():
    service = OdooWhatsAppService('tenant_123')
    await service.transport.authenticate()
    
    partner_id = 15
    res = await service.transport.execute_kw(
        model="res.partner",
        method="write",
        args=[[partner_id], {"phone": "+573001234567"}]
    )
    print("Updated phone for Luisa in Odoo:", res)

if __name__ == "__main__":
    asyncio.run(test())
