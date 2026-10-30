# soccer-card-radar — Next Steps

_Last updated: 2026-05-12_

## Current state (where this session landed)

| Latest commits | What they did |
|---|---|
| `38c9261` | Apify fallback in `/api/sold-scan` when curl-cffi gets soft-banned |
| `e92ebb5` | Wired real eBay sold-comp medians into the pitch view |
| `5768a4c` | Sold/ended listings filter (broken insert + 48h freshness) |
| `bb89332` | Tooltip flips below for top-row players |
| `18de71a` | 100% Man U theme + avatar hover + lane-scoped AVOID |
| `e412657` | Real Wikipedia photos for all 23 active players |

Migration `20260512_player_sold_stats.sql` was applied to Supabase on 2026-05-12.

## Immediate next (single action)

The full sold-scan ran but eBay soft-banned this IP mid-sweep — all 25 rows
landed in `PlayerSoldStats` with `sourceStatus='blocked'`. The dashboard
gracefully shows the heuristic `predict()` strings while stats are absent.

**To populate real medians:** wait for eBay cooldown (typically 2-12 hours),
then run one of these:

```bash
# Full sweep — only safe from a cooled-down IP
curl -X POST http://localhost:3100/api/sold-scan

# Or incremental — one player at a time, never gets banned
curl -X POST "http://localhost:3100/api/sold-scan?action=cristiano-ronaldo"
curl -X POST "http://localhost:3100/api/sold-scan?action=lionel-messi"
# ...etc, one per ~10 minutes
```

After successful run, refresh the dashboard — labels under each player
change from "2x WC" / "1.5x dip" to "$1,575 fair · 7d ↓3%" etc.

## If sweeps keep getting blocked

Add an Apify token. Already wired as fallback in `/api/sold-scan`:

1. Free signup at apify.com → Settings → Integrations → API tokens
2. Add to `.env`:
   ```
   APIFY_API_TOKEN=apify_api_...
   ```
3. Re-run scan. Free scraper tries first, Apify ($4/1k) catches any that
   fail. Worst case ~$6 to populate all 25 from a fully banned IP.

## Verified state (smoke tests done this session)

- `POST /api/sold-scan?action=cristiano-ronaldo` returned **73 sales,
  median $94**, status `ok`, in 3.6s. Code path is healthy.
- Full sweep ran 25 actions in 425s. Upsert path landed all rows
  (verified `sourceStatus='blocked'` rows in PlayerSoldStats).
- Dashboard at `localhost:3100` still serving 200 OK.

## Phase 2 candidates (after data populates)

1. **Auto-cron the sold-scan** — Vercel cron + CRON_SECRET auth, every
   6h. Spreads load so no single sweep triggers the soft-ban. Estimate
   ~1h work.
2. **Sort `find_underpriced`-style** — in the deal panel, sort listings
   by `(price / fair_value_mid)` ascending so deepest discounts surface
   first. Currently sorted by price only.
3. **Card Ladder Pro integration** — dropped (their API is enterprise/
   contact-sales only and Cloudflare blocks probing).
4. **Refactor pitch-view.tsx** — ballooned to ~480 lines. Extract
   `<PlayerAvatar>`, `<HoverTooltip>`, `<DealPanel>` into separate
   files. Low priority, cleanup only.
5. **Marketplace Insights API** — if you ever apply and get approved,
   add it as the canonical first source in `/api/sold-scan` ahead of
   curl-cffi. Free + canonical.

## Architecture notes for new sessions

- Migration directory: `packages/db/migrations/<date>_<name>.sql`. No
  auto-migration tool; SQL is applied manually via Supabase SQL Editor.
- `@soccer-card-radar/shared` now exports `computeFairValue`,
  `computeSoldStats`, types `SoldSale`/`SoldStats`/`FairValue`. Same math
  as `~/Desktop/card-mcp/packages/shared/`.
- `tools/ebay_sold_scraper.py` lives at
  `packages/scrapers/ebay/scripts/ebay_sold_scraper.py`. Requires
  `pip3 install --user curl-cffi`.
- `helpers.ts.statsLabel(stats, lane, catalyst)` formats real stats with
  graceful fallback to heuristic `predict()`. Keep that fallback in mind
  when changing prediction display.
