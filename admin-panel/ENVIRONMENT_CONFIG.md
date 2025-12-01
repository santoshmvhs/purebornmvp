# Environment Configuration

## Required Environment Variables

The admin panel requires the following environment variable to connect to the backend API:

### `NEXT_PUBLIC_API_URL`

The base URL of the backend API. The `NEXT_PUBLIC_` prefix makes this variable available to client-side code.

#### Development
```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

#### Production (Cloudflare Pages)
```env
NEXT_PUBLIC_API_URL=https://purebornmvp.onrender.com
```

## Setting Environment Variables

### Local Development

Create a `.env.local` file in the `admin-panel` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

### Cloudflare Pages

1. Go to your Cloudflare Pages dashboard
2. Select your `pureborn-admin-panel` project
3. Go to **Settings** → **Environment Variables**
4. Add the following variable:
   - **Variable name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://purebornmvp.onrender.com`
   - **Environment**: Select **Production** (and optionally **Preview**)
5. Click **Save**
6. Trigger a new deployment or wait for the next automatic deployment

## Important Notes

- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Never put sensitive information (like API keys or secrets) in `NEXT_PUBLIC_` variables
- After updating environment variables in Cloudflare Pages, you may need to trigger a new deployment
- The backend URL must match the `CORS_ORIGINS` configuration in your backend service

## Current Backend URL

**Production**: `https://purebornmvp.onrender.com`

Make sure this URL is included in your backend's `CORS_ORIGINS` environment variable in Render.

