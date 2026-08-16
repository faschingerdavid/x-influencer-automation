# 🚀 Quick Start Guide

Get your X influencer automation running in 15 minutes.

## Step 1: Supabase Setup (5 min)

1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Create new project → Choose region closest to you
3. Wait for project to initialize (~2 min)
4. Go to **SQL Editor** (left sidebar)
5. Copy content from `setup-database.sql`
6. Paste in editor → Click **Run**
7. ✅ Database ready!

Get your credentials:
- Go to **Settings** → **API**
- Copy `Project URL` → `SUPABASE_URL`
- Copy `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: X API Setup (5 min)

1. Go to [developer.x.com](https://developer.x.com)
2. Sign in with your X account
3. Click **Projects & Apps** → **Create Project**
4. Name it "Influencer Automation"
5. Choose **Basic** tier ($42/month) - required for sufficient rate limits
6. Generate **Bearer Token**
7. Copy token → `X_API_BEARER_TOKEN`

## Step 3: Vercel Deployment (3 min)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Clone repo:
```bash
git clone https://github.com/faschingerdavid/x-influencer-automation
cd x-influencer-automation
```

3. Deploy:
```bash
vercel login
vercel --prod
```

4. Set environment variables:
```bash
vercel env add X_API_BEARER_TOKEN
vercel env add SUPABASE_URL  
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

5. Redeploy:
```bash
vercel --prod
```

## Step 4: Test Automation (2 min)

1. Get your deployment URL from Vercel
2. Visit: `https://your-deployment.vercel.app/api/automation`
3. Or trigger manually:
```bash
curl https://your-deployment.vercel.app/api/automation
```

4. Check Supabase:
   - Go to **Table Editor**
   - See new rows in `posts` table
   - Check `viral_posts` view for 50K+ content
   - See `generated_posts` for AI-created content

## Step 5: Enable Daily Automation

1. Go to Vercel Dashboard → Your Project
2. Click **Settings** → **Crons**
3. Enable cron jobs (may require Pro plan, $20/month)
4. Cron is pre-configured in `vercel.json` to run daily at 6 AM CEST

## 📊 Daily Results

Every morning at 6 AM CEST you'll get:

- ✅ **~1,100 posts** fetched from 11 influencers
- ✅ **~50-200 viral posts** (50K+ impressions)
- ✅ **3-10 generated posts** ready for review
- ✅ **Execution log** in Supabase

## 🎯 Next Steps

### Review Generated Posts

Query your database:
```sql
SELECT * FROM generated_posts 
WHERE status = 'draft' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Post Manually (Recommended)

- Review generated posts in Supabase
- Copy best ones → Post manually on X
- Update status: `UPDATE generated_posts SET status = 'posted' WHERE id = '...'`

### Monitor Performance

```sql
-- Last 10 runs
SELECT * FROM automation_logs 
ORDER BY run_date DESC 
LIMIT 10;

-- Today's viral posts
SELECT * FROM viral_posts 
WHERE fetched_at >= NOW() - INTERVAL '24 hours';
```

## 💰 Cost Breakdown

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| X API | Basic | $42 |
| Supabase | Free | $0 |
| Vercel | Hobby | $0 (or Pro $20 for crons) |
| **Total** | | **$42-62** |

## 🔧 Troubleshooting

**"Bearer token invalid"**
- Regenerate token in X Developer Portal
- Ensure Basic tier is active

**"Rate limit exceeded"**
- Wait 15 minutes, then retry
- Basic tier: 10K requests per 15 min

**"No viral posts found"**
- Check impression threshold (50K)
- Influencers may not have posted recently
- Lower threshold to 25K temporarily

**"AI generation failed"**
- Check `AI_API_KEY` environment variable
- Fallback template generation will be used

## 📞 Support

- Check Vercel deployment logs
- Query Supabase for debugging
- Review automation_logs table

---

**Ready?** Run the setup and let automation work for you! 🚀
