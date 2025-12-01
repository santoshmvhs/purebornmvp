# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Database Configuration
# For Supabase, use the connection pooler URL (port 6543) for better performance
DATABASE_URL=postgresql+asyncpg://postgres.USER:PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# JWT Configuration
# Use your Supabase JWT secret (found in Supabase Dashboard > Settings > API)
# IMPORTANT: Never commit the actual .env file with real secrets!
JWT_SECRET_KEY=OfKiDoHA9+Q/0ArsA8xFHoviUIHYECOHdodX1mXJo9EB8bBygt06X75LGUf67QX4QpFy+f9vz6mZ0ovvoB1JXg==
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS Configuration
# For production, specify exact origins (comma-separated, no spaces)
# Example: CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
# For development, use: CORS_ORIGINS=*
CORS_ORIGINS=*

# Environment
# Options: development, staging, production
ENVIRONMENT=development
```

## Security Notes

1. **JWT_SECRET_KEY**: This is your Supabase JWT secret. Keep it secure and never commit it to version control.
2. **CORS_ORIGINS**: In production, replace `*` with your actual frontend domain(s).
3. **DATABASE_URL**: Use the Supabase connection pooler URL for better performance.

## Production Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Update `CORS_ORIGINS` to specific domains (not `*`)
- [ ] Verify `JWT_SECRET_KEY` is set correctly
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Use environment variables or secrets manager in production (not .env file)

