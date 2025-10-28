Write-Host "Testing PostgreSQL and Redis installations..." -ForegroundColor Green
Write-Host ""

Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
try {
    $result = psql -U postgres -c "SELECT version();" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL is working!" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ PostgreSQL not found or not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing Redis connection..." -ForegroundColor Yellow
try {
    $result = redis-cli ping 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis is working!" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Redis not found or not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Green
Read-Host "Press Enter to continue"
