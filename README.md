# X Influencer Automation

A Vercel serverless agent that monitors 11 X finance/trading accounts, stores posts in Supabase, flags posts at 50,000+ impressions, and can create up to five original draft posts for review. It never publishes to X automatically.

## Setup

### 1. Database
Run `setup-database.sql` in Supabase SQL Editor before triggering the agent.

### 2. Vercel variables
Set these under Vercel → Project → Settings → Environment Variables for Production and Preview:

- `X_API_BEARER_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` — create a long random value; this protects the POST endpoint
- `ANTHROPIC_API_KEY` — optional; without it, monitoring and viral filtering still work but no AI drafts are created

### 3. Deploy
From the repository directory:

```powershell
npm exec vercel -- --prod
```

### 4. Health check
Open:

```text
https://YOUR-VERCEL-DOMAIN/api/health
```

### 5. Manual test run
Use your actual domain and replace `YOUR_CRON_SECRET`:

```powershell
curl.exe -X POST "https://YOUR-VERCEL-DOMAIN/api/automation" -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Review results in Supabase tables `posts`, `viral_posts`, `generated_posts`, and `automation_logs`.

## Schedule
`vercel.json` is set to 05:00 UTC daily: 07:00 CEST during summer time and 06:00 CET during winter time. Vercel Cron availability depends on the project plan. If daily cron is unavailable on the current plan, trigger the endpoint via another scheduler using the same Authorization header.

## Content safeguard
Generated drafts must add distinct analysis and should be reviewed before publishing. The agent only produces drafts; it does not post, like, follow, or solicit engagement on X.
