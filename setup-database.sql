-- X Influencer Automation - Database Setup
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Influencers table
CREATE TABLE IF NOT EXISTS influencers (
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
CREATE TABLE IF NOT EXISTS posts (
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
CREATE OR REPLACE VIEW viral_posts AS
SELECT 
  p.*,
  i.username,
  i.handle
FROM posts p
JOIN influencers i ON p.influencer_id = i.id
WHERE p.impressions >= 50000
ORDER BY p.created_at_x DESC;

-- Generated posts table
CREATE TABLE IF NOT EXISTS generated_posts (
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
CREATE TABLE IF NOT EXISTS automation_logs (
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
CREATE INDEX IF NOT EXISTS idx_posts_impressions ON posts(impressions);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at_x);
CREATE INDEX IF NOT EXISTS idx_posts_is_viral ON posts(is_viral);
CREATE INDEX IF NOT EXISTS idx_generated_posts_status ON generated_posts(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_date ON automation_logs(run_date);

-- Insert initial influencers (11 accounts)
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
('BlackMambaMilli', '@BlackMambaMilli', 'Trading content')
ON CONFLICT (handle) DO NOTHING;

-- Create function to get daily stats
CREATE OR REPLACE FUNCTION get_daily_stats()
RETURNS TABLE (
  date DATE,
  total_posts INTEGER,
  viral_posts INTEGER,
  generated_posts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(p.fetched_at) as date,
    COUNT(DISTINCT p.id) as total_posts,
    COUNT(DISTINCT CASE WHEN p.is_viral THEN p.id END) as viral_posts,
    (SELECT COUNT(*) FROM generated_posts gp WHERE DATE(gp.created_at) = DATE(p.fetched_at)) as generated_posts
  FROM posts p
  WHERE p.fetched_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(p.fetched_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;
