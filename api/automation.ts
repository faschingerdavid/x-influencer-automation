/**
 * X Influencer Automation - Daily Monitoring Agent
 * 
 * This Vercel cron job:
 * 1. Fetches latest posts from trading influencers
 * 2. Stores in Supabase with metrics
 * 3. Filters viral content (50K+ impressions)
 * 4. Generates derivative posts using AI
 * 
 * Runs daily at 6:00 AM CEST
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration
const INFLUENCER_HANDLES = [
  'TTrimoreau',
  'AlphaOwlTrading',
  'MsVeilMoney',
  'LeifInvests',
  'antibearthesis',
  'OInvests',
  'Brownmoose',
  'cmsinvests',
  'drayinvests',
  'fammetaX',
  'BlackMambaMilli'
];

const VIRAL_THRESHOLD = 50000; // 50K impressions
const POSTS_PER_INFLUENCER = 100; // Fetch last 100 posts

// Environment variables
const X_API_BEARER_TOKEN = process.env.X_API_BEARER_TOKEN!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AI_API_KEY = process.env.AI_API_KEY;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Get X User ID from handle
 */
async function getXUserId(handle: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.x.com/2/users/by/username/${handle}`,
      {
        headers: {
          'Authorization': `Bearer ${X_API_BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch user ${handle}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data.id;
  } catch (error) {
    console.error(`Error fetching user ${handle}:`, error);
    return null;
  }
}

/**
 * Fetch latest posts from a user
 */
async function getUserPosts(userId: string, maxResults: number = 100) {
  try {
    const response = await fetch(
      `https://api.x.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=public_metrics,created_at,text`,
      {
        headers: {
          'Authorization': `Bearer ${X_API_BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch posts for ${userId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching posts for ${userId}:`, error);
    return [];
  }
}

/**
 * Generate derivative post using AI
 */
async function generateDerivativePost(
  originalPost: string,
  influencer: string,
  style: string = 'trading_analyst'
): Promise<string> {
  if (!AI_API_KEY) {
    // Fallback: simple template-based generation
    return generateTemplatePost(originalPost, influencer);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 280,
        messages: [{
          role: 'user',
          content: `You are a trading analyst creating original content for X. Transform this viral post into your own unique take while maintaining the core insight.

VIRAL POST from @${influencer}:
"${originalPost}"

YOUR TASK:
1. Keep the hook structure but change the example
2. Add your unique trading perspective or specific ticker analysis
3. Make it sound like YOUR voice, not a copy
4. Include a CTA for replies or engagement
5. Keep under 280 characters

RULES:
- Must add original value (your analysis, different angle, specific data)
- Don't just swap synonyms - actually transform the perspective
- Add your expertise (technical analysis, market context, contrarian view)

OUTPUT: Only the transformed post text, nothing else.`
        }]
      })
    });

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('AI generation failed:', error);
    return generateTemplatePost(originalPost, influencer);
  }
}

/**
 * Fallback template-based generation
 */
