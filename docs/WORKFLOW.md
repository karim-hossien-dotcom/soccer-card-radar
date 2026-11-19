# Workflow (one coordinator, three workstreams, approval gates) — Nov 19 2026

Karim -> coordinator (main Claude session) -> one of three workstream skills -> report -> [Karim's yes] -> applied.
The coordinator is the only writer. Subagents read (researcher) or check (checker). App changes go through the builder.

| Workstream | Skill | Typical output | Gate |
|---|---|---|---|
| My Vault | vault | values, costs, photos, grading picks, snipe targets | approved job rules; anything else Karim's yes |
| eBay | ebay | listing drafts (card-mcp ebay/), saved snipe candidates | every listing and every bid: Karim's yes |
| Veriswap | veriswap | ready-to-send offer list (card-mcp veriswap/) | every offer: Karim's "send N" |

| Helper | When | Output |
|---|---|---|
| researcher | several independent lookups at once (players, sets, 90-day sales) | compact table to the coordinator |
| checker | before anything is written, sent or shipped; Sunday price audit; monthly photos | report, first line Pass / Fail: N |
| builder | any app change | ticket -> "approved" -> branch + tests -> checker -> UAT screenshots -> "ship" -> merge |

Ticket status: proposed -> approved -> in progress -> checked -> ready for prod -> shipped (or back to builder).
Every agent reports first and changes nothing (data, money, bids, live site) without Karim's yes.
UAT environment: local (`pnpm --filter @soccer-card-radar/dashboard dev`, port 3100) with Playwright.

## Scheduled (run on Karim's computer so Card Ladder in Chrome works; reports saved to the card-mcp project)
| When (ET) | What | Workstream |
|---|---|---|
| Daily 11:47 UTC | eBay auction scan for the Snipe board (Vercel cron /api/scan) | eBay |
| Daily 12:17 UTC | Log paid wins (Vercel cron /api/snipe/wins) | eBay |
| Daily morning | Veriswap check: offers, interests, asks, ready-to-send list (report only) | Veriswap |
| Sun 7:43pm | Prices: ownership, costs, values (90-day or CL value), snipe targets and rule max bids | Vault |
| Sun 11:13pm | Independent price audit (checker, prices mode; report only) | Vault |
| Mon 1:23pm | Players: form + rookie radar (researcher) | Vault (research) |
| 1st of month 8:19pm | Photos (checker, photos mode) | Vault |

Every job closes its gaps (retry another route, then the checker) before reporting; first line Complete / Incomplete: N open.
Hard rules: CLAUDE.md. Owner decisions: docs/decisions.md.
