import asyncio
from httpx import AsyncClient
from app.main import app
from app.modules.pos.schemas import POSCheckoutRequest
import uuid

async def test_checkout():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        req = {
            "items": [
                {
                    "product_id": str(uuid.uuid4()), # We will probably get a 404 for product not found, which means 400 or 404, not 500!
                    "quantity": 1,
                    "unit_price": 10.0,
                    "discount": 0.0
                }
            ],
            "payments": [
                {
                    "method": "cash",
                    "amount": 10.0
                }
            ],
            "patient_id": None,
            "session_id": "SESSION-123",
            "idempotency_key": str(uuid.uuid4())
        }
        
        # We need a valid token to bypass auth. We can mock it or just use the dependency override.
        app.dependency_overrides[app.dependency_overrides.get("get_current_user", None)] = lambda: {"id": str(uuid.uuid4()), "role": "admin", "tenant_id": "tenant_123"}
        from app.modules.auth.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"id": str(uuid.uuid4()), "role": "admin", "tenant_id": "tenant_123"}
        
        res = await ac.post("/api/v1/pos/checkout", json=req)
        print("Status:", res.status_code)
        print("Response:", res.text)

if __name__ == "__main__":
    asyncio.run(test_checkout())