function generateTemplatePost(originalPost: string, influencer: string): string {
  const patterns = [
    /(\$[A-Z]+)/g, // Tickers
    /(\d+)%/g, // Percentages
    /(bullish|bearish|long|short)/gi // Sentiment
  ];

  const tickers = originalPost.match(patterns[0]) || ['$NVDA'];
  const sentiment = originalPost.match(patterns[2])?.[0] || 'bullish';
  
  const templates = [
    `Most traders are missing this about ${tickers[0]}... Here's what the charts actually show: [your analysis]. What's your take?`,
    `Everyone's ${sentiment} on ${tickers[0]} right now. But here's the contrarian view nobody's talking about...`,
    `3 rules I follow for ${sentiment} trades on ${tickers[0]}: 1) [rule] 2) [rule] 3) [rule]. Save this.`,
    `The ${tickers[0]} setup looking ${sentiment} here. Key levels to watch: [levels]. Not financial advice.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Main automation function
 */
export async function POST() {
  const startTime = Date.now();
  let postsFetched = 0;
  let viralPostsFound = 0;
  let postsGenerated = 0;

  try {
    console.log('🚀 Starting X influencer automation...');

    // Step 1: Fetch all influencer posts
    for (const handle of INFLUENCER_HANDLES) {
      console.log(`📊 Fetching posts from @${handle}...`);

      // Get user ID
      const userId = await getXUserId(handle);
      if (!userId) continue;

      // Update influencer record in DB
      await supabase
        .from('influencers')
        .update({ x_user_id: userId, updated_at: new Date().toISOString() })
        .eq('handle', `@${handle}`);

      // Fetch posts
      const posts = await getUserPosts(userId, POSTS_PER_INFLUENCER);
      postsFetched += posts.length;

      // Store posts in database
      for (const post of posts) {
        const metrics = post.public_metrics || {};
        const impressions = metrics.impression_count || 0;
        const isViral = impressions >= VIRAL_THRESHOLD;

        if (isViral) viralPostsFound++;

        // Insert or update post
        const { error } = await supabase
          .from('posts')
          .upsert({
            influencer_id: (await supabase
              .from('influencers')
              .select('id')
              .eq('handle', `@${handle}`)
              .single()).data?.id,
            x_post_id: post.id,
            text_content: post.text,
            created_at_x: post.created_at,
            impressions: impressions,
            likes: metrics.like_count || 0,
            retweets: metrics.retweet_count || 0,
            replies: metrics.reply_count || 0,
            bookmarks: metrics.bookmark_count || 0,
            is_viral: isViral,
            fetched_at: new Date().toISOString()
          }, {
            onConflict: 'x_post_id'
          });

        if (error) {
          console.error(`Error storing post ${post.id}:`, error);
        }
      }
    }

    console.log(`✅ Fetched ${postsFetched} posts, found ${viralPostsFound} viral posts`);

    // Step 2: Generate derivative posts from viral content
    if (viralPostsFound > 0) {
      console.log('🤖 Generating derivative posts...');

      // Get top 10 viral posts
      const { data: viralPosts } = await supabase
        .from('viral_posts')
        .select('*, text_content, handle')
        .order('impressions', { ascending: false })
        .limit(10);

      if (viralPosts) {
        for (const post of viralPosts) {
          const generatedContent = await generateDerivativePost(
            post.text_content,
            post.handle.replace('@', '')
          );

          const { error } = await supabase
            .from('generated_posts')
            .insert({
              source_post_id: post.id,
              source_influencer: post.handle,
              generated_content: generatedContent,
              style_notes: `Derived from viral post (${post.impressions} impressions)`,
              status: 'draft'
            });

          if (!error) postsGenerated++;
        }
      }
    }

    console.log(`✅ Generated ${postsGenerated} new posts`);

    // Step 3: Log execution
    const executionTime = Date.now() - startTime;
    await supabase.from('automation_logs').insert({
      posts_fetched: postsFetched,
      viral_posts_found: viralPostsFound,
      posts_generated: postsGenerated,
      status: 'completed',
      execution_time_ms: executionTime
    });

    console.log(`🎉 Automation completed in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      postsFetched,
      viralPostsFound,
      postsGenerated,
      executionTimeMs: executionTime
    });

  } catch (error) {
    console.error('❌ Automation failed:', error);

    // Log error
    await supabase.from('automation_logs').insert({
      posts_fetched: postsFetched,
      viral_posts_found: viralPostsFound,
      posts_generated: postsGenerated,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      execution_time_ms: Date.now() - startTime
    });

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Export GET handler for testing
export async function GET() {
  return NextResponse.json({
    message: 'X Influencer Automation Agent',
    status: 'active',
    influencers: INFLUENCER_HANDLES.length,
    nextRun: 'Daily at 6:00 AM CEST'
  });
}
