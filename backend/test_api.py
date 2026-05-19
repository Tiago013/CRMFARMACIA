"""Quick test to verify all API endpoints work correctly."""
import urllib.request
import json

BASE = "http://127.0.0.1:8000/api/v1"

def test(name, url):
    try:
        r = urllib.request.urlopen(url)
        data = json.loads(r.read())
        if isinstance(data, list):
            print(f"[OK] {name}: {len(data)} items")
        elif isinstance(data, dict):
            keys = list(data.keys())[:5]
            print(f"[OK] {name}: keys={keys}")
        return data
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
        return None

# 1. Health
test("Health", "http://127.0.0.1:8000/health")

# 2. Patients
patients = test("CRM Patients", f"{BASE}/crm/patients?limit=3")
if patients and len(patients) > 0:
    p = patients[0]
    print(f"       -> {p['first_name']} {p['last_name']} | LTV={p.get('ltv',0)} | Seg={p.get('segment','')}")
    
    # 3. Patient profile
    pid = p["id"]
    profile = test("Patient Profile", f"{BASE}/crm/patients/{pid}")
    if profile:
        print(f"       -> Purchases: {len(profile.get('purchase_history',[]))}")
        print(f"       -> Chart data: {len(profile.get('chart_data',[]))}")
        print(f"       -> Timeline: {len(profile.get('timeline',[]))}")
        print(f"       -> Score: {profile.get('score',0)}")

# 4. Inventory
test("Inventory", f"{BASE}/inventory/products?limit=3")

# 5. Sales
test("Sales", f"{BASE}/sales")

# 6. Finance
test("Finance Dashboard", f"{BASE}/finance/dashboard")

# 7. Login test
import urllib.request
req = urllib.request.Request(
    f"{BASE}/auth/login",
    data=json.dumps({"email": "admin@saludvital.com", "password": "admin123"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    r = urllib.request.urlopen(req)
    data = json.loads(r.read())
    print(f"[OK] Login: token={data['access_token'][:20]}... role={data['user']['role']}")
except Exception as e:
    print(f"[FAIL] Login: {e}")

print("\n--- Test complete ---")
