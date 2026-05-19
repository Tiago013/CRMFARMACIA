from functools import wraps
from fastapi import HTTPException, Request, Depends
from sqlalchemy.orm import Session
from app.core.usage import UsageService
from app.core.database import get_db

def require_feature(feature_name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, request: Request, db: Session = Depends(get_db), **kwargs):
            # Assuming request.state.user contains the authenticated user
            user = getattr(request.state, "user", None)
            if not user:
                raise HTTPException(status_code=401, detail="No autenticado")
            
            # Tenant ID might be the user's ID or user's tenant_id
            tenant_id = getattr(user, "tenant_id", user.id)
            
            if not UsageService.has_feature(db, tenant_id, feature_name):
                raise HTTPException(status_code=403, detail=f"Tu plan actual no incluye la función: {feature_name}. Actualiza a PRO o ENTERPRISE.")
            
            return await func(*args, request=request, db=db, **kwargs)
        return wrapper
    return decorator
