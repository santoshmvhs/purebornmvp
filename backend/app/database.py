from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Use asyncpg for async operations
# Convert postgresql+psycopg:// to postgresql+asyncpg:// if needed
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql+psycopg://"):
    database_url = database_url.replace("postgresql+psycopg://", "postgresql+asyncpg://")
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# For Supabase/pgbouncer compatibility: disable prepared statement cache
# Pgbouncer in transaction mode doesn't support prepared statements
engine = create_async_engine(
    database_url,
    echo=False,
    connect_args={
        "statement_cache_size": 0,  # Disable prepared statement cache for pgbouncer
    },
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

