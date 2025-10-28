@echo off
echo Testing PostgreSQL and Redis installations...
echo.

echo Testing PostgreSQL connection...
psql -U postgres -c "SELECT version();"
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL is working!
) else (
    echo ❌ PostgreSQL connection failed
)

echo.
echo Testing Redis connection...
redis-cli ping
if %errorlevel% equ 0 (
    echo ✅ Redis is working!
) else (
    echo ❌ Redis connection failed
)

echo.
echo Testing complete!
pause
