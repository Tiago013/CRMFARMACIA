import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService

async def test():
    # Use tenant_id 'tenant_123'
    tenant_id = "tenant_123"
    service = OdooWhatsAppService(tenant_id)
    
    if not service.transport:
        print("Transport not initialized!")
        return
        
    print("Testing get_templates()...")
    templates = await service.get_templates()
    print("Templates:", templates)
    
    print("\nTesting get_messages(15)...")
    msgs = await service.get_messages(15)
    print("Messages:", msgs)

    print("\nTesting get_records(12)...") # María Gómez
    try:
        sales = await service.transport.execute_kw(
            model="sale.order",
            method="search_read",
            args=[[]],
            kwargs={"fields": ["id", "name", "date_order", "amount_total", "partner_id"], "limit": 10, "order": "date_order desc"}
        )
        print("All Sales:", sales)
    except Exception as e:
        print("Sales Error:", e)
        
    try:
        invoices = await service.transport.execute_kw(
            model="account.move",
            method="search_read",
            args=[[("move_type", "=", "out_invoice")]],
            kwargs={"fields": ["id", "name", "invoice_date", "amount_total", "partner_id"], "limit": 10, "order": "invoice_date desc"}
        )
        print("All Invoices:", invoices)
    except Exception as e:
        print("Invoices Error:", e)

    print("\nTesting send_template()...")
    # Using partner_id = 12, template_id = 4 (Factura), model="account.move", res_id=16
    success = await service.send_template(odoo_partner_id=12, template_id=4, res_model="account.move", res_id=16)
    print("Send Template Result:", success)

if __name__ == "__main__":
    asyncio.run(test())
