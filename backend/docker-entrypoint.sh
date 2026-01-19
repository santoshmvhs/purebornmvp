#!/bin/bash
# Don't use set -e, we want to handle errors gracefully

echo "🚀 Starting Pureborn POS Backend..."

# Wait for database to be ready (if using external DB, this will timeout gracefully)
echo "⏳ Waiting for database connection..."
if [ -n "$DATABASE_URL" ]; then
    # Extract connection details from DATABASE_URL if needed
    # For now, we'll just try to connect
    python -c "
import asyncio
import sys
from sqlalchemy import text
from app.database import engine
async def check_db():
    try:
        async with engine.begin() as conn:
            await conn.execute(text('SELECT 1'))
        print('✅ Database connection successful')
        return True
    except Exception as e:
        print(f'⚠️  Database connection failed: {e}')
        print('⚠️  Continuing anyway - migrations will retry...')
        return False
asyncio.run(check_db())
" || echo "⚠️  Database check failed, continuing..."
else
    echo "⚠️  DATABASE_URL not set, skipping database check"
fi

# Run database migrations
echo "📦 Running database migrations..."
alembic upgrade head || {
    echo "⚠️  Migration failed, but continuing..."
}

# Initialize database if needed (only if init_db.py exists and DATABASE_URL is set)
if [ -f "init_db.py" ] && [ -n "$DATABASE_URL" ]; then
    echo "🔧 Initializing database (if needed)..."
    python init_db.py || {
        echo "⚠️  Database initialization failed or already initialized, continuing..."
    }
fi

# Get port from environment variable (Coolify sets this)
PORT=${PORT:-8000}

echo "🌐 Starting server on port $PORT..."

# Start the application (use exec to replace shell process)
exec uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1
