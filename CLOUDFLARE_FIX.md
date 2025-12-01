# 🔧 Fix Cloudflare Pages Build Error

## Problem

Cloudflare Pages is looking for `package.json` in the root directory, but your admin panel is in the `admin-panel/` subdirectory.

**Error**: `Could not read package.json: Error: ENOENT: no such file or directory`

## Solution

You need to configure Cloudflare Pages to use `admin-panel` as the root directory.

### Step 1: Update Build Settings in Cloudflare Dashboard

1. Go to your Cloudflare Pages project dashboard
2. Click **"Settings"** → **"Builds & deployments"**
3. Scroll down to **"Build configuration"**
4. Update these settings:

```
Root directory: admin-panel
Build command: npm run build
Build output directory: .next
```

### Step 2: Verify Environment Variables

Make sure you have set:
```bash
NEXT_PUBLIC_API_URL=https://purebornmvp.onrender.com
```

### Step 3: Redeploy

After updating the settings, Cloudflare will automatically trigger a new build. Or you can manually trigger a deployment.

## Alternative: Using Wrangler (CLI)

If you prefer using the CLI, you can also configure it via `wrangler.toml`:

```toml
name = "pureborn-admin-panel"
compatibility_date = "2024-12-01"

[env.production]
pages_build_output_dir = "admin-panel/.next"
```

But the dashboard method above is easier!

## Quick Fix Checklist

- [ ] Go to Cloudflare Pages dashboard
- [ ] Settings → Builds & deployments
- [ ] Set Root directory: `admin-panel`
- [ ] Set Build command: `npm run build`
- [ ] Set Build output directory: `.next`
- [ ] Save settings
- [ ] Wait for automatic rebuild or trigger manual deployment

---

**After this fix, your build should succeed! ✅**

