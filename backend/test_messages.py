import asyncio
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService

async def test():
    service = OdooWhatsAppService('tenant_123')
    await service.transport.authenticate()
    
    msgs = await service.transport.execute_kw(
        model="mail.message",
        method="search_read",
        args=[[("message_type", "=", "whatsapp_message")]],
        kwargs={"fields": ["id", "body", "date", "author_id", "message_type", "model", "res_id", "partner_ids"], "limit": 10}
    )
    for m in msgs:
        print(m)

if __name__ == "__main__":
    asyncio.run(test())
