# R1: Karim's Nov 19 2026 pricing rules in code (status: proposed)

Why: card-mcp audits/2026-11-19-cycle-audit.md. Rules: card-mcp rules/card-comps-rules-2026-11-19.md.
Rule: value = 90-day median of the exact card's sales, else the Card Ladder value for that exact card and grade,
else no value. No estimates (thin_blend, base-move, ratios, proxies). No grade derivation.

Scope
1. Done: the card-comps skill change shipped with the Nov 19 restructure (commit 6e03b22). Nothing to do.
2. comp-guard: refuse source `estimate` for new CardComp rows (new error code `estimate_withdrawn`); keep the 90-day
   sale check. thin-blend CLI: leave the code, mark it unused in its header; remove it from the skill and job prompts.
3. value-engine.ts valueCard: graded values only from comps of that grade (drop psa10FromPsa9, psa9FromPsa10,
   psa8FromPsa9 and bands; remove Multiples from EngineConfig). Update value-engine.test.ts. Dashboard: drop the "est."
   marker (grading-view.tsx:84) and the band note (collection-view.tsx:312); "No comps" stays the decision when PSA 9 is missing.
4. packages/db/migrations/20261119_card_protected.sql (applied by hand Nov 19) + database.types.ts.
5. After ship (data, with Karim's yes): delete Assumption rows psa_10_psa_9_multiple_no_psa_10_comp,
   psa_9_psa_10_multiple_no_psa_9_comp, psa_10_raw_multiple_only_raw_comps, psa_9_raw_multiple_only_raw_comps,
   psa_8_psa_9_multiple_no_psa_8_comp and band_*; set CardValueSnapshot psa10/psa9/psa8 to null where no CardComp of
   that grade matches (76 of 121 raw/at-grader rows on Nov 19). Backup: schema backup, tables *_20261119.
   Do NOT delete the Assumption rows before the code ships: the Collection page reads them on every load.

Acceptance
- shared and dashboard tests green; comp-guard rejects a source estimate comp.
- A raw card with only a raw comp shows no PSA 10/9/8 value and decision "No comps".
- Vault and Grading pages render with no "est." marker (UAT screenshots, desktop and 390px).

## Migration already applied by hand (add as packages/db/migrations/20261119_card_protected.sql)
    alter table public."Card" add column if not exists protected boolean not null default false;
    comment on column public."Card".protected is 'Karim: never trade, list or bundle unless the deal is for a bigger card and he approves that deal.';
    update public."Card" set protected = true where id in ('b738fdc4-0080-5b81-a7a7-8d79b9bb41db','19a84c62-fad1-54ea-9091-a64780c80441');

## Status: ready for prod (built and checked Nov 19 2026; waiting for Karim's "ship")
- Scope 2: comp-guard CLI now runs `compGuardPolicy`, which refuses source `estimate` with `estimate_withdrawn`; market comps unchanged. thin-blend marked unused.
- Scope 3: value-engine graded values come only from comps of that grade; Multiples, bands, bandFor, printRun removed; "est." marker (Grading) and band note (Vault drawer) removed; decision "No comps" when neither PSA 9 nor PSA 10 has a comp.
- Scope 4: packages/db/migrations/20261119_card_protected.sql (already applied by hand) + Card.protected in database.types.ts.
- Tests: shared 117/117, dashboard 117/117; tsc clean for shared and dashboard; `pnpm build` green.
- UAT (fixture data, desktop 1280 and phone 390): no "est." markers on Vault (PSA 10 view) or Grading; drawer shows PSA 9/PSA 8 as "—" where there is no comp (Raphinha Manga: PSA 10 $1,090 from its comp, PSA 9 no longer $436 from a multiplier); no sideways scroll on phone. Screenshots: kept locally, not committed (public repo: they show costs).
- After ship (data, needs Karim's yes): delete the Assumption multiplier and band rows; clear CardValueSnapshot psa10/psa9/psa8 that match no comp of that grade (backup schema holds a copy).
