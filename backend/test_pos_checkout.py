import json
import uuid
import uuid

url = "http://127.0.0.1:8001/api/v1/pos/checkout"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer TEST_TOKEN"
}

payload = {
    "patient_id": "38d836d6-be62-4d7e-8474-6b62839ef2a1",
    "items": [
        {
            "product_id": "prod_54f31300",
            "quantity": 1
        }
    ],
    "payments": [
        {
            "method": "tarjeta",
            "amount": 12.0
        }
    ],
    "idempotency_key": str(uuid.uuid4())
}

# we don't have auth configured for this test script so we will just hit the service directly

import asyncio
from app.modules.sales.schemas import SaleCreate, SaleItemCreate, PaymentCreate
from app.modules.sales.services import CheckoutService

async def test_pos():
    sale_items = [
        SaleItemCreate(product_id="prod_54f31300", quantity=1)
    ]
    sale_payments = [
        PaymentCreate(payment_method="card", amount_paid=12.0)
    ]
    sale_create = SaleCreate(
        patient_id="38d836d6-be62-4d7e-8474-6b62839ef2a1",
        items=sale_items,
        payments=sale_payments,
        idempotency_key=str(uuid.uuid4())
    )
    
    # fake user id
    user_id = uuid.uuid4()
    
    svc = CheckoutService(None)
    try:
        sale = await svc.process_sale(sale_create, user_id)
        print("Success! Sale ID:", sale.id)
    except Exception as e:
        print("Error:", e)
        
asyncio.run(test_pos())
