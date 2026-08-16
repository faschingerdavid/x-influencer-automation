import { createClient } from '@supabase/supabase-js';

const INFLUENCERS = [
  'TTrimoreau', 'AlphaOwlTrading', 'MsVeilMoney', 'LeifInvests',
  'antibearthesis', 'OInvests', 'Brownmoose', 'cmsinvests',
  'drayinvests', 'fammetaX', 'BlackMambaMilli'
];
const VIRAL_THRESHOLD = 50000;
const MAX_RESULTS = 25;

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${secret}` || req.headers['x-cron-secret'] === secret;
}

async function xFetch(path) {
  const response = await fetch(`https://api.x.com/2${path}`, {
    headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`X API ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function getUserId(handle) {
  const result = await xFetch(`/users/by/username/${encodeURIComponent(handle)}`);
  return result.data?.id || null;
}

async function getPosts(userId) {
  const params = new URLSearchParams({
    max_results: String(MAX_RESULTS),
    exclude: 'replies,retweets',
    'tweet.fields': 'created_at,public_metrics'
  });
  const result = await xFetch(`/users/${userId}/tweets?${params.toString()}`);
  return result.data || [];
}

async function makeDraft(post, handle) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const prompt = `Write one original X post in English inspired by this market topic. Do not paraphrase or imitate the source. Add a genuinely distinct trading/investing angle, avoid invented facts, keep it under 280 characters, and end with an organic question. Source topic from @${handle}: ${post.text}`;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 180,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) return null;
  const result = await response.json();
  return result.content?.[0]?.text?.trim() || null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Use POST with authorization to run automation.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const required = ['X_API_BEARER_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) return res.status(500).json({ error: `Missing environment variables: ${missing.join(', ')}` });

  const started = Date.now();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let postsFetched = 0;
  let viralPostsFound = 0;
  let draftsCreated = 0;
  const errors = [];

  try {
    for (const handle of INFLUENCERS) {
      try {
        const { data: influencer, error: influencerError } = await supabase
          .from('influencers')
          .select('id')
          .eq('handle', `@${handle}`)
          .maybeSingle();
        if (influencerError || !influencer) {
          const diagnostic = influencerError
            ? [influencerError.code, influencerError.message, influencerError.details, influencerError.hint]
                .filter(Boolean)
                .join(' | ')
            : 'No matching row returned';
          throw new Error(`Influencer lookup failed for @${handle}: ${diagnostic}`);
        }

        const userId = await getUserId(handle);
        if (!userId) throw new Error(`X user not found: @${handle}`);
        await supabase.from('influencers').update({ x_user_id: userId, updated_at: new Date().toISOString() }).eq('id', influencer.id);

        const posts = await getPosts(userId);
        postsFetched += posts.length;
        for (const post of posts) {
          const metrics = post.public_metrics || {};
          const impressions = metrics.impression_count || 0;
          const isViral = impressions >= VIRAL_THRESHOLD;
          if (isViral) viralPostsFound += 1;
          const { data: savedPost, error: postError } = await supabase
            .from('posts')
            .upsert({
              influencer_id: influencer.id,
              x_post_id: post.id,
              text_content: post.text,
              created_at_x: post.created_at,
              impressions,
              likes: metrics.like_count || 0,
              retweets: metrics.retweet_count || 0,
              replies: metrics.reply_count || 0,
              bookmarks: metrics.bookmark_count || 0,
              is_viral: isViral,
              fetched_at: new Date().toISOString()
            }, { onConflict: 'x_post_id' })
            .select('id')
            .single();
          if (postError) throw postError;
          if (isViral && savedPost && draftsCreated < 5) {
            const draft = await makeDraft(post, handle);
            if (draft) {
              const { error: draftError } = await supabase.from('generated_posts').insert({
                source_post_id: savedPost.id,
                source_influencer: `@${handle}`,
                generated_content: draft,
                style_notes: `Original commentary based on a ${impressions.toLocaleString()}-impression source topic`,
                status: 'draft'
              });
              if (!draftError) draftsCreated += 1;
            }
          }
        }
      } catch (error) {
        errors.push(`@${handle}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - started;
    await supabase.from('automation_logs').insert({
      posts_fetched: postsFetched,
      viral_posts_found: viralPostsFound,
      posts_generated: draftsCreated,
      status: errors.length ? 'completed_with_errors' : 'completed',
      error_message: errors.length ? errors.join(' | ').slice(0, 5000) : null,
      execution_time_ms: executionTime
    });
    return res.status(200).json({ success: true, postsFetched, viralPostsFound, draftsCreated, errors, executionTimeMs: executionTime });
  } catch (error) {
    const executionTime = Date.now() - started;
    try {
      await supabase.from('automation_logs').insert({
        posts_fetched: postsFetched,
        viral_posts_found: viralPostsFound,
        posts_generated: draftsCreated,
        status: 'failed',
        error_message: error.message,
        execution_time_ms: executionTime
      });
    } catch {}
    return res.status(500).json({ success: false, error: error.message });
  }
}
