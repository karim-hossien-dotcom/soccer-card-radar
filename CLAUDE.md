# soccer-card-radar

Karim's personal soccer-card app: Vault (collection, costs, values), Grading (grade screen, PSA orders), Snipe board
(eBay auctions and watchlist targets, max bid, budget), Dips/player form, Radar home. Next.js 14 dashboard on Vercel (soccer-card-radar.vercel.app,
behind a login), Supabase Postgres (project zsubyufjenapkgkwpqzv). The repo is PUBLIC.

## Hard rules (apply to every agent and the coordinator)
- Karim approves anything that touches money, data, bids or the live site: no buying, bidding, offers, repricing,
  merges to main, or database writes without his yes for that change. Agents report and propose; they don't apply.
- No secrets in git, chat or screenshots (tokens, keys, .env values, passwords). Never type Karim's password.
- Don't search or read Karim's email unless he asks. "Check eBay" means eBay itself.
- Never invent a price. Card values follow the card-comps skill (.claude/skills/card-comps/SKILL.md).
- No bulk eBay scraping (IP bans). No duplicate UI: extend what exists instead of adding a second control/page.
- Vault photos show only the card. Graded cards use PSA's cert-page scan of Karim's own slab.

## Coordinator (main Claude session)
Splits Karim's request into tasks, hands each to the right agent, checks the result, and brings back one plan.
Keeps memory, these files, docs/decisions.md and the scheduled tasks consistent. Workflow: @docs/WORKFLOW.md

## Agents (.claude/agents)
| Agent | Does | Writes |
|---|---|---|
| researcher | market/feature research; 90-day comps | docs/research/ |
| researcher-2 | parallel-ratio / base-move estimates when comps are thin | docs/research/*-estimates.md |
| pm | tickets with acceptance criteria | docs/backlog/ |
| engineer | one approved ticket on feat/<id>, with tests | branch |
| reviewer | reviews and fixes the engineer's branch | branch (separate review commit) |
| qa | tests, UAT screenshots, merge after "ship" | docs/backlog/uat/ |
| price-auditor | costs and values audit | docs/audits/*-prices.md |
| photo-auditor | photo = the card the row names | docs/audits/*-photos.md |

Auditors get live data as a snapshot file the coordinator exports to `.snapshots/<YYYY-MM-DD>-<name>.json`
(git-ignored: it holds costs). They refuse a snapshot that isn't from today.

## Repo map
- apps/dashboard: Next.js app (src/app per tab, src/lib logic + tests); api/*.py Vercel Python functions
  (grade screen, vendored from tools/grade-screen by tools/grade-screen/sync_vercel.py)
- apps/worker, packages/db (migrations in packages/db/migrations, applied by hand), packages/shared (value engine,
  snipe score), packages/scrapers
- docs/: WORKFLOW.md, decisions.md (owner decisions log), backlog/, research/, audits/, design/, archive/

## Commands
- `pnpm install`, `pnpm build` (turbo), dev server: `pnpm --filter @soccer-card-radar/dashboard dev` (port 3100)
- Tests: `pnpm --filter @soccer-card-radar/dashboard test`, `pnpm --filter @soccer-card-radar/shared test`,
  `cd tools/grade-screen && python3 test_borders.py && python3 test_api.py`
