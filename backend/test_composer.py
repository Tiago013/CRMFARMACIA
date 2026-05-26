import asyncio
import sys
sys.path.append('c:/Users/santi/Downloads/CRMFARMAIA/backend')
from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService

async def test():
    service = OdooWhatsAppService('tenant_123')
    await service.transport.authenticate()
    
    composer_id = await service.transport.execute_kw(
        model='whatsapp.composer',
        method='create',
        args=[{
            'wa_template_id': 6,
            'res_model': 'sale.order',
            'res_ids': '[155]'
        }]
    )
    print('Composer ID string:', composer_id)
    
    composer = await service.transport.execute_kw('whatsapp.composer', 'read', [[composer_id]], {'fields': ['res_ids', 'preview_whatsapp']})
    print('Composer string:', composer)
    
    composer_id2 = await service.transport.execute_kw(
        model='whatsapp.composer',
        method='create',
        args=[{
            'wa_template_id': 6,
            'res_model': 'sale.order',
            'res_ids': '155'
        }]
    )
    print('Composer ID without brackets:', composer_id2)
    composer2 = await service.transport.execute_kw('whatsapp.composer', 'read', [[composer_id2]], {'fields': ['res_ids', 'preview_whatsapp']})
    print('Composer without brackets:', composer2)

asyncio.run(test())
