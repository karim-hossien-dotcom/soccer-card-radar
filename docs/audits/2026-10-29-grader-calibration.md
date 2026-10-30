# Grader calibration, 2026-10-29

Owner rule: a raw card that is not in the PSA draft (Assisted, 32 cards, created Oct 6) was held back for centering or a flaw.
Run: production /api/condition (photo screen + measurement) on each Vault photo.

## Result

All 33 photos: can't judge. No calibration signal yet.

- 14 in a toploader or holder (screen correct; Pristine autos ship in a holder).
- 19 'card outline not found': the screen passed them, but Vault photos are 375-440 px wide (~6 px/mm). Measurement needs ~2000 px on the long side (~30 px/mm).

## What calibration needs

For each held-back card: front and back photo out of the toploader, flat, straight-on, dark plain background, full phone resolution; plus the owner's reason (centering L/R or T/B, corner, edge, surface).
Then compare the check's ceiling with the owner's call; repeat for 10 draft cards as controls.

| Group | Card | Verdict |
|---|---|---|
| Held back | Wharton Pristine Auto Blue /75 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Guler Euro Neon Green /150 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Forbs Immaculate Sapphire /25 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Ronaldo Optic Purple Velocity /125 | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Musiala Pink Wave /45 | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Bellingham Winter Camo /30 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Mainoo Dynasty Black 3/5 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Mbappe Red Choice /85 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Salah Celestial /10 | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Salah Roman Numeral SSP | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Janneh Black Geometric /10 | cant_judge / Can't judge: card is in a toploader or holder |
| Held back | Raphinha Manga | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Rodrygo Mezzanine 2/5 | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Mayulu Finest #54 Black | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Zizo Red /50 | cant_judge / Can't judge: card outline not found in the photo |
| Held back | Yildiz #147 /50 (refunded?) | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Mbappe Groovy | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Leao Gold Flood | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Salah 8bit Orange | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Mainoo Merlin Blue Refractor | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Musiala Renaissance R10 | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Mora Red Geometric /5 | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Joao Pedro Gold Auto | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Haaland White Refractor | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Mane Gold Auto | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Pedri White /20 | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Ayari Gold /50 | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Ibragimov Gold /50 | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Sesko Swerve Gold /50 | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Mainoo Blue Mosaic | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Mbappe Peacock | cant_judge / Can't judge: card outline not found in the photo |
| In PSA draft | Bellingham Black Lazer Green /99 | cant_judge / Can't judge: card is in a toploader or holder |
| In PSA draft | Mainoo Gold /50 | cant_judge / Can't judge: card outline not found in the photo |

Not checked (no photo): Guler Pink Wave, Guler Red Choice Scope, Ronaldo Lost Rookie, 2006 Ronaldo #169, Messi Starball Debut, Salah Topps Now #46, two unidentified Salahs, Ronaldinho Golazo, R9 Renaissance.
Excluded: Ronaldo 2019 Sapphire Green (graded PSA 8 and cracked).

## First returned grades (order 26913701, graded 2026-10-29)

Predictions were recorded before grading (baseline-psa-26913695.csv, old mirror-symmetry method on the small scans).

| Card | Predicted | Symmetry | PSA | Read |
|---|---|---|---|---|
| 2022-23 Inception UCC Emerging Stars Auto Blue 19/49 Kobbie Mainoo | warn, L/R 58/42 | 0.455 | 10 | Miss: false warn |
| 2023-24 Topps Chrome UCC Black Lazer Auto Gold Refractor Kevin De Bruyne | warn, L/R 41/59 | 0.434 | 8, auto 9 | Direction right; 59/41 alone allows PSA 9, so the 8 came from something else (likely surface/corners on chrome) |

Lessons:
- Both fronts are full-art (no printed border). The mirror method measures the design's own asymmetry, not centering; on full-art cards it must not warn. The new border engine (borders.py) returns "needs_manual" for these instead.
- Symmetry scores of 0.43-0.46 are too weak to trust: raise the old method's floor or retire it once borders.py has real calibration data.
- Neither photo could be re-measured with borders.py: Vault photos are ~7 px/mm, PSA slab scans 15-19 px/mm with edges lost in the holder.
- From now on: scan raw cards with the phone scanner, linked to the Vault card, before they go to PSA (Grading -> Centering checks).
