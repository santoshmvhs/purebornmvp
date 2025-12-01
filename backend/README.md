# Pureborn Backend API

FastAPI backend for the Pureborn POS system.

## Environment Variables

### Required for Production

Set these in your Render dashboard under **Environment**:

1. **DATABASE_URL**: PostgreSQL connection string
   ```
   postgresql+asyncpg://user:password@host:port/database
   ```

2. **JWT_SECRET_KEY**: Secret key for JWT token signing (min 32 characters)
   ```
   Generate a secure random string (e.g., openssl rand -hex 32)
   ```

3. **CORS_ORIGINS**: Comma-separated list of allowed frontend origins
   ```
   https://purebornmvp.pages.dev,https://admin.pureborn.in
   ```
   
   **Important**: Must include both URLs:
   - `https://purebornmvp.pages.dev` (Cloudflare Pages default subdomain)
   - `https://admin.pureborn.in` (custom domain)

4. **ENVIRONMENT**: Set to `production` (already configured in render.yaml)

### Optional

- **SENTRY_DSN**: Sentry error tracking URL (optional)
- **REDIS_URL**: Redis connection URL for rate limiting (optional)

## CORS Configuration

The backend uses CORS to allow requests from specific frontend origins. In production, you must specify exact origins (cannot use `*`).

**Current Frontend URLs:**
- `https://purebornmvp.pages.dev`
- `https://admin.pureborn.in`

To update CORS in Render:
1. Go to your service → **Environment** tab
2. Find `CORS_ORIGINS`
3. Set value to: `https://purebornmvp.pages.dev,https://admin.pureborn.in`
4. Save and redeploy

## Health Check

The service includes a health check endpoint at `/health` for monitoring.
