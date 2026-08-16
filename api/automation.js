import { createClient } from '@supabase/supabase-js';

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
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: body?.detail || body?.title || body?.raw || 'X API request failed' };
  }
  return { ok: true, status: response.status, data: body?.data || null };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Use authorized POST to run diagnostics.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const env = {
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    X_API_BEARER_TOKEN: Boolean(process.env.X_API_BEARER_TOKEN),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY)
  };

  const diagnostics = { env, supabase: {}, x: {} };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    diagnostics.supabase.error = 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing';
  } else {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { count, error: countError } = await supabase
        .from('influencers')
        .select('id', { count: 'exact', head: true });
      diagnostics.supabase.influencerCount = count ?? null;
      diagnostics.supabase.countError = countError
        ? { code: countError.code, message: countError.message, details: countError.details, hint: countError.hint }
        : null;

      const { data: byHandle, error: handleError } = await supabase
        .from('influencers')
        .select('id, username, handle')
        .eq('handle', '@TTrimoreau')
        .maybeSingle();
      diagnostics.supabase.lookupByHandle = byHandle || null;
      diagnostics.supabase.handleError = handleError
        ? { code: handleError.code, message: handleError.message, details: handleError.details, hint: handleError.hint }
        : null;

      const { data: byUsername, error: usernameError } = await supabase
        .from('influencers')
        .select('id, username, handle')
        .eq('username', 'TTrimoreau')
        .maybeSingle();
      diagnostics.supabase.lookupByUsername = byUsername || null;
      diagnostics.supabase.usernameError = usernameError
        ? { code: usernameError.code, message: usernameError.message, details: usernameError.details, hint: usernameError.hint }
        : null;
    } catch (error) {
      diagnostics.supabase.exception = error.message;
    }
  }

  if (!env.X_API_BEARER_TOKEN) {
    diagnostics.x.error = 'X_API_BEARER_TOKEN is missing';
  } else {
    diagnostics.x.userLookup = await xFetch('/users/by/username/TTrimoreau');
  }

  return res.status(200).json({ success: true, diagnostics });
}
