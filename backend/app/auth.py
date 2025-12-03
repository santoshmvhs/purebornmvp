from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.config import settings
from app.database import get_db
from app.models import User

# Configure password hashing with bcrypt
# Use bcrypt directly instead of passlib for better compatibility
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__default_rounds=12,
    bcrypt__truncate_error=True  # Truncate passwords longer than 72 bytes
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    Bcrypt has a 72-byte limit, so we truncate if necessary.
    """
    if not plain_password or not hashed_password:
        return False
    
    # Bcrypt has a 72-byte limit, truncate if necessary
    # Convert to bytes to check length accurately
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError) as e:
        # Log the error but don't expose it to prevent information leakage
        return False


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    ))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.username == username)
    )
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
    user = await get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def verify_supabase_token(token: str) -> Optional[dict]:
    """
    Verify a Supabase JWT token.
    Returns the payload if valid, None otherwise.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if not settings.SUPABASE_JWT_SECRET:
        logger.warning("SUPABASE_JWT_SECRET is not set - cannot verify Supabase tokens")
        return None
    
    try:
        # Try decoding with audience="authenticated" first (standard Supabase JWT)
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        logger.info("Supabase token decoded successfully with audience='authenticated'")
        return payload
    except JWTError as e:
        # Try without audience check (some Supabase tokens might not have audience)
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            logger.info("Supabase token decoded successfully without audience check")
            return payload
        except JWTError as e2:
            logger.warning(f"Supabase token verification failed: {e} (with audience), {e2} (without audience)")
            return None


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    # OPTIONS requests should be handled by CORS middleware before reaching here
    # If they do reach here, we need to handle them gracefully
    # However, this should not happen if CORS is configured correctly
    
    import logging
    logger = logging.getLogger(__name__)
    
    # Try to get token from Authorization header first, then from cookie
    if token is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]
        else:
            token = request.cookies.get("access_token")
    
    if token is None:
        logger.warning("No token found in Authorization header or cookies")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Log token info (but don't log the full token for security)
    token_preview = token[:20] + "..." if len(token) > 20 else token
    logger.info(f"Token received (length: {len(token)}, starts with: {token_preview}, is_jwt_format: {len(token.split('.')) == 3})")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try Supabase JWT first
    logger.info(f"SUPABASE_JWT_SECRET is set: {bool(settings.SUPABASE_JWT_SECRET)}, length: {len(settings.SUPABASE_JWT_SECRET) if settings.SUPABASE_JWT_SECRET else 0}")
    
    supabase_payload = verify_supabase_token(token)
    if supabase_payload:
        logger.info(f"Supabase token verified successfully, email: {supabase_payload.get('email')}")
        # Supabase token is valid, get user by email
        email = supabase_payload.get("email")
        if email:
            # Try to find user by email (assuming email is stored in username field or we have an email field)
            # For now, we'll try to find by email in username field
            result = await db.execute(
                select(User).where(User.username == email)
            )
            user = result.scalar_one_or_none()
            if user:
                logger.info(f"User found in database: {user.username}")
                return user
            # If user not found, try to find by email if we have an email column
            # For now, raise exception - user needs to exist in our database
            logger.warning(f"Supabase user {email} not found in database")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found in system. Please contact administrator."
            )
    else:
        logger.warning("Supabase token verification failed or SUPABASE_JWT_SECRET not set, trying regular JWT")
    
    # Fall back to our own JWT verification
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user

