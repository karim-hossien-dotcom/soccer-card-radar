# Deploying soccer-card-radar to Render

Replaces the brittle ngrok tunnel for the eBay account-deletion notification
endpoint with a stable production URL. Once deployed, you can stop running
ngrok entirely.

## One-time setup (10-15 minutes)

### 1. Push to a new private GitHub repo

```bash
cd ~/Desktop/builds/soccer-card-radar
gh auth status                                 # confirm you're logged in
gh repo create soccer-card-radar --private --source=. --remote=origin --push
```

If `gh` isn't installed: `brew install gh && gh auth login`.

If you already have a repo created via the web UI, skip `gh repo create` and:
```bash
git remote add origin https://github.com/karim-hossien-dotcom/soccer-card-radar.git
git push -u origin main
```

### 2. Create the Render Web Service

1. Go to render.com → "New" → "Blueprint"
2. Connect your GitHub account if not already
3. Select the `soccer-card-radar` repo
4. Render detects `render.yaml` and pre-fills everything
5. Hit "Apply"

### 3. Paste env vars in the Render dashboard

After the blueprint is applied, click into the service → Environment tab.
The blueprint declares these as `sync: false` so you paste values manually
(safer than committing them).

Copy each value from your local `.env`:

| Render env var | Source in local .env |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | same key |
| `SUPABASE_SERVICE_ROLE_KEY` | same key |
| `EBAY_APP_ID` | same key |
| `EBAY_CERT_ID` | same key |
| `EBAY_DEV_ID` | same key |
| `EBAY_USER_TOKEN` | same key |
| `APIFY_API_TOKEN` | optional — leave blank for now |

### 4. First deploy

Render auto-builds on save. First build takes ~3-5 min (pnpm install + turbo build).
Watch the build log; if it errors, copy the last 30 lines and paste them back.

When it's green, the service URL is at the top of the dashboard page —
typically `https://soccer-card-radar.onrender.com`.

### 5. Verify the eBay endpoint is reachable

```bash
curl "https://soccer-card-radar.onrender.com/api/ebay/account-deletion?challenge_code=test123"
```

Should return `{"challengeResponse":"<sha256-hash>"}` with HTTP 200.

### 6. Update eBay's developer portal

1. Go to developer.ebay.com → "My Account" → "Application Keys" (PROD)
2. Find "Marketplace Account Deletion Notification" section
3. Change the endpoint URL from the dead ngrok one to:
   ```
   https://soccer-card-radar.onrender.com/api/ebay/account-deletion
   ```
4. Click "Send Test Notification" — should return success

### 7. Kill ngrok

```bash
pkill ngrok
```

You can leave the static-domain reservation on your ngrok account; if you
want, free it up at dashboard.ngrok.com → Domains.

## What's NOT in this deploy (and why)

- **The Python curl-cffi scraper** — Render's Node runtime doesn't include
  Python, so `/api/sold-scan` won't have access to `python3` in the
  container. It'll return a clean error if invoked in production.
  Run sold-scans locally (`pnpm dev` → POST to localhost). The production
  service is just for serving the UI + the eBay webhook receiver.
- **A custom domain** — Render gives you `*.onrender.com` for free. Add
  your own domain later in the dashboard if/when needed.
- **Auto-cron the sold-scan** — separate work; not enabled by this deploy.

## Free-tier caveats

Render free web services sleep after 15 min of inactivity. First request
after sleep takes ~30s to wake (cold start). For an eBay webhook receiver
this is mostly fine — eBay retries with exponential backoff if their first
delivery times out — but for a real production dashboard you'd want to
upgrade to the Starter plan ($7/mo) to keep it warm.
