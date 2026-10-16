# Build workflow (agents + approval gates)

Research -> PM -> [Karim approves tickets] -> Engineer -> QA/UAT -> [Karim approves ship] -> Prod (merge to main, Render deploys)

| Stage | Agent | Output | Gate |
|---|---|---|---|
| Research | researcher | docs/research/*.md, ranked gaps | Karim picks features |
| Plan | pm | docs/backlog/<feature>.md tickets | Karim: "approved" |
| Build | engineer | feat/<ticket-id> branch, tests green | - |
| Test/UAT | qa | QA note + screenshots in docs/backlog/uat/ | Karim: "ship" |
| Prod | qa | merge to main, health check | - |

Ticket status: proposed -> approved -> in progress -> ready for QA -> ready for prod -> shipped (or back to engineer).

UAT environment: local (pnpm dev :3100) with Playwright. Optional: Render preview environments for PRs (check plan support before enabling).

Hard rules: no bids without per-bid approval; no secrets in repo or chat; no bulk eBay scraping.

Current roadmap: Phase 1 research -> Collection section -> Snipe section (done = one real snipe won within the $500 biweekly budget).
