from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from jose import jwt, JWTError
from app.core.config import settings
import contextvars

# Global context variables to store the tenant_id and branch_id for the current request
tenant_context = contextvars.ContextVar("tenant_id", default=None)
branch_context = contextvars.ContextVar("branch_id", default=None)

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract Tenant ID from token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                tenant_id = payload.get("tenant_id")
                if tenant_id:
                    tenant_context.set(tenant_id)
            except JWTError:
                pass # Handled by actual auth dependencies, this is just to extract context
        
        # Extract Branch ID from header
        branch_id = request.headers.get("X-Branch-ID")
        if branch_id:
            branch_context.set(branch_id)
            
        response = await call_next(request)
        return response

def get_current_tenant_id() -> str | None:
    """Helper function to get the current tenant ID inside repositories"""
    return tenant_context.get()

def get_current_branch_id() -> str | None:
    """Helper function to get the current branch ID inside repositories"""
    return branch_context.get()
