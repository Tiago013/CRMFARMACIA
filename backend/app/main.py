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
    
    # Setup Event Bus Listeners
    try:
        from app.modules.crm.listeners import setup_crm_listeners
        from app.modules.inventory.listeners import setup_inventory_listeners
        from app.modules.integrations.odoo.listeners import setup_odoo_listeners
        setup_crm_listeners()
        setup_inventory_listeners()
        setup_odoo_listeners()
    except Exception as e:
        logger.warning(f"Event listener setup skipped: {e}")
        
    # Background Odoo Sync Loop
    import asyncio
    async def odoo_sync_loop():
        from app.modules.integrations.odoo.service import OdooIntegrationService
        import httpx
        while True:
            await asyncio.sleep(60) # Sync every 60 seconds
            try:
                import sqlite3
                from app.core.local_db import DB_PATH
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT tenant_id FROM integration_configs WHERE provider = 'odoo'")
                tenants = cursor.fetchall()
                conn.close()
                
                for row in tenants:
                    tenant_id = row[0]
                    service = OdooIntegrationService(tenant_id)
                    await service.pull_initial_inventory()
                    # await service.pull_historical_sales() # Skipping to avoid API errors since not fully implemented
                logger.info("Auto-sync from Odoo completed for all tenants")
            except httpx.HTTPStatusError as he:
                if he.response.status_code == 429:
                    logger.warning("Odoo rate limit active. Waiting for next cycle.")
                else:
                    logger.warning(f"Auto-sync HTTP error: {he}")
            except Exception as e:
                logger.error(f"Auto-sync loop error: {e}")

    sync_task = asyncio.create_task(odoo_sync_loop())
    
    yield
    
    sync_task.cancel()
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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+",
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
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:8002 http://localhost:8003 http://192.168.1.106:8000; object-src 'none'"
    
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
    "app.modules.integrations.routers",
]

for router_module in routers_to_load:
    router = load_router(router_module)
    if router:
        app.include_router(router, prefix=settings.API_V1_STR)
        logger.info(f"Loaded router from {router_module}")
