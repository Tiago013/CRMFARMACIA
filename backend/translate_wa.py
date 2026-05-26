import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modules.integrations.odoo.whatsapp import OdooWhatsAppService

async def translate_templates():
    service = OdooWhatsAppService("tenant_123")
    await service.transport.authenticate()
    
    updates = {
        6: { # Sale Order
            "name": "Pedido de Venta",
            "body": "Hola {{1}},\n\n¡Felicidades! Su pedido *{{2}}* de *{{3}}* ha sido confirmado por un total de *{{4}}{{5}}*.\n\nPara rastrear su pedido: {{6}}\n\nGracias."
        },
        3: { # Payment Receipt
            "name": "Recibo de Pago",
            "body": "Estimado(a) {{1}},\n\nAquí tiene su recibo de pago *{{2}}* de *{{3}}* por un monto de *{{4}}{{5}}*.\n\nGracias por su pago.\n\nSaludos cordiales."
        },
        4: { # Invoice
            "name": "Factura",
            "body": "Estimado(a) {{1}},\n\nAquí tiene su factura *{{2}}* de *{{3}}* por un total de *{{4}}{{5}}*.\nPara revisar su factura o pagar en línea: {{6}}\n\nGracias."
        },
        2: { # Payment Link
            "name": "Enlace de Pago",
            "body": "Hola {{1}},\n\nUse el siguiente enlace para pagar *{{2}}{{3}}* a *{{4}}*.\n{{5}}\n\nPor favor, no comparta capturas de pantalla del pago por aquí.\n\nGracias."
        }
    }
    
    for t_id, data in updates.items():
        try:
            res = await service.transport.execute_kw(
                model="whatsapp.template",
                method="write",
                args=[[t_id], data]
            )
            print(f"Updated template {t_id}: {res}")
        except Exception as e:
            print(f"Failed to update template {t_id}: {e}")

if __name__ == "__main__":
    asyncio.run(translate_templates())
