# Coolify Deployment Guide

This guide will help you deploy the Pureborn POS Backend to Coolify.

## Prerequisites

- A Coolify instance (self-hosted or cloud)
- A PostgreSQL database (can be managed by Coolify or external)
- Git repository access

## Deployment Steps

### 1. Create a New Resource in Coolify

1. Go to your Coolify dashboard
2. Click "New Resource" → "Docker Compose" or "Dockerfile"
3. Connect your Git repository (or use manual deployment)

### 2. Configure Environment Variables

Set the following environment variables in Coolify:

#### Required Variables

```bash
# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-minimum-32-characters-long
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Environment
ENVIRONMENT=production

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

#### Optional Variables

```bash
# Supabase (if using Supabase Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Redis (for rate limiting in production)
REDIS_URL=redis://user:password@host:port/db

# Port (usually set automatically by Coolify)
PORT=8000
```

### 3. Database Setup

#### Option A: Use Coolify's PostgreSQL Service

1. Create a PostgreSQL service in Coolify
2. Use the connection string provided by Coolify
3. Set `DATABASE_URL` in your backend service environment variables

#### Option B: Use External PostgreSQL

1. Use your existing PostgreSQL database
2. Ensure the database is accessible from Coolify's network
3. Set `DATABASE_URL` with the full connection string

**Connection String Format:**
```
postgresql+asyncpg://username:password@host:port/database_name
```

### 4. Configure Health Checks

Coolify will automatically use the `/health` endpoint for health checks. The endpoint:
- Returns 200 if database is connected
- Returns 503 if database is disconnected

### 5. Build and Deploy

1. Coolify will automatically build the Docker image using the `Dockerfile`
2. The startup script (`docker-entrypoint.sh`) will:
   - Wait for database connection
   - Run Alembic migrations automatically
   - Initialize database if needed
   - Start the FastAPI server

### 6. Verify Deployment

1. Check the logs in Coolify to ensure:
   - Database connection is successful
   - Migrations ran successfully
   - Server started on the correct port

2. Test the health endpoint:
   ```bash
   curl https://your-domain.com/health
   ```

3. Test the API root:
   ```bash
   curl https://your-domain.com/
   ```

## Important Notes

### Port Configuration

- Coolify automatically sets the `PORT` environment variable
- The Dockerfile and startup script use this port dynamically
- Default port is 8000 if not set

### Database Migrations

- Migrations run automatically on container startup
- If migrations fail, the container will still start (check logs)
- To run migrations manually, you can exec into the container:
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
2. Check if database is accessible from Coolify's network
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

1. Verify `PORT` environment variable is set
2. Check Coolify's port configuration
3. Ensure no port conflicts

### CORS Issues

1. Verify `CORS_ORIGINS` includes your frontend domain
2. Check that origins don't have trailing slashes
3. Ensure `ENVIRONMENT=production` is set

## Support

For issues specific to:
- **Coolify**: Check [Coolify Documentation](https://coolify.io/docs)
- **Backend API**: Check `README.md` and `API_DOCUMENTATION.md`
- **Database**: Check `ENV_SETUP.md`
