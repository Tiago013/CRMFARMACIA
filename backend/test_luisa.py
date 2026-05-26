import httpx
import asyncio

async def test():
    # Login to get token
    async with httpx.AsyncClient() as client:
        res = await client.post("http://127.0.0.1:8001/api/v1/auth/login", json={
            "email": "demo@saludvital.com",
            "password": "password123"
        })
        token = res.json().get("access_token")
        print("Token:", token)
        
        # Now hit records
        headers = {"Authorization": f"Bearer {token}"}
        r = await client.get("http://127.0.0.1:8001/api/v1/communications/whatsapp/e23a5d88-a1fd-4253-bf7a-8db716f99a79/records", headers=headers)
        print("Status Code:", r.status_code)
        print("Response:", r.json())

if __name__ == "__main__":
    asyncio.run(test())
