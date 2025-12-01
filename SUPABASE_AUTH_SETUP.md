# Supabase Auth Setup Guide

## Overview

This application now uses Supabase Authentication instead of custom JWT authentication. Users authenticate through Supabase, and the backend verifies Supabase JWT tokens.

## Frontend Configuration

### Environment Variables

Add these to your Cloudflare Pages environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase URL Configuration

In Supabase Dashboard → **Authentication** → **URL Configuration**:

1. **Site URL**: `https://admin.pureborn.in`
2. **Redirect URLs**: Add these:
   - `https://admin.pureborn.in`
   - `https://purebornmvp.pages.dev`
   - `https://admin.pureborn.in/login`
   - `https://purebornmvp.pages.dev/login`

## Backend Configuration

### Environment Variables

Add these to your Render dashboard environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Where to find SUPABASE_JWT_SECRET:**
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **JWT Secret** (not the anon key)

### User Management

**Important**: Users must exist in both Supabase Auth and your database `users` table.

1. **Create user in Supabase Auth** (via Supabase Dashboard or signup flow)
2. **Create corresponding user in your database** with:
   - `username` = user's email (from Supabase)
   - `role` = 'admin' or 'cashier'
   - `is_active` = true
   - `hashed_password` = can be empty (not used with Supabase Auth)

### Migration Steps

1. **Create users in Supabase Auth**:
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Create users with their email addresses

2. **Sync users to your database**:
   - For each Supabase user, create a corresponding record in your `users` table
   - Set `username` to the user's email
   - Set appropriate `role`

3. **Update environment variables** in both:
   - Cloudflare Pages (frontend)
   - Render (backend)

4. **Test login** with a user that exists in both systems

## How It Works

1. User logs in via Supabase Auth (email/password)
2. Supabase returns a JWT token
3. Frontend stores the token and sends it with API requests
4. Backend verifies the Supabase JWT token
5. Backend looks up user in database by email (stored in username field)
6. User is authenticated and can access protected routes

## Troubleshooting

### "User not found in system"
- User exists in Supabase Auth but not in your database
- Solution: Create user record in `users` table with `username` = user's email

### "Could not validate credentials"
- Supabase JWT secret is incorrect
- Solution: Verify `SUPABASE_JWT_SECRET` in Render matches Supabase Dashboard

### CORS errors
- Make sure `CORS_ORIGINS` in Render includes your frontend URLs
- Make sure Supabase Redirect URLs are configured

