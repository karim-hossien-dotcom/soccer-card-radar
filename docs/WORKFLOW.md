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

## Scheduled (run on Karim's computer so Card Ladder in Chrome works; reports saved to the card-mcp project)
| When (ET) | What | Runs as |
|---|---|---|
| Daily 11:47 UTC | eBay auction scan for the Snipe board | Vercel cron /api/scan |
| Daily 12:17 UTC | Log paid wins | Vercel cron /api/snipe/wins |
| Sun 7:43pm | Prices: Vault comps (writes by the card-comps rules) + snipe-target comps and rule max bids + audit checks -> audits/<date>-prices.md | scheduled task |
| Sun 11:13pm | Independent price audit (report only, fresh agent; re-checks every value against the sale check / comp-guard) -> audits/<date>-price-audit.md | scheduled task (cloud) |
| Mon 1:23pm | Players: player form (unapproved rows) + rookie radar with Card Ladder prices -> research/<date>-players.md | scheduled task |
| 1st of month 8:19pm | Photos audit -> audits/<date>-photos.md | scheduled task |

Every job closes its gaps (retry by another route, then a verifier agent) before reporting; first line Complete / Incomplete: N open.

Hard rules: CLAUDE.md. Owner decisions: docs/decisions.md.

Current roadmap: Collection -> Snipe (done = one real snipe won within the $500 biweekly budget).
