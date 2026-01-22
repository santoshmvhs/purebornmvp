# Dokploy Deployment Guide

This guide will help you deploy the Pureborn POS Backend to Dokploy.

## Prerequisites

- Dokploy instance running and accessible
- Git repository with backend code
- PostgreSQL database (Supabase or external)
- Domain name (optional, for custom domain)

## Deployment Steps

### 1. Create New Application in Dokploy

1. Log in to your Dokploy dashboard
2. Navigate to **Applications** → **New Application**
3. Select **Dockerfile** as the build method
4. Connect your Git repository:
   - Repository: `santoshmvhs/purebornmvp` (or your repo)
   - Branch: `main`
   - Base Directory: `/backend`
   - Dockerfile Location: `/Dockerfile`

### 2. Configure Ports

In Dokploy's application settings:

- **Port Exposes**: `8000`
- **Port Mappings**: `8000:8000`
- Or set `PORT` environment variable to `8000`, `3000`, or `8080` as needed

**Note**: The application supports ports 8000 (default), 3000, and 8080. The `PORT` environment variable will be automatically used.

### 3. Configure Environment Variables

Go to **Environment Variables** section and add:

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql+psycopg://user:password@host:port/database

# JWT Authentication (REQUIRED in production)
JWT_SECRET_KEY=your-secure-secret-key-minimum-32-characters

# Environment
ENVIRONMENT=production

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=https://admin.pureborn.in,https://yourdomain.com
```

#### Optional Variables

```bash
# Port (if you want to use 3000 or 8080 instead of 8000)
PORT=8000

# Supabase (if using Supabase Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Redis (for rate limiting in production)
REDIS_URL=redis://user:password@host:port/db
```

### 4. Generate Secure JWT_SECRET_KEY

Run this command to generate a secure key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and use it as your `JWT_SECRET_KEY`.

### 5. Configure Domain (Optional)

If you want to use a custom domain:

1. Go to **Domains** section
2. Add your domain: `api.yourdomain.com`
3. Dokploy will automatically provision SSL/TLS via Let's Encrypt

### 6. Deploy

1. Click **Deploy** or **Redeploy**
2. Monitor the logs to ensure:
   - Database connection is successful
   - Migrations ran successfully
   - Server started on the correct port

### 7. Verify Deployment

Test the health endpoint:

```bash
curl https://your-domain.com/health
```

You should see:
```json
{
  "status": "healthy",
  "database": "connected",
  "environment": "production"
}
```

## Port Configuration

The backend supports multiple ports:

- **8000** (default) - Recommended for production
- **3000** - Alternative port
- **8080** - Alternative port

To use a different port, set the `PORT` environment variable in Dokploy.

## Database Setup

### Option A: Use Supabase (Recommended)

1. Create a Supabase project
2. Get the connection string from Supabase dashboard
3. Use the **Connection Pooling** URL (port 6543) for better performance
4. Set `DATABASE_URL` in Dokploy environment variables

**Format:**
```
postgresql+psycopg://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres
```

### Option B: Use External PostgreSQL

1. Ensure your PostgreSQL database is accessible from Dokploy's network
2. Set `DATABASE_URL` with the full connection string

**Format:**
```
postgresql+asyncpg://username:password@host:port/database_name
```

## Important Notes

### Port Configuration

- Dokploy will automatically set the `PORT` environment variable
- The Dockerfile and startup script use this port dynamically
- Default port is 8000 if not set

### Database Migrations

- Migrations run automatically on container startup
- If migrations fail, the container will still start (check logs)
- To run migrations manually, exec into the container:
  ```bash
  docker exec -it <container-name> alembic upgrade head
  ```

### CORS Configuration

- **IMPORTANT**: In production, never use `CORS_ORIGINS=*`
- Always specify exact origins:
  ```
  CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
  ```

### Security Checklist

- [ ] Set a strong `JWT_SECRET_KEY` (minimum 32 characters)
- [ ] Configure `CORS_ORIGINS` with exact domains (not `*`)
- [ ] Use HTTPS in production
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure `SENTRY_DSN` for error tracking
- [ ] Use `REDIS_URL` for rate limiting in production

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check if database is accessible from Dokploy's network
3. Ensure database credentials are correct
4. Check firewall rules

### Migration Failures

1. Check logs for specific migration errors
2. Ensure database user has CREATE/ALTER permissions
3. Run migrations manually if needed:
   ```bash
   alembic upgrade head
   ```

### Port Issues

1. Verify `PORT` environment variable is set correctly
2. Check Dokploy's port configuration
3. Ensure no port conflicts
4. The application supports 8000, 3000, and 8080

### CORS Issues

1. Verify `CORS_ORIGINS` includes your frontend domain
2. Check that origins don't have trailing slashes
3. Ensure `ENVIRONMENT=production` is set

### Application Won't Start

1. Check logs for `JWT_SECRET_KEY` errors
2. Verify all required environment variables are set
3. Check database connectivity
4. Ensure port is correctly configured

## Support

For issues specific to:
- **Dokploy**: Check [Dokploy Documentation](https://dokploy.com/docs)
- **Backend API**: Check `README.md` and `API_DOCUMENTATION.md`
- **Database**: Check `ENV_SETUP.md`

## Example Environment Variables

Here's a complete example of environment variables for production:

```bash
# Required
DATABASE_URL=postgresql+psycopg://postgres.[ref]:[pass]@aws-1-[region].pooler.supabase.com:6543/postgres
JWT_SECRET_KEY=i-CQC0_SYGirvVQnyEKfLgUiTdf53DSVf1CShl1UssE
ENVIRONMENT=production
CORS_ORIGINS=https://admin.pureborn.in

# Port (optional, defaults to 8000)
PORT=8000

# Optional
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
REDIS_URL=redis://user:password@host:port/db
```
