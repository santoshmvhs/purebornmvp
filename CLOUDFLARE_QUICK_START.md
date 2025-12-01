# 🚀 Quick Start: Deploy Admin Panel to Cloudflare Pages

## Why Cloudflare Pages?

✅ **100% FREE** - Unlimited bandwidth, unlimited requests  
✅ **Global CDN** - Fast worldwide  
✅ **Auto SSL** - HTTPS included  
✅ **Auto Deploy** - Deploys on every push  
✅ **Perfect for Next.js**  

## 3-Minute Deployment

### Step 1: Sign Up
1. Go to: https://dash.cloudflare.com/sign-up
2. Create free account
3. Verify email

### Step 2: Create Pages Project
1. Go to: **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Authorize GitHub
3. Select: `santoshmvhs/purebornmvp`

### Step 3: Configure Build
```
Project name: pureborn-admin-panel
Production branch: main
Root directory: admin-panel
Build command: npm run build
Build output directory: .next
Framework preset: Next.js
```

### Step 4: Add Environment Variable
Click **"Environment variables"** → Add:

```bash
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```

Replace with your actual Render backend URL!

### Step 5: Deploy!
Click **"Save and Deploy"**

You'll get: `https://pureborn-admin-panel.pages.dev` 🎉

### Step 6: Update Backend CORS
In Render dashboard → Environment → Update:

```bash
CORS_ORIGINS=https://pureborn-admin-panel.pages.dev
```

## That's It!

Your admin panel is now live on Cloudflare Pages - **100% free**!

## Cost

- **Cloudflare Pages**: $0/month ✅
- **Backend (Render)**: $7/month
- **Total**: $7/month

## Full Guide

See `admin-panel/CLOUDFLARE_DEPLOYMENT.md` for detailed instructions.

