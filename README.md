# 🤖 X Influencer Automation Agent

**Automated daily monitoring of 11 trading influencers with viral content detection and AI-powered post generation.**

Built for: **Midnight Mess X Channel Automation**

## 📋 What This Does

Every day at 6 AM CEST, this agent:

1. ✅ **Fetches** latest posts from 11 trading influencers
2. ✅ **Stores** all posts in Supabase with engagement metrics
3. ✅ **Filters** viral content (50K+ impressions) into special list
4. ✅ **Generates** 3-10 derivative posts using AI in your style
5. ✅ **Logs** everything for tracking and optimization

## 🎯 Monitored Influencers

| Handle | Niche |
|--------|-------|
| @TTrimoreau | Trading analysis |
| @AlphaOwlTrading | Trading signals |
| @MsVeilMoney | Finance content |
| @LeifInvests | Investing insights |
| @antibearthesis | Market analysis |
| @OInvests | Investment strategies |
| @Brownmoose | Trading content |
| @cmsinvests | Market commentary |
| @drayinvests | Investment analysis |
| @fammetaX | Trading insights |
| @BlackMambaMilli | Trading content |

## 🏗️ Architecture

```
Vercel Cron (6 AM CEST) → X API v2 → Supabase DB → AI Generation → Generated Posts
```

## 🚀 Quick Start

### 1. Supabase Setup (5 min)

1. Go to [supabase.com](https://supabase.com) → Create project
2. SQL Editor → Run `setup-database.sql`
3. Get credentials: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

### 2. X API Setup (5 min)

1. Go to [developer.x.com](https://developer.x.com)
2. Create Project → Basic tier ($42/month)
3. Generate Bearer Token → X_API_BEARER_TOKEN

### 3. Vercel Deployment (3 min)

```bash
npm i -g vercel
vercel login
vercel --prod
vercel env add X_API_BEARER_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### 4. Test

```bash
curl https://your-deployment.vercel.app/api/automation
```

## 📊 Daily Output

- **~1,100 posts** fetched (100 per influencer)
- **~50-200 viral posts** (50K+ impressions)
- **3-10 generated posts** ready for review

## 💰 Costs

| Service | Monthly |
|---------|---------|
| X API Basic | $42 |
| Supabase | $0 |
| Vercel | $0 |
| **Total** | **$42** |

## 📁 Files

- `README.md` - Main documentation
- `QUICKSTART.md` - Step-by-step setup guide  
- `setup-database.sql` - Supabase schema
- `api/automation.ts` - Main automation code
- `content-prompts.md` - AI generation prompts
- `vercel.json` - Cron configuration
- `x-influencer-automation.md` - Full technical docs

## 🔗 Links

- **Repo**: https://github.com/faschingerdavid/x-influencer-automation
- **X API**: https://developer.x.com
- **Supabase**: https://supabase.com
- **Vercel**: https://vercel.com

---

Built for viral, steady X content automation 🚀

Last updated: August 16, 2026
