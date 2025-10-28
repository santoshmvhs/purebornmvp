# Pureborn E-commerce Platform - Repository Setup Script

Write-Host "🚀 Setting up Pureborn Git Repository..." -ForegroundColor Green

# Navigate to project directory
Set-Location "D:\coding\pureborn"

# Initialize Git repository
Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
git init

# Add all files
Write-Host "📝 Adding files to repository..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit: Pureborn E-commerce Platform

- Complete e-commerce backend (Node.js + Express + TypeScript + PostgreSQL)
- Customer frontend (React + TypeScript + Tailwind CSS)
- Admin dashboard (React + TypeScript + Tailwind CSS)
- Real-time features with WebSocket
- Advanced analytics and business intelligence
- Marketing tools and campaign management
- Logistics integration (Shiprocket)
- Customer management and segmentation
- Subscription system
- Payment integration (Razorpay)
- Email notifications and scheduling"

# Set main branch
Write-Host "🌿 Setting main branch..." -ForegroundColor Yellow
git branch -M main

# Add remote
Write-Host "🔗 Adding remote repository..." -ForegroundColor Yellow
git remote add origin https://github.com/santoshmvhs/pureborn.git

# Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "✅ Repository setup complete!" -ForegroundColor Green
Write-Host "📍 Repository URL: https://github.com/santoshmvhs/pureborn.git" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Pureborn E-commerce Platform is now on GitHub! 🎉" -ForegroundColor Green
