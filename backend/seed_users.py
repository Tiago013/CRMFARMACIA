"""
Seed default users for the RBAC system.
Creates admin, regente, and cajero accounts if they don't exist.
"""
import sqlite3
import uuid
from pathlib import Path
from passlib.context import CryptContext

DB_PATH = Path(__file__).parent / "farmaai_local.db"
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

USERS = [
    {
        "email": "admin@saludvital.com",
        "password": "admin123",
        "first_name": "Admin",
        "last_name": "Salud Vital",
        "role": "admin",
    },
    {
        "email": "cajero1@saludvital.com",
        "password": "cajero123",
        "first_name": "Cajero 1",
        "last_name": "Salud Vital",
        "role": "cajero",
    },
    {
        "email": "cajero2@saludvital.com",
        "password": "cajero123",
        "first_name": "Cajero 2",
        "last_name": "Salud Vital",
        "role": "cajero",
    },
]


def seed_users():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    for user in USERS:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (user["email"],)).fetchone()
        if existing:
            print(f"  ⏭️  Usuario ya existe: {user['email']} ({user['role']})")
            continue
        
        user_id = str(uuid.uuid4())
        hashed = pwd_context.hash(user["password"])
        
        conn.execute(
            """INSERT INTO users (id, tenant_id, email, hashed_password, first_name, last_name, role, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (user_id, "tenant_001", user["email"], hashed, user["first_name"], user["last_name"], user["role"]),
        )
        print(f"  ✅ Usuario creado: {user['email']} / {user['password']} (rol: {user['role']})")
    
    conn.commit()
    conn.close()
    print("\n🔐 Usuarios RBAC listos.")


if __name__ == "__main__":
    print("🔐 Sembrando usuarios de prueba...")
    seed_users()
