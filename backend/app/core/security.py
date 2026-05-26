from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt
from typing import Any, Union
from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], tenant_id: str, role: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "tenant_id": str(tenant_id),
        "role": role
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], jti: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "jti": jti, # JWT ID para trackear y revocar
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- Integration Security ---
from cryptography.fernet import Fernet

def get_fernet() -> Fernet:
    """Returns a Fernet instance using the integration encryption key."""
    # Ensure key is valid bytes
    key = settings.INTEGRATION_ENCRYPTION_KEY.encode()
    return Fernet(key)

def encrypt_api_key(plain_api_key: str) -> str:
    """Encrypts an API key for storage in the database."""
    if not plain_api_key:
        return ""
    f = get_fernet()
    return f.encrypt(plain_api_key.encode()).decode()

def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypts an API key retrieved from the database."""
    if not encrypted_api_key:
        return ""
    f = get_fernet()
    return f.decrypt(encrypted_api_key.encode()).decode()
