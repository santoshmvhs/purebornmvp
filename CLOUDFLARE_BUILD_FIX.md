# 🔧 Fix Cloudflare Pages Build Error

## ❌ Error

```
npm error path /opt/buildhome/repo/package.json
npm error errno -2
npm error enoent Could not read package.json
```

**Problem**: Cloudflare Pages is looking for `package.json` in the root directory, but your admin panel is in the `admin-panel/` subdirectory.

## ✅ Solution

### Step 1: Update Build Settings in Cloudflare Dashboard

1. Go to your Cloudflare Pages project: https://dash.cloudflare.com
2. Click on your project: **pureborn-admin-panel** (or whatever you named it)
3. Go to **Settings** → **Builds & deployments**
4. Scroll down to **"Build configuration"**
5. Update these settings:

```
Root directory: admin-panel
Build command: npm run build
Build output directory: .next
```

**Important**: Make sure **Root directory** is set to `admin-panel` (not empty, not `/`, just `admin-panel`)

### Step 2: Verify Environment Variables

While you're in Settings, check **Environment variables**:

```bash
NEXT_PUBLIC_API_URL=https://purebornmvp.onrender.com
```

### Step 3: Save and Redeploy

1. Click **"Save"** at the bottom
2. Cloudflare will automatically trigger a new build
3. Or manually trigger: **Deployments** → **Retry deployment**

## 📸 Visual Guide

The settings should look like this:

```
┌─────────────────────────────────────┐
│ Build configuration                 │
├─────────────────────────────────────┤
│ Root directory:                     │
│ [admin-panel              ]          │
│                                     │
│ Build command:                      │
│ [npm run build           ]          │
│                                     │
│ Build output directory:             │
│ [.next                   ]          │
└─────────────────────────────────────┘
```

## ✅ Verification

After saving, the build should:
1. ✅ Find `package.json` in `admin-panel/package.json`
2. ✅ Install dependencies from `admin-panel/package.json`
3. ✅ Run `npm run build` in the `admin-panel` directory
4. ✅ Output to `admin-panel/.next`

## 🐛 Still Not Working?

If it still fails:

1. **Check the build logs** - Look for the actual path it's using
2. **Verify repository structure** - Make sure `admin-panel/package.json` exists in your GitHub repo
3. **Try manual deployment** - Go to **Deployments** → **Retry deployment**

## 📝 Alternative: Use Wrangler CLI

If the dashboard doesn't work, you can use the CLI:

```bash
# Install Wrangler
npm install -g wrangler

# Configure
wrangler pages project create pureborn-admin-panel

# Deploy
cd admin-panel
wrangler pages deploy .next --project-name=pureborn-admin-panel
```

But the dashboard method above is much easier!

---

**After setting Root directory to `admin-panel`, your build should succeed! ✅**

