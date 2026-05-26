import asyncio
import sys
sys.path.append('c:/Users/santi/Downloads/CRMFARMAIA/backend')
from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService

async def test():
    service = OdooWhatsAppService('tenant_123')
    await service.transport.authenticate()
    
    sale = await service.transport.execute_kw('sale.order', 'read', [[6]], {'fields': ['name', 'partner_id']})
    print('Sale 6:', sale)

asyncio.run(test())
