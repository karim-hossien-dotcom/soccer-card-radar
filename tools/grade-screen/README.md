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
