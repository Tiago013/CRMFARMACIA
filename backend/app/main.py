from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from contextlib import asynccontextmanager
from app.core.middleware import TenantIsolationMiddleware
from app.core.redis import init_redis_pool, close_redis_pool, get_redis_client
from app.modules.inventory.routers import router as inventory_router
from app.modules.crm.routers import router as crm_router
from app.modules.sales.routers import router as sales_router
from app.modules.analytics.routers import router as analytics_router
from app.modules.ai.routers import router as ai_router
from app.modules.communications.routers import router as comm_router
from app.modules.forecasting.routers import router as forecast_router
from app.modules.compliance.routers import router as compliance_router
from app.modules.platform.routers import router as platform_router
from app.modules.mobile.routers import router as mobile_router
from app.modules.pos.routers import router as pos_router
from app.modules.finance.routers import router as finance_router
from app.modules.procurement.routers import router as procurement_router
from app.modules.suppliers.routers import router as suppliers_router
from app.modules.billing.routers import router as billing_router
from app.modules.saas.routers import router as saas_router
import time
import logging
from fastapi.responses import JSONResponse

# Structured Logging Configuration (Observability)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("farmaai.core")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connection pools, etc.
    await init_redis_pool()
    app.state.redis = get_redis_client()
    yield
    # Shutdown: Close connections
    await close_redis_pool()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware (Crucial for SaaS frontend interaction)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant Isolation Middleware
app.add_middleware(TenantIsolationMiddleware)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # OWASP Security Headers (CSP, XSS, Clickjacking)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none'"
    
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for Observability and Alerting.
    Tracks unhandled exceptions before returning 500.
    """
    logger.error(f"Unhandled Exception at {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "path": request.url.path}
    )

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for AWS Target Groups and Docker Healthchecks.
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0"
    }

# Include routers
app.include_router(inventory_router, prefix=settings.API_V1_STR)
app.include_router(crm_router, prefix=settings.API_V1_STR)
app.include_router(sales_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(comm_router, prefix=settings.API_V1_STR)
app.include_router(forecast_router, prefix=settings.API_V1_STR)
app.include_router(compliance_router, prefix=settings.API_V1_STR)
app.include_router(platform_router, prefix=settings.API_V1_STR)
app.include_router(mobile_router, prefix=settings.API_V1_STR)
app.include_router(pos_router, prefix=settings.API_V1_STR)
app.include_router(finance_router, prefix=settings.API_V1_STR)
app.include_router(procurement_router, prefix=settings.API_V1_STR)
app.include_router(suppliers_router, prefix=settings.API_V1_STR)
app.include_router(billing_router, prefix=settings.API_V1_STR)
app.include_router(saas_router, prefix=settings.API_V1_STR)
