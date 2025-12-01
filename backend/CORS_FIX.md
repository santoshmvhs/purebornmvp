# Fix CORS Error - Update Render Environment Variable

## Problem
The frontend at `https://purebornmvp.pages.dev` is being blocked by CORS because the backend doesn't allow requests from this origin.

## Solution

Update the `CORS_ORIGINS` environment variable in your Render dashboard to include both frontend URLs.

### Steps:

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your service**: `pureborn-backend`
3. **Go to Environment tab**
4. **Find `CORS_ORIGINS` variable**
5. **Update the value to**:
   ```
   https://purebornmvp.pages.dev,https://admin.pureborn.in
   ```
6. **Click "Save Changes"**
7. **Wait for automatic redeploy** (usually takes 1-2 minutes)

### Important Notes:

- **No spaces** after commas
- **Must include `https://`** prefix
- **Both URLs required**:
  - `https://purebornmvp.pages.dev` (Cloudflare Pages default subdomain)
  - `https://admin.pureborn.in` (your custom domain)

### Verify:

After the redeploy completes, check the logs. You should see:
```
CORS Origins: ['https://purebornmvp.pages.dev', 'https://admin.pureborn.in', ...]
```

Then test the login again from `https://purebornmvp.pages.dev/login`

