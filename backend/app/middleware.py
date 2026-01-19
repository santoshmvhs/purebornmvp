"""
Middleware for rate limiting and security.
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from app.config import settings

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000/hour", "100/minute"],  # Default limits
    storage_uri="memory://",  # In-memory storage (use Redis in production)
)

# Rate limit configurations per endpoint
RATE_LIMITS = {
    "auth": ["5/minute"],  # Stricter limits for auth endpoints
    "default": ["100/minute"],
    "reports": ["30/minute"],  # Reports can be resource-intensive
}

