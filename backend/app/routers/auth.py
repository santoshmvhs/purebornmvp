"""
Authentication router for login and user registration.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings

from app.database import get_db
from app.models import User
from app.schemas import Token, UserCreate, UserRead
from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash
)
from app.deps import get_current_admin_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login.
    
    Returns JWT access token in both response body (for compatibility) 
    and httpOnly cookie (for security).
    Rate limited via slowapi middleware (configured in main.py).
    """
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    
    access_token = create_access_token(data={"sub": user.username})
    
    # Set httpOnly cookie for security (prevents XSS attacks)
    # Calculate expiration in seconds
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    
    # Determine if we're in production (use secure cookies)
    is_production = settings.ENVIRONMENT == "production"
    
    # For cross-origin requests (frontend on different domain), use SameSite=None with Secure=True
    # For same-origin, SameSite=Lax is sufficient
    # Since frontend is on Cloudflare Pages and backend on Render, we need SameSite=None
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,  # Prevents JavaScript access (XSS protection)
        secure=True,  # Always use secure in production (required for SameSite=None)
        samesite="none" if is_production else "lax",  # Cross-site in production, same-site in dev
        path="/",
    )
    
    # Also return token in response body for backward compatibility
    # Frontend should prefer cookies, but this allows gradual migration
    return Token(access_token=access_token, token_type="bearer")


@router.post("/logout")
async def logout(response: Response):
    """
    Logout endpoint that clears the authentication cookie.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="lax",
    )
    return {"message": "Logged out successfully"}


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Register a new user (Admin only).
    
    Creates a new user with hashed password.
    Rate limited to 10 registrations per minute.
    
    Note: Rate limiting is applied via slowapi middleware.
    """
    # Check if username already exists
    result = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Validate role
    if user_data.role not in ["admin", "cashier"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin' or 'cashier'"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

