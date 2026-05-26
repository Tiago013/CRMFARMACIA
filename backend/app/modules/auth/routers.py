from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decrypt_api_key
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
from fastapi import Request
from app.core.redis import get_redis_client
from app.core.security import pwd_context
import httpx

async def authenticate_with_odoo(email: str, password: str, tenant_id: str):
    """Authenticates the user against Odoo and retrieves their role."""
    # Get Odoo config for this tenant
    config = query_one("SELECT url, db_name FROM integration_configs WHERE tenant_id = ? AND provider = 'odoo' AND is_active = 1", (tenant_id,))
    if not config:
        # Fallback to the default config if tenant is not found
        config = query_one("SELECT url, db_name FROM integration_configs WHERE provider = 'odoo' AND is_active = 1 LIMIT 1")
    
    if not config:
        return None
        
    url = config["url"].rstrip('/')
    db = config["db_name"]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Authenticate to get UID
        auth_payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "service": "common",
                "method": "authenticate",
                "args": [db, email, password, {}]
            },
            "id": str(uuid.uuid4())
        }
        
        auth_res = await client.post(f"{url}/jsonrpc", json=auth_payload)
        auth_data = auth_res.json()
        
        uid = auth_data.get("result")
        if not uid:
            return None # Auth failed
            
        # 2. Get User Groups to map Roles
        read_payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "service": "object",
                "method": "execute_kw",
                "args": [db, uid, password, "res.users", "read", [[uid]], {"fields": ["name", "groups_id"]}]
            },
            "id": str(uuid.uuid4())
        }
        
        read_res = await client.post(f"{url}/jsonrpc", json=read_payload)
        read_data = read_res.json()
        user_info = read_data.get("result", [{}])[0]
        
        # 3. Read groups to find out if they are admin
        groups_ids = user_info.get("groups_id", [])
        role = "admin" # Default Odoo users to admin as requested
        
        if groups_ids:
            group_payload = {
                "jsonrpc": "2.0",
                "method": "call",
                "params": {
                    "service": "object",
                    "method": "execute_kw",
                    "args": [db, uid, password, "res.groups", "read", [groups_ids], {"fields": ["name", "full_name"]}]
                },
                "id": str(uuid.uuid4())
            }
            group_res = await client.post(f"{url}/jsonrpc", json=group_payload)
            groups = group_res.json().get("result", [])
            
            group_names = [g.get("full_name", "").lower() for g in groups]
            
            # If they explicitly only have POS user groups and NO admin groups, we can downgrade them,
            # but for now, we leave them as admin per user request.
                
        # Handle First/Last name
        parts = user_info.get("name", "").split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""
        
        return {
            "uid": uid,
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "tenant_id": tenant_id if config else "211e3e3d-10bf-4092-8897-6290aa6dc17d"
        }

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, request: Request):
    """Authenticate user with Odoo (email + password), return JWT tokens."""
    redis = get_redis_client()
    ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"login_attempts:{ip}"
    
    # 1. Rate Limiting Check
    if redis:
        attempts = int(redis.get(rate_limit_key) or 0)
        if attempts >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Bloqueado por 15 minutos."
            )
            
    # Check if user exists locally to get their assigned tenant
    local_user = query_one("SELECT id, tenant_id FROM users WHERE email = ?", (req.email,))
    tenant_id = local_user["tenant_id"] if local_user else "211e3e3d-10bf-4092-8897-6290aa6dc17d"
    
    # 2. Authenticate directly against Odoo!
    odoo_auth = await authenticate_with_odoo(req.email, req.password, tenant_id)
    
    if not odoo_auth:
        # HYBRID DEMO FALLBACK: If it's a test account from saludvital.com, try local DB
        is_valid_local = False
        if req.email.endswith("@saludvital.com") and local_user:
            full_user = query_one("SELECT * FROM users WHERE id = ?", (local_user["id"],))
            if full_user:
                is_valid_local = verify_password(req.password, full_user["hashed_password"])
                
        if is_valid_local:
            # We bypass Odoo and mock the odoo_auth object using local data
            full_user = query_one("SELECT * FROM users WHERE id = ?", (local_user["id"],))
            odoo_auth = {
                "uid": 9999,
                "first_name": full_user.get("first_name", ""),
                "last_name": full_user.get("last_name", ""),
                "role": full_user.get("role", "cajero"),
                "tenant_id": tenant_id
            }
        else:
            # Increment Rate Limit
            if redis:
                redis.incr(rate_limit_key)
                if redis.ttl(rate_limit_key) == -1:
                    redis.expire(rate_limit_key, 900) # 15 minutes
                    
            # Audit Log (Failed)
            with get_sqlite() as conn:
                conn.execute(
                    "INSERT INTO audit_log (id, tenant_id, user_id, action, target_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), tenant_id, local_user["id"] if local_user else None, "login_failed", "auth", ip, request.headers.get("user-agent", ""))
                )
                conn.commit()
                
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas en Odoo ERP y localmente.",
            )
    
    # Reset Rate Limit
    if redis:
        redis.delete(rate_limit_key)
        
    # 3. Synchronize user in local SQLite DB
    user_id = local_user["id"] if local_user else str(uuid.uuid4())
    
    with get_sqlite() as conn:
        if local_user:
            conn.execute(
                "UPDATE users SET first_name = ?, last_name = ?, role = ? WHERE id = ?",
                (odoo_auth["first_name"], odoo_auth["last_name"], odoo_auth["role"], user_id)
            )
        else:
            # Create a placeholder for new users authenticated in Odoo but missing locally
            hashed_pw = get_password_hash("ODOO_AUTH_ONLY")
            conn.execute(
                """INSERT INTO users (id, tenant_id, email, hashed_password, first_name, last_name, role, is_active)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
                (user_id, tenant_id, req.email, hashed_pw, odoo_auth["first_name"], odoo_auth["last_name"], odoo_auth["role"])
            )
        conn.commit()
    
    # 4. Generate tokens
    access_token = create_access_token(
        subject=user_id,
        tenant_id=tenant_id,
        role=odoo_auth["role"],
    )
    refresh_token = create_refresh_token(
        subject=user_id,
        jti=str(uuid.uuid4()),
    )
    
    tenant_info = query_one("SELECT plan FROM pharmacies WHERE id = ?", (tenant_id,))
    
    user_data = {
        "id": user_id,
        "email": req.email,
        "first_name": odoo_auth["first_name"],
        "last_name": odoo_auth["last_name"],
        "role": odoo_auth["role"],
        "tenant_id": tenant_id,
        "plan": tenant_info["plan"] if tenant_info else "STARTER"
    }
    
    # Audit Log (Success)
    with get_sqlite() as conn:
        conn.execute(
            "INSERT INTO audit_log (id, tenant_id, user_id, action, target_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), tenant_id, user_id, "login_success", "auth", ip, request.headers.get("user-agent", ""))
        )
        conn.commit()
    
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


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(req: RefreshRequest):
    """Refresh tokens using a valid refresh token."""
    redis = get_redis_client()
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token no es de tipo refresh.")
            
        jti = payload.get("jti")
        user_id = payload.get("sub")
        
        if redis and redis.get(f"blacklist:{jti}"):
            raise HTTPException(status_code=401, detail="Refresh token ha sido revocado.")
            
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado.")
        
    user = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if not user or not user.get("is_active", 1):
        raise HTTPException(status_code=403, detail="Usuario no encontrado o cuenta desactivada.")
        
    # Blacklist old refresh token
    if redis and jti:
        # Assuming we don't know the exact expiration time left, we can set a safe TTL (e.g. 7 days)
        redis.setex(f"blacklist:{jti}", 7 * 24 * 3600, "1")
        
    # Generate new tokens
    access_token = create_access_token(
        subject=user["id"],
        tenant_id=user.get("tenant_id", ""),
        role=user.get("role", "cajero"),
    )
    new_refresh_token = create_refresh_token(
        subject=user["id"],
        jti=str(uuid.uuid4()),
    )
    
    tenant_info = query_one("SELECT plan FROM pharmacies WHERE id = ?", (user.get("tenant_id", ""),))
    
    user_data = {
        "id": user["id"],
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "cajero"),
        "tenant_id": user.get("tenant_id", ""),
        "plan": tenant_info["plan"] if tenant_info else "STARTER"
    }
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=user_data,
    )

@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
):
    """Logout (blacklist the current access token)."""
    if credentials:
        token = credentials.credentials
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # Assuming access token might not have jti, we can blacklist the token itself or its exp
            exp = payload.get("exp", 0)
            now = int(datetime.now().timestamp())
            ttl = exp - now
            
            redis = get_redis_client()
            if redis and ttl > 0:
                redis.setex(f"blacklist:{token}", ttl, "1")
        except JWTError:
            pass
            
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
    """Create a new user (admin only). Note: Passwords must now be managed in Odoo."""
    # Check limit
    from app.core.usage import UsageService
    tenant_id = current_user.get("tenant_id", "tenant_001")
    UsageService.check_limit(tenant_id, "users")

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
    hashed = get_password_hash("ODOO_AUTH_ONLY")
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
    """Update user role, name, or status (admin only). Roles may be overridden by Odoo at next login."""
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
    
    return {"detail": "Usuario actualizado. (Nota: Los roles se sincronizarán con Odoo en su próximo inicio de sesión).", "user_id": user_id}


@router.put("/users/{user_id}/password")
async def change_password(
    user_id: str,
    req: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change password is now disabled in FarmaAI because Odoo is the source of truth."""
    raise HTTPException(status_code=403, detail="Las contraseñas ahora se administran exclusivamente desde el sistema ERP de Odoo. Por favor cambie su contraseña en Odoo.")
