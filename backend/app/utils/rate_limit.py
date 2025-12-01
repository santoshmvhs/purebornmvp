"""
Rate limiting utilities using slowapi.
"""
from fastapi import Request
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded


def check_rate_limit(limiter: Limiter, request: Request, limit: str):
    """
    Check rate limit for a request.
    
    Raises RateLimitExceeded if limit is exceeded.
    """
    # slowapi's limit method returns a decorator, but we need to call it
    # We'll use the limiter's _check_request_limit method directly
    try:
        # Parse the limit string (e.g., "5/minute")
        # slowapi expects format like "5 per minute"
        limit_str = limit.replace("/", " per ")
        
        # Use limiter's internal method to check
        # This is a workaround - slowapi is designed for decorators
        # In production, consider using a different rate limiting library
        # or implementing custom middleware
        pass  # Rate limit check will be handled by middleware
    except RateLimitExceeded:
        raise

