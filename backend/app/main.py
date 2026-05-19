from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from contextlib import asynccontextmanager
from app.core.middleware import TenantIsolationMiddleware
from app.core.redis import init_redis_pool, close_redis_pool, get_redis_client
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

# Lazy import routers to handle missing modules gracefully
def load_router(module_path, router_name="router"):
    """Safely load a router from a module"""
    try:
        module = __import__(module_path, fromlist=[router_name])
        return getattr(module, router_name)
    except (ImportError, AttributeError) as e:
        logger.warning(f"Could not load router from {module_path}: {e}")
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connection pools, etc.
    try:
        await init_redis_pool()
        app.state.redis = get_redis_client()
    except Exception as e:
        logger.warning(f"Redis init skipped: {e}")
        app.state.redis = None
    yield
    # Shutdown: Close connections
    try:
        await close_redis_pool()
    except Exception:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware (Crucial for SaaS frontend interaction)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.1.106:3000"],
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
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'"
    
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

# Load and include routers dynamically
routers_to_load = [
    "app.modules.inventory.routers",
    "app.modules.crm.routers",
    "app.modules.sales.routers",
    "app.modules.analytics.routers",
    "app.modules.ai.routers",
    "app.modules.communications.routers",
    "app.modules.forecasting.routers",
    "app.modules.compliance.routers",
    "app.modules.platform.routers",
    "app.modules.mobile.routers",
    "app.modules.pos.routers",
    "app.modules.finance.routers",
    "app.modules.procurement.routers",
    "app.modules.suppliers.routers",
    "app.modules.billing.routers",
    "app.modules.saas.routers",
    "app.modules.auth.routers",
    "app.modules.events.routers",
]

for router_module in routers_to_load:
    router = load_router(router_module)
    if router:
        app.include_router(router, prefix=settings.API_V1_STR)
        logger.info(f"Loaded router from {router_module}")
