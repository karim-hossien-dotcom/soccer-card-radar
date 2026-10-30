# Graded-card costs: reconciliation (2026-10-30)

Cost in the app = sum of the card's LedgerEntry rows (purchase + grading_fee). Sources checked: PSA account (19 completed
orders, 246 certs read from the order pages), eBay purchase history (151 items, Nov 2023 - Oct 2026), Card Ladder collection.

## Findings
- 67 graded PSA cards in the Vault; 45 have a cert, 22 have none.
- 25 certs are from the owner's own PSA orders (21 from completed orders + 4 from 27202794 / 26913701); 20 are not in any of
  the 19 orders (bought already graded, or graded before 2020): cost = purchase only.
- 14 self-graded cards are not linked to their order. 12 have no grading fee; 2 carry $32.99 that does not match their order's service.
- 42 graded cards have purchase amounts imported from Card Ladder's "purchase price" (round numbers, no date). They do not
  match the Card Ladder collection today (e.g. Mbappe Renaissance R1: $70 there, $158.55 + $85 here) and fuzzy title
  matching against eBay history returned other cards. Not changed.
- Fees on linked orders are unverified: 27202721 Regular 15 $85/card, 27202794 Regular 15 $122/card, 26913701 Value $32.99/card.
- PSA's site shows no per-order charge; the connected Gmail is not the owner's mailbox, so receipts could not be read.

## Self-graded cards missing their order (fee needed per order)
| PSA order | Service | Completed | Cert | Card | Grade | Purchase now | Fee now |
|---|---|---|---|---|---|---|---|
| 23295774 | Value Bulk (1980-Present) | 2023-06-12 | 74185907 | 2022-23 Select PL Ebiowei Zebra | 10 | $20.00 (CL) | - |
| 23295774 | Value Bulk | 2023-06-12 | 74185911 | 2021-22 Topps UCL Japan Ed. #144 Mbappe Blue | 9 | $20.00 (CL) | - |
| 23295774 | Value Bulk | 2023-06-12 | 74185921 | 2018 Prizm WC #54 Salah Silver | 10 | $15.00 (CL) | - |
| 23295774 | Value Bulk | 2023-06-12 | 74185922 | 2018 Prizm WC #54 Salah Hyper | 9 | $15.00 (CL) | - |
| 23295774 | Value Bulk | 2023-06-12 | 74185923 | 2018 Prizm WC #54 Salah Hyper | 8 | $25.00 (CL) | - |
| 24010392 | Apr Modern Sports Special | 2024-06-06 | 91094343 | 2017 Chrome UCL #24 Salah Refractor | 9 | $24.19 (eBay) | $32.99 ? |
| 24010392 | Apr Modern Sports Special | 2024-06-06 | 91094345 | 2021 Donruss Road to Qatar #116 Ronaldo Optic Blue 4/99 | 9 | $32.56 (eBay) | $32.99 ? |
| 24010392 | Apr Modern Sports Special | 2024-06-06 | 91094346 | 2018 Donruss Explosive #E1 Ronaldo Optic | 8 | $45.00 (CL) | - |
| 24163492 | June 1980-Present Special | 2024-07-29 | 93607344 | 2022-23 Chrome UCC Autographs #HE Ekitike | 10 | $15.00 (CL) | - |
| 24163492 | June 1980-Present Special | 2024-07-29 | 93607345 | 2022-23 Chrome UCC #87 Iker Bravo Future Stars | 9 | none | - |
| 24163492 | June 1980-Present Special | 2024-07-29 | 93607347 | 2022-23 Sapphire UCC #118 Mainoo | 10 | $15.00 (CL) | - |
| 24163492 | June 1980-Present Special | 2024-07-29 | 93607358 | 2020 Chrome x Aoki #68 Bellingham | 9 | none | - |
| 24163492 | June 1980-Present Special | 2024-07-29 | 93607363 | 2018 Donruss #177 Vinicius Base | 10 | $20.00 (CL) | - |
| 24163492 | June 1980-Present Special | 2024-07-29 | 93607365 | 2022-23 Immaculate #165 Vinicius Ruby | 7 | $81.48 (eBay) | - |

## Proposed fix (needs the owner's per-card fee for each order)
For each row: insert LedgerEntry(kind 'grading_fee', source 'psa', ref '<order>', amount <fee>, occurredOn <completed>);
set Card.submissionId where a Submission row exists. Replace the two $32.99 fees with the order's fee. No change to the
42 Card Ladder purchase amounts until the owner confirms them card by card.

## Photo problems found by the photo audit (docs/audits/2026-10-30-photos.md), confirmed against live data
- 5c122a47 Ronaldo Select White Jersey PSA 10 and dc607aa1 2006 Candy panel PSA 9: photo shows a slab with a different cert.
- 1732612c Mainoo Sapphire #118 PSA 10: cert 93607347 verified as base #118; the photo shows a Green copy.
- f210cf37 Salah Purple Mojo PSA 10: photo shows a raw card; no cert recorded.
Proposed: replace graded cards' photos with PSA's own cert-page scan of the owner's slab (exact copy).

## Update 2026-10-30 08:40: fees from the owner's PSA submission forms (applied)
Per-card fee = (service fee x items + insured return shipping) / items; cents spread so each order sums to the form total.
| Order | Submission | Service | Form total | Per card | Was |
|---|---|---|---|---|---|
| 27202721 | 15218639 | Regular | 8 x $79.99 + $39.99 = $679.91 | $84.98-84.99 | $85.00 |
| 27202794 | 15218640 | Regular, dual (auto) grading | 2 x $104.99 + $34.99 = $244.97 | $122.48-122.49 | $122.00 |
| 26913701 | 14972359 | Value, dual (auto) grading | 2 x $42.99 + $19.99 = $105.97 | $52.98-52.99 | $32.99 |
| 26913695 | 14972358 | Value Bulk | 52 x $24.99 + $82.86 = $1,382.34 | $26.58-26.59 | $24.99 |
64 grading_fee rows updated, ref = psa_form_<submission #>. Still needed: forms for 23295774, 24010392, 24163492 (the 14 cards above).
