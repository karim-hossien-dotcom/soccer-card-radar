# Build workflow (agents + approval gates)

Coordinator (main Claude session) -> Research -> PM -> [Karim approves tickets] -> Engineer -> Reviewer -> QA/UAT
-> [Karim approves ship] -> Prod (merge to main, Vercel deploys)

| Stage | Agent | Output | Gate |
|---|---|---|---|
| Coordinate | main session | one plan; tasks handed to agents; memory, CLAUDE.md, docs/decisions.md and scheduled tasks kept in line | Karim approves the plan |
| Research | researcher (+ researcher-2 for thin comps) | docs/research/*.md, ranked gaps or value proposals | Karim picks features / approves values |
| Plan | pm | docs/backlog/<feature>.md tickets | Karim: "approved" |
| Build | engineer | feat/<ticket-id> branch, tests green | - |
| Review | reviewer | review note + separate review(<id>) fix commit | - |
| Test/UAT | qa | QA note + screenshots in docs/backlog/uat/ | Karim: "ship" |
| Prod | qa | merge to main, Vercel deploy green, health check | - |
| Audit | price-auditor, photo-auditor | docs/audits/*.md with proposed SQL | Karim approves each fix |

Ticket status: proposed -> approved -> in progress -> ready for review -> ready for QA -> ready for prod -> shipped
(or back to engineer).

Every agent reports first and changes nothing (data, money, bids, live site) without Karim's yes.

UAT environment: local (`pnpm --filter @soccer-card-radar/dashboard dev`, port 3100) with Playwright.

## Scheduled (report-only unless noted)
| When (ET) | What | Runs as |
|---|---|---|
| Daily 11:47 UTC (7:47am EDT) | eBay auction scan for the Snipe board | Vercel cron /api/scan |
| Daily 12:17 UTC (8:17am EDT) | Log paid wins | Vercel cron /api/snipe/wins |
| Sun 7:43pm | Vault comps refresh (inserts new CardComp rows by the card-comps rules; proposals for anything uncertain) | scheduled task |
| Sun 10:17pm | Price audit | scheduled task |
| Mon 1:23pm | Player form (unapproved rows for Karim to approve) | scheduled task |
| Thu | Snipe targets / watchlist re-check with 90-day comps | scheduled task |
| 1st of month | Photo audit | scheduled task |

Hard rules: CLAUDE.md. Owner decisions: docs/decisions.md.

Current roadmap: Collection -> Snipe (done = one real snipe won within the $500 biweekly budget).
