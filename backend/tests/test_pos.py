import pytest

def test_pos_checkout_success(client):
    """
    Test the critical path for POS Checkout
    """
    payload = {
        "items": [
            {
                "product_id": "ASP-100",
                "quantity": 2,
                "unit_price": 5.50,
                "discount": 0.0
            }
        ],
        "payments": [
            {
                "method": "cash",
                "amount": 11.00
            }
        ],
        "session_id": "SESSION-123",
        "idempotency_key": "test-key-1"
    }

    response = client.post("/api/v1/pos/checkout", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "transaction_id" in data
    assert data["total_amount"] == 11.0

def test_pos_checkout_insufficient_funds(client):
    """
    Test validation of payments
    """
    payload = {
        "items": [
            {
                "product_id": "ASP-100",
                "quantity": 2,
                "unit_price": 5.50,
                "discount": 0.0
            }
        ],
        "payments": [
            {
                "method": "cash",
                "amount": 5.00  # Total is 11.00
            }
        ],
        "session_id": "SESSION-123",
        "idempotency_key": "test-key-2"
    }

    response = client.post("/api/v1/pos/checkout", json=payload)
    
    assert response.status_code == 400
    assert "Monto pagado insuficiente" in response.json()["detail"]
