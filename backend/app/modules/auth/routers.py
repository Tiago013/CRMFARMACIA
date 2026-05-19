"""
Authentication & User Management Router.
Handles login, token refresh, logout, user profile, and admin user CRUD.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.core.local_db import query_one, query_all, get_sqlite
from app.modules.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class UserCreateRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str = "cajero"  # admin | regente | cajero

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordChangeRequest(BaseModel):
    new_password: str


# ─── Auth Endpoints ─────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Authenticate user with email + password, return JWT tokens."""
    user = query_one("SELECT * FROM users WHERE email = ?", (req.email,))
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
        )
    
    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
        )
    
    if not user.get("is_active", 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacte al administrador.",
        )
    
    # Generate tokens
    access_token = create_access_token(
        subject=user["id"],
        tenant_id=user.get("tenant_id", ""),
        role=user.get("role", "cajero"),
    )
    refresh_token = create_refresh_token(
        subject=user["id"],
        jti=str(uuid.uuid4()),
    )
    
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "cajero"),
        "tenant_id": user.get("tenant_id", ""),
    }
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_data,
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user

@router.get("/branches")
async def list_branches(current_user: dict = Depends(get_current_user)):
    """List all branches for the current tenant."""
    # current_user has tenant_id but SQLite is single DB so we should filter by tenant_id
    # Currently tenant_id is global, but let's query the branches table
    branches = query_all("SELECT id, name, is_active FROM branches WHERE is_active = 1")
    return branches


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (client should discard tokens)."""
    return {"detail": "Sesión cerrada exitosamente."}


# ─── User Management (Admin Only) ──────────────────────────────────────────

@router.get("/users")
async def list_users(current_user: dict = Depends(require_role(["admin"]))):
    """List all users in the tenant (admin only)."""
    users = query_all(
        "SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY created_at DESC"
    )
    return users


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    req: UserCreateRequest,
    current_user: dict = Depends(require_role(["admin"])),
):
    """Create a new user (admin only)."""
    # Check if email already exists
    existing = query_one("SELECT id FROM users WHERE email = ?", (req.email,))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email.",
        )
    
    if req.role not in ("admin", "regente", "cajero"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol inválido. Opciones: admin, regente, cajero.",
        )
    
    user_id = str(uuid.uuid4())
    hashed = get_password_hash(req.password)
    tenant_id = current_user.get("tenant_id", "tenant_001")
    
    with get_sqlite() as conn:
        conn.execute(
            """INSERT INTO users (id, tenant_id, email, hashed_password, first_name, last_name, role, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (user_id, tenant_id, req.email, hashed, req.first_name, req.last_name, req.role),
        )
        conn.commit()
    
    return {
        "id": user_id,
        "email": req.email,
        "first_name": req.first_name,
        "last_name": req.last_name,
        "role": req.role,
        "is_active": True,
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    req: UserUpdateRequest,
    current_user: dict = Depends(require_role(["admin"])),
):
    """Update user role, name, or status (admin only)."""
    user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    if req.role and req.role not in ("admin", "regente", "cajero"):
        raise HTTPException(status_code=400, detail="Rol inválido.")
    
    updates = []
    params = []
    if req.first_name is not None:
        updates.append("first_name = ?")
        params.append(req.first_name)
    if req.last_name is not None:
        updates.append("last_name = ?")
        params.append(req.last_name)
    if req.role is not None:
        updates.append("role = ?")
        params.append(req.role)
    if req.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if req.is_active else 0)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")
    
    params.append(user_id)
    with get_sqlite() as conn:
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    
    return {"detail": "Usuario actualizado.", "user_id": user_id}


@router.put("/users/{user_id}/password")
async def change_password(
    user_id: str,
    req: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change password (own account or admin can change any)."""
    # Users can only change their own password, unless admin
    if current_user["id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo puedes cambiar tu propia contraseña.")
    
    user = query_one("SELECT id FROM users WHERE id = ?", (user_id,))
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    hashed = get_password_hash(req.new_password)
    with get_sqlite() as conn:
        conn.execute("UPDATE users SET hashed_password = ? WHERE id = ?", (hashed, user_id))
        conn.commit()
    
    return {"detail": "Contraseña actualizada exitosamente."}
