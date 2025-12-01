from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
import os
import re


class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost:5432/posdb",
        description="PostgreSQL database connection URL"
    )
    JWT_SECRET_KEY: str = Field(
        default="",
        description="JWT secret key for token signing (required in production)"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, ge=1, description="Access token expiration in minutes")
    
    # CORS settings
    CORS_ORIGINS: str = Field(
        default="*",
        description="Comma-separated list of allowed origins, or '*' for all"
    )
    
    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, or production"
    )
    
    # Monitoring
    SENTRY_DSN: str = Field(
        default="",
        description="Sentry DSN for error tracking (optional)"
    )
    
    # Redis (optional, for rate limiting)
    REDIS_URL: str = Field(
        default="",
        description="Redis connection URL for rate limiting (optional, defaults to memory://)"
    )
    
    # Supabase configuration
    SUPABASE_URL: str = Field(
        default="",
        description="Supabase project URL (required for Supabase Auth)"
    )
    SUPABASE_JWT_SECRET: str = Field(
        default="",
        description="Supabase JWT secret for token verification (found in Supabase Dashboard > Settings > API)"
    )

    @field_validator('ENVIRONMENT')
    @classmethod
    def validate_environment(cls, v):
        allowed = ['development', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of: {', '.join(allowed)}")
        return v
    
    @field_validator('DATABASE_URL')
    @classmethod
    def validate_database_url(cls, v, info):
        # Basic validation - check if it looks like a database URL
        if not v or not (v.startswith('postgresql://') or v.startswith('postgresql+asyncpg://')):
            if info.data.get('ENVIRONMENT') == 'production':
                raise ValueError(
                    "DATABASE_URL must be a valid PostgreSQL connection string in production. "
                    "Format: postgresql+asyncpg://user:password@host:port/database"
                )
        return v
    
    @field_validator('CORS_ORIGINS')
    @classmethod
    def validate_cors_origins(cls, v, info):
        if info.data.get('ENVIRONMENT') == 'production':
            if v == "*":
                raise ValueError(
                    "CORS_ORIGINS cannot be '*' in production! "
                    "Specify exact origins: CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com"
                )
            # Validate origin format
            origins = [origin.strip() for origin in v.split(",")]
            for origin in origins:
                if not (origin.startswith('http://') or origin.startswith('https://')):
                    raise ValueError(
                        f"Invalid CORS origin format: {origin}. "
                        "Must start with http:// or https://"
                    )
        return v
    
    @field_validator('SENTRY_DSN')
    @classmethod
    def validate_sentry_dsn(cls, v, info):
        if info.data.get('ENVIRONMENT') == 'production' and v:
            # Basic validation - Sentry DSN should start with https://
            if not v.startswith('https://'):
                raise ValueError(
                    "SENTRY_DSN must be a valid Sentry DSN URL starting with https://"
                )
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Comprehensive validation on startup
def validate_settings():
    """Validate all critical settings based on environment."""
    errors = []
    warnings = []
    
    # JWT Secret validation
    if not settings.JWT_SECRET_KEY or settings.JWT_SECRET_KEY == "supersecretkey":
        if settings.ENVIRONMENT == "production":
            errors.append(
                "JWT_SECRET_KEY must be set in production! "
                "Set it in your .env file or environment variables."
            )
        else:
            warnings.append(
                "JWT_SECRET_KEY is using default value. This is insecure for production!"
            )
    elif len(settings.JWT_SECRET_KEY) < 32 and settings.ENVIRONMENT == "production":
        warnings.append(
            "JWT_SECRET_KEY is too short. Use at least 32 characters for production."
        )
    
    # Database URL validation
    if settings.ENVIRONMENT == "production":
        if "localhost" in settings.DATABASE_URL or "127.0.0.1" in settings.DATABASE_URL:
            warnings.append(
                "DATABASE_URL appears to point to localhost. "
                "Ensure this is correct for production."
            )
    
    # CORS validation
    if settings.ENVIRONMENT == "production":
        if settings.CORS_ORIGINS == "*":
            errors.append(
                "CORS_ORIGINS cannot be '*' in production! "
                "Specify exact origins for security."
            )
    
    # Sentry validation
    if settings.ENVIRONMENT == "production" and not settings.SENTRY_DSN:
        warnings.append(
            "SENTRY_DSN is not set. Error tracking will not work in production."
        )
    
    # Raise errors if any
    if errors:
        raise ValueError("\n".join([f"❌ {e}" for e in errors]))
    
    # Log warnings
    if warnings:
        import warnings as warnings_module
        for warning in warnings:
            warnings_module.warn(warning, UserWarning)

# Run validation
validate_settings()

# Parse CORS origins
if settings.CORS_ORIGINS == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]

# Add localhost origins for development
# Always add localhost if:
# 1. Not in production, OR
# 2. CORS_ORIGINS contains placeholder values (development scenario)
localhost_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# Check if CORS_ORIGINS contains placeholder/development values
is_development_cors = any(
    placeholder in settings.CORS_ORIGINS.lower() 
    for placeholder in ["yourdomain.com", "localhost", "127.0.0.1", "*"]
)

# Add localhost if not in production OR if using development CORS settings
if settings.ENVIRONMENT != "production" or is_development_cors:
    # Merge with existing origins, avoiding duplicates
    for origin in localhost_origins:
        if origin not in cors_origins and cors_origins != ["*"]:
            cors_origins.append(origin)

