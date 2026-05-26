import requests
import json
import uuid

url = "http://127.0.0.1:8001/api/v1/pos/checkout"
headers = {
    "Content-Type": "application/json"
}

payload = {
    "items": [
        {
            "product_id": "prod_54f31300",
            "quantity": 1,
            "unit_price": 12.0
        }
    ],
    "payments": [
        {
            "method": "card",
            "amount": 12.0
        }
    ],
    "patient_id": "38d836d6-be62-4d7e-8474-6b62839ef2a1",
    "session_id": "test_session",
    "idempotency_key": str(uuid.uuid4())
}

# The endpoint expects POSCheckoutRequest which requires session_id etc.
# Note: The endpoint requires `current_user` from Depends(get_current_user)
# So it will fail with 401 Unauthorized unless I mock auth or provide a token.
# To bypass this for a quick test, I can just see if it returns 401.

resp = requests.post(url, json=payload, headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.text)
