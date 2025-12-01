# Cloudflare Pages Build Settings

## Required Build Settings

Configure these in your Cloudflare Pages dashboard:

### Project Settings

1. **Project name**: `pureborn-admin-panel`
2. **Production branch**: `main`
3. **Root directory**: `admin-panel` ⚠️ **CRITICAL**
4. **Framework preset**: `Next.js` (auto-detected)

### Build Settings

```
Build command: npm run build
Build output directory: .next
Node version: 18 or 20 (auto-detected)
```

### Environment Variables

Add these in Cloudflare Pages → Your Project → Settings → Environment variables:

**Production Environment:**
```bash
NEXT_PUBLIC_API_URL=https://purebornmvp.onrender.com
NODE_ENV=production
```

**Preview Environment (optional):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:9000
NODE_ENV=development
```

## Step-by-Step Configuration

### 1. Go to Cloudflare Dashboard
- Navigate to: https://dash.cloudflare.com
- Click **Workers & Pages** → Your project

### 2. Configure Build Settings
- Click **Settings** tab
- Scroll to **Builds & deployments**
- Configure:
  - **Root directory**: `admin-panel` (most important!)
  - **Build command**: `npm run build`
  - **Build output directory**: `.next`

### 3. Add Environment Variables
- Click **Settings** → **Environment variables**
- Click **Add variable** for Production
- Add `NEXT_PUBLIC_API_URL` = `https://purebornmvp.onrender.com`
- Add `NODE_ENV` = `production`
- Click **Save**

### 4. Verify Configuration

Your settings should look like:

```
Project name: pureborn-admin-panel
Production branch: main
Root directory: admin-panel
Framework preset: Next.js
Build command: npm run build
Build output directory: .next
Node version: 18.x or 20.x
```

## Troubleshooting

### Build Fails with "Module not found"

**If you see**: `Module not found: Can't resolve '@/lib/api'`

**Solutions**:
1. ✅ Verify **Root directory** is set to `admin-panel` (not `/admin-panel` or empty)
2. ✅ Check that `package.json` exists in `admin-panel/` directory
3. ✅ Ensure `tsconfig.json` has correct paths configuration
4. ✅ Try clearing build cache in Cloudflare dashboard

### Build Output Directory Error

**If you see**: `Build output directory not found`

**Solution**: 
- Set **Build output directory** to `.next` (not `.next/out` or `out`)

### Environment Variables Not Working

**If you see**: `process.env.NEXT_PUBLIC_API_URL is undefined`

**Solutions**:
1. ✅ Ensure variable name starts with `NEXT_PUBLIC_`
2. ✅ Set variable for **Production** environment
3. ✅ Rebuild after adding variables (Cloudflare auto-rebuilds)
4. ✅ Check variable is not in quotes in dashboard

## Current Status

- ✅ `wrangler.toml` configured
- ✅ `next.config.ts` has webpack path alias configuration
- ✅ Build command uses `--webpack` flag
- ⚠️ Path aliases still need to be resolved (investigating)

## Next Steps After Build Succeeds

1. ✅ Update backend CORS in Render dashboard:
   ```
   CORS_ORIGINS=https://your-cloudflare-pages-url.pages.dev
   ```
2. ✅ Test login functionality
3. ✅ Verify API calls work
4. ✅ Set up custom domain (optional)

