"""
Augment POS - Main FastAPI Application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.proxy_headers import ProxyHeadersMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.routers import (
    auth, products, sales, reports, users,
    vendors, customers_new, purchases, views, raw_materials, day_counters,
    expenses, manufacturing, product_variants, dashboard, oil_cake_sales,
    product_categories
)
from app.config import settings, cors_origins
from app.database import engine
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Initialize Sentry for error tracking (only in production)
if settings.ENVIRONMENT == "production":
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN if hasattr(settings, "SENTRY_DSN") and settings.SENTRY_DSN else None,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,  # 10% of transactions
        environment=settings.ENVIRONMENT,
    )

# Initialize rate limiter
# Use Redis in production if REDIS_URL is set, otherwise use memory
redis_url = getattr(settings, "REDIS_URL", "")
if redis_url and settings.ENVIRONMENT == "production":
    storage_uri = redis_url
    logger.info(f"Using Redis for rate limiting: {redis_url.split('@')[-1] if '@' in redis_url else 'configured'}")
else:
    storage_uri = "memory://"
    if settings.ENVIRONMENT == "production":
        logger.warning("Using memory:// for rate limiting. Set REDIS_URL for production scalability.")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000/hour", "100/minute"],
    storage_uri=storage_uri,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}",
            "retry_after": exc.retry_after
        },
        headers={"Retry-After": str(exc.retry_after)} if exc.retry_after else {}
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Augment POS API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"CORS Origins: {cors_origins}")
    
    # Test database connection
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Augment POS API...")

# Note: Database tables are created via Alembic migrations
# Run: alembic upgrade head

app = FastAPI(
    title="Augment POS API",
    description="Production-ready Point of Sale system with FastAPI, PostgreSQL, and JWT authentication",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Proxy Headers Middleware - MUST be first to trust Cloudflare/Traefik headers
# This allows FastAPI to correctly detect HTTPS from proxy headers
app.add_middleware(
    ProxyHeadersMiddleware,
    trusted_hosts="*"
)

# CORS middleware - MUST be added before other middleware to handle OPTIONS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Configured via CORS_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],  # Includes OPTIONS
    allow_headers=["*"],
    expose_headers=["*"],
)

# Request logging middleware (after CORS so OPTIONS are handled first)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    # Log CORS-related headers for debugging
    origin = request.headers.get("origin")
    if origin:
        logger.debug(f"CORS request from origin: {origin}")
    
    # OPTIONS requests should be handled by CORS middleware
    # If they reach here, let them pass through
    if request.method == "OPTIONS":
        response = await call_next(request)
        # Log CORS response headers
        if origin:
            logger.debug(f"CORS preflight response - Access-Control-Allow-Origin: {response.headers.get('access-control-allow-origin', 'NOT SET')}")
        return response
    
    import time
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response


# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(reports.router)
app.include_router(users.router)

# New routers for comprehensive schema
app.include_router(vendors.router)
app.include_router(customers_new.router)
app.include_router(raw_materials.router)
app.include_router(purchases.router)
app.include_router(views.router)
app.include_router(day_counters.router)
app.include_router(expenses.router)
app.include_router(manufacturing.router)
app.include_router(product_variants.router)
app.include_router(dashboard.router)
app.include_router(oil_cake_sales.router)
app.include_router(product_categories.router)

# GST Lookup router
from app.routers import gst_lookup
app.include_router(gst_lookup.router)


@app.get("/")
def read_root():
    """
    Root endpoint - API health check.
    """
    return {
        "message": "Augment POS API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint with database connectivity test.
    """
    try:
        # Test database connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "database": "connected",
                "environment": settings.ENVIRONMENT,
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e) if settings.ENVIRONMENT != "production" else "Database connection failed",
            }
        )