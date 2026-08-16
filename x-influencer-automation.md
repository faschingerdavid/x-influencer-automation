# X Influencer Automation Agent - Full Documentation

Automated daily monitoring of trading influencers on X with viral content detection and AI-powered post generation.

## 📋 Influencer List

Monitored accounts (11 total):

| # | Username | Handle | Niche |
|---|----------|--------|-------|
| 1 | TTrimoreau | @TTrimoreau | Trading analysis |
| 2 | AlphaOwlTrading | @AlphaOwlTrading | Trading signals |
| 3 | MsVeilMoney | @MsVeilMoney | Finance content |
| 4 | LeifInvests | @LeifInvests | Investing insights |
| 5 | antibearthesis | @antibearthesis | Market analysis |
| 6 | OInvests | @OInvests | Investment strategies |
| 7 | Brownmoose | @Brownmoose | Trading content |
| 8 | cmsinvests | @cmsinvests | Market commentary |
| 9 | drayinvests | @drayinvests | Investment analysis |
| 10 | fammetaX | @fammetaX | Trading insights |
| 11 | BlackMambaMilli | @BlackMambaMilli | Trading content |

## 🏗️ Architecture

```
Vercel Cron (Daily 6 AM CEST)
    ↓
X API v2 (Fetch latest posts)
    ↓
Supabase DB (Store posts + metrics)
    ↓
Filter 50K+ (Viral content list)
    ↓
AI Generation (Create derivative posts)
    ↓
Schedule Post (X API or manual review)
```

## 🗄️ Database Schema (Supabase)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Influencers table
CREATE TABLE influencers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,
  x_user_id TEXT UNIQUE,
  niche TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- All posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  influencer_id UUID REFERENCES influencers(id),
  x_post_id TEXT NOT NULL UNIQUE,
  text_content TEXT NOT NULL,
  created_at_x TIMESTAMP WITH TIME ZONE NOT NULL,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  bookmarks INTEGER DEFAULT 0,
  is_viral BOOLEAN DEFAULT false,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(x_post_id)
);

-- Viral posts view (50K+ impressions)
CREATE VIEW viral_posts AS
SELECT 
  p.*,
  i.username,
  i.handle
FROM posts p
JOIN influencers i ON p.influencer_id = i.id
WHERE p.impressions >= 50000
ORDER BY p.created_at_x DESC;

-- Generated posts table
CREATE TABLE generated_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_post_id UUID REFERENCES posts(id),
  source_influencer TEXT,
  generated_content TEXT NOT NULL,
  style_notes TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  x_post_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation logs
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posts_fetched INTEGER DEFAULT 0,
  viral_posts_found INTEGER DEFAULT 0,
  posts_generated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Create indexes for performance
CREATE INDEX idx_posts_impressions ON posts(impressions);
CREATE INDEX idx_posts_created_at ON posts(created_at_x);
CREATE INDEX idx_posts_is_viral ON posts(is_viral);
CREATE INDEX idx_generated_posts_status ON generated_posts(status);

-- Insert initial influencers
INSERT INTO influencers (username, handle, niche) VALUES
('TTrimoreau', '@TTrimoreau', 'Trading analysis'),
('AlphaOwlTrading', '@AlphaOwlTrading', 'Trading signals'),
('MsVeilMoney', '@MsVeilMoney', 'Finance content'),
('LeifInvests', '@LeifInvests', 'Investing insights'),
('antibearthesis', '@antibearthesis', 'Market analysis'),
('OInvests', '@OInvests', 'Investment strategies'),
('Brownmoose', '@Brownmoose', 'Trading content'),
('cmsinvests', '@cmsinvests', 'Market commentary'),
('drayinvests', '@drayinvests', 'Investment analysis'),
('fammetaX', '@fammetaX', 'Trading insights'),
('BlackMambaMilli', '@BlackMambaMilli', 'Trading content');
```

## 🔧 Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to SQL Editor
3. Paste and run the schema SQL above
4. Get your credentials:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key)

### 2. X API Setup

1. Go to [developer.x.com](https://developer.x.com)
2. Create a new project
3. Choose **Basic** tier ($42/month) for sufficient rate limits
4. Generate **Bearer Token**
5. Copy token → `X_API_BEARER_TOKEN`

### 3. Vercel Setup

1. Install Vercel CLI: `npm i -g vercel`
2. Clone the repository
3. Set environment variables:
```bash
vercel env add X_API_BEARER_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add AI_API_KEY (optional, for content generation)
```
4. Deploy: `vercel --prod`

## 📊 Daily Workflow

```
Daily at 6 AM CEST:
1. Fetch latest posts from all influencers (X API)
2. Filter for impressions ≥ 50,000 → add to viral_posts table
3. Store all posts in posts table (deduplicated)
4. Select top 5-10 viral posts for inspiration
5. Generate 3-5 derivative posts in your style (AI)
6. Save to generated_posts table
7. (Optional) Auto-schedule via X API for posting
```

## 📈 Monitoring Dashboard

Query your Supabase database:

```sql
-- Today's viral posts
SELECT * FROM viral_posts 
WHERE fetched_at >= NOW() - INTERVAL '24 hours'
ORDER BY impressions DESC;

-- Generated posts awaiting review
SELECT * FROM generated_posts 
WHERE status = 'draft'
ORDER BY created_at DESC;

-- Automation history
SELECT * FROM automation_logs 
ORDER BY run_date DESC 
LIMIT 10;
```

## 🔐 Environment Variables

```env
# X API
X_API_BEARER_TOKEN=your_x_api_token

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Generation (optional)
AI_API_KEY=your_ai_api_key
AI_MODEL=claude-sonnet-4

# Optional: Auto-posting
AUTO_POST_ENABLED=false
```

## 🚀 Next Steps

1. ✅ Set up Supabase with schema
2. ✅ Get X API credentials
3. ✅ Deploy to Vercel
4. ✅ Test first run manually
5. ✅ Review generated posts
6. ✅ Enable auto-posting (optional)

## 📝 Notes

- **Rate Limits**: X API allows 10K requests per 15 min (Basic tier)
- **Daily Usage**: ~11 influencers × 1 request each = 11 requests/day
- **Viral Threshold**: 50K impressions - adjust based on your niche
- **Content Quality**: Always review AI-generated posts before auto-posting

---

Built for: Midnight Mess X Channel Automation
Last updated: August 16, 2026
