# Deploying Admin Panel to Cloudflare Pages

## Why Cloudflare Pages?

✅ **100% Free** - Unlimited bandwidth, unlimited requests  
✅ **Global CDN** - Fast loading worldwide  
✅ **Auto SSL** - HTTPS included  
✅ **Auto Deploy** - Deploys on every GitHub push  
✅ **Perfect for Next.js** - Native support  
✅ **Fast Builds** - Optimized build pipeline  

## Pricing Comparison

| Feature | Cloudflare Pages | Vercel | Netlify |
|---------|-----------------|--------|---------|
| **Price** | **Free** ✅ | Free (limited) | Free (limited) |
| **Bandwidth** | Unlimited | 100GB/mo | 100GB/mo |
| **Builds** | Unlimited | 100/mo | 300/mo |
| **CDN** | Global | Global | Global |
| **SSL** | Auto | Auto | Auto |
| **Best For** | **Production** ✅ | Production | Production |

**Recommendation**: Cloudflare Pages is **100% free** and perfect for your admin panel!

## Quick Deployment (5 Minutes)

### Step 1: Create Cloudflare Account

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up (free account is enough)
3. Verify your email

### Step 2: Connect GitHub Repository

1. Go to: https://dash.cloudflare.com → **Workers & Pages**
2. Click **"Create application"** → **"Pages"** → **"Connect to Git"**
3. Authorize Cloudflare to access your GitHub
4. Select repository: `santoshmvhs/purebornmvp`

### Step 3: Configure Build Settings

```
Project name: pureborn-admin-panel
Production branch: main
Root directory: admin-panel
Build command: npm run build
Build output directory: .next
```

**Important Settings:**
- **Framework preset**: Next.js
- **Node version**: 18 or 20 (auto-detected)
- **Root directory**: `admin-panel` (since your repo has multiple folders)

### Step 4: Add Environment Variables

Click **"Environment variables"** and add:

```bash
# Required
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com

# Optional (for analytics, etc.)
NODE_ENV=production
```

**Important**: 
- Replace `your-render-backend.onrender.com` with your actual Render backend URL
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Cloudflare Pages will rebuild automatically when you add variables

### Step 5: Deploy!

Click **"Save and Deploy"** - Cloudflare will:
- ✅ Install dependencies
- ✅ Build your Next.js app
- ✅ Deploy to global CDN
- ✅ Give you a URL: `https://pureborn-admin-panel.pages.dev`

### Step 6: Update Backend CORS

After deployment, update your backend `CORS_ORIGINS` to include your Cloudflare Pages URL:

```bash
# In Render dashboard → Environment variables
CORS_ORIGINS=https://pureborn-admin-panel.pages.dev,https://your-custom-domain.com
```

## Custom Domain (Optional)

1. In Cloudflare Pages → Your project → **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `admin.yourdomain.com`)
4. Follow DNS setup instructions
5. Cloudflare will automatically configure SSL

## Build Configuration

Your app uses Next.js 16 with App Router. Cloudflare Pages automatically:
- Detects Next.js framework
- Runs `npm run build`
- Serves from `.next` directory
- Handles routing automatically

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ Yes |
| `NODE_ENV` | Environment (production) | Optional |

## Post-Deployment Checklist

- [ ] Build completed successfully
- [ ] Site accessible at Cloudflare Pages URL
- [ ] Login page loads correctly
- [ ] API calls work (check browser console)
- [ ] Backend CORS updated with Cloudflare URL
- [ ] Custom domain configured (optional)
- [ ] Test all major pages (dashboard, products, sales, etc.)

## Troubleshooting

### Build Fails

**Error**: `Module not found` or `Build failed`
- **Solution**: Check that `Root directory` is set to `admin-panel`
- **Solution**: Verify `package.json` has all dependencies
- **Solution**: Check build logs in Cloudflare dashboard

### API Calls Fail (CORS)

**Error**: `CORS policy: No 'Access-Control-Allow-Origin'`
- **Solution**: Update backend `CORS_ORIGINS` to include your Cloudflare Pages URL
- **Solution**: Verify `NEXT_PUBLIC_API_URL` is set correctly

### 404 Errors on Routes

**Error**: `404 Not Found` on navigation
- **Solution**: This is normal for client-side routing - Cloudflare Pages handles it automatically
- **Solution**: If persistent, check `next.config.ts` for redirects

### Environment Variables Not Working

**Error**: `process.env.NEXT_PUBLIC_API_URL` is undefined
- **Solution**: Ensure variable name starts with `NEXT_PUBLIC_`
- **Solution**: Rebuild after adding variables (Cloudflare auto-rebuilds)
- **Solution**: Check variable is set for "Production" environment

## Performance Tips

1. **Enable Auto Minify** (in Cloudflare dashboard):
   - JavaScript: ✅
   - CSS: ✅
   - HTML: ✅

2. **Enable Brotli Compression** (automatic on Cloudflare)

3. **Cache Static Assets** (automatic on Cloudflare Pages)

## Cost Breakdown

- **Cloudflare Pages**: **$0/month** (100% free)
- **Backend (Render)**: $7/month
- **Database (Supabase)**: Free tier available
- **Total**: **$7/month** for full stack! 🎉

## Alternative: Vercel (Also Free)

If you prefer Vercel:
- Similar setup process
- Also free for personal projects
- Slightly better Next.js integration
- But Cloudflare Pages is **completely free** with no limits

## Support

- 📖 Cloudflare Pages Docs: https://developers.cloudflare.com/pages/
- 📖 Next.js on Cloudflare: https://developers.cloudflare.com/pages/framework-guides/nextjs/
- 💬 Cloudflare Community: https://community.cloudflare.com/

## Next Steps

1. ✅ Deploy to Cloudflare Pages
2. ✅ Update backend CORS
3. ✅ Test end-to-end
4. ⏭️ Set up custom domain (optional)
5. ⏭️ Configure monitoring (optional)

