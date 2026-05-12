from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from jose import jwt, JWTError
from app.core.config import settings
import contextvars

# Global context variable to store the tenant_id for the current request
tenant_context = contextvars.ContextVar("tenant_id", default=None)

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                tenant_id = payload.get("tenant_id")
                if tenant_id:
                    # Set the context variable
                    tenant_context.set(tenant_id)
            except JWTError:
                pass # Handled by actual auth dependencies, this is just to extract context
        
        response = await call_next(request)
        return response

def get_current_tenant_id() -> str | None:
    """Helper function to get the current tenant ID inside repositories"""
    return tenant_context.get()
