# Grade screen (D1 spike): left/right centering

Reject filter for card photos. Output is `reject`, `warn`, `no_visible_issue` or `cant_measure`. It never says a card is gradable.

```
python3 centering.py [border_mm] photo1.jpg photo2.jpg ...   # border_mm = the set's nominal frame width, default 3.0
python3 test_centering.py                                    # synthetic accuracy test
```
Needs `opencv-python` and `numpy`.

How it works: finds the card's cut edge (largest card-shaped outline, so it never locks onto an inner printed frame), flattens it to 63 x 88 mm, then finds how far the printed design sits from centre by matching the outer frame bands against their mirror image. Thresholds: worse than 55/45 = warn (outside PSA 10 front tolerance), worse than 60/40 = reject. Low mirror-symmetry = cant_measure.

Synthetic result (2026-10-20): 20/20 measured, mean abs error 0.10 mm, max 0.15 mm, tilted photos on a noisy background. Best case: sharp, high-res, symmetric design.

Not covered: top/bottom centering (designs are not vertically symmetric), corners, surface, slab photos (the slab outline would be found instead of the card; needs a slab mode once the PSA scans are in).

## Validation plan (option 3)
1. PSA scans of the 46 PSA-graded Vault cards (needs PSA_API_TOKEN): agreement of reject/warn with actual grade. Pass bar: no PSA 10 rejected.
2. Phone photos of raw cards before submission, scored when grades return. Put photos in `photos/` (git-ignored) and log them in `photos/log.csv`:

```
file,card,submitted,grade
mainoo-merlin-auto-01.jpg,2022-23 Merlin Chrome Mainoo Auto,2026-10-25,
```
Photo rules: front only, no sleeve, dark plain background, straight above, card filling most of the frame, no glare.

## Results (2026-10-20)
- PSA submission 26913695/26913701 (54 raw scans, cropped at the cut edge): predictions recorded in `baseline-psa-26913695.csv` before grades. 37 no visible issue, 9 warn, 8 cant_measure. Fill `psa_grade` when the order returns. Pass bar: no PSA 10 among `warn`/`reject` beyond chance, and warn cards grade lower on average.
- eBay listings (`screen_listings.py`, 121 target listings): NOT usable yet. Spot check of 4 photos: 1 valid. Failures: slabs without a grade in the title, cards in magnetic holders/toploaders, several items in one photo, angled shots on stands; the outline found is the holder, not the card. Results were cleared from Listing and are not shown on the board.
- Next for eBay: a photo gate before centering (raw card, no holder, single card, fills the frame). That is a classification job for a vision model (D2), not edge detection.

## condition.py (D3, 2026-10-29): every PSA / BGS / TAG grading point

`python3 condition.py front.jpg [back.jpg] [--holder]` prints a JSON report:

- **Caps the grade ceiling** (checked by eye on the Ronaldo #161 test card): centering front and back against PSA
  (55/45, 60/40, 65/35; back 75/25, 90/10) and Beckett (50/50, 55/45, 60/40; back 60/40, 70/30, 80/20) tolerances;
  edge chipping / whitening specks on dark borders; corner whitening.
- **Look flags** (measured, not yet allowed to lower the ceiling): cut-line notches, waviness and roughness (TAG),
  corner dings vs the other corners, stains and print spots on light areas, colour registration.
- **Can't judge from a photo** (listed in every report): surface scratches and metallic print lines on chrome, dents,
  gloss, edge lifting/tears, corner fray under magnification, trimming, top/bottom centering.
- `--holder` (sleeve, toploader, magnetic, slab): no condition ceiling at all; plastic hides wear and adds glare.
- A front photo without a clean outline on a plain backdrop gets no ceiling.

Chip rule: lighter than the border at that spot, lighter than the brightest dots the printed pattern has next to it,
near-colourless (exposed card stock), and not continuing 1 mm inward (so printed lines that run off the edge and prism
dots are not chips). `test_condition.py` covers these cases. Thresholds are provisional until the PSA order
26913695 grades come back; `centering.py` and the pre-registered baseline are unchanged.
