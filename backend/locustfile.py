from locust import HttpUser, task, between
import uuid

class POSLoadTest(HttpUser):
    wait_time = between(1, 3)

    @task
    def simulate_checkout(self):
        """
        Simulate a cashier performing a checkout operation
        """
        payload = {
            "items": [
                {
                    "product_id": "ASP-100",
                    "quantity": 1,
                    "unit_price": 5.50,
                    "discount": 0.0
                }
            ],
            "payments": [
                {
                    "method": "cash",
                    "amount": 5.50
                }
            ],
            "session_id": "SESSION-123",
            "idempotency_key": f"TEST-{uuid.uuid4().hex}"
        }
        
        self.client.post("/api/v1/pos/checkout", json=payload)
