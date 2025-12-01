# CORS Configuration for Backend

## Required Environment Variable

Set the `CORS_ORIGINS` environment variable in your Render dashboard to include all frontend URLs that will access the API.

## Current Frontend URLs

For the production deployment, set `CORS_ORIGINS` to:

```
https://purebornmvp.pages.dev,https://admin.pureborn.in
```

## How to Update in Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your `pureborn-backend` service
3. Go to **Environment** tab
4. Find the `CORS_ORIGINS` variable
5. Update the value to: `https://purebornmvp.pages.dev,https://admin.pureborn.in`
6. Click **Save Changes**
7. The service will automatically redeploy

## Development URLs

For local development, the backend automatically includes:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

These are added automatically when `ENVIRONMENT` is not set to `production` or when `CORS_ORIGINS` contains development values.

## Important Notes

- In production, `CORS_ORIGINS` cannot be set to `*` for security reasons
- All origins must start with `http://` or `https://`
- Separate multiple origins with commas (no spaces)
- After updating `CORS_ORIGINS`, the backend will automatically restart

