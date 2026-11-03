# Grade screen calibration (G9c)

Only centering may set a grade ceiling today. Every other check (edge chipping, corner whitening, surface) is measured
and shown as a look flag, but cannot lower the ceiling until it has agreed with grades PSA actually gave.

The switch is one constant in `condition.py`:

```python
CALIBRATED = {"edges_chipping": False, "corners_whitening": False, "surface": False}
```

All three stay **off** in G9c. Turning one on is a separate change that needs Karim's approval of a calibration run
(below). After changing it, run `python3 sync_vercel.py` so the Vercel copy matches.

While a flag is off, the report still records the cap that check would set in `ceiling.would_cap` (PSA grade per
check), which is what `calibrate.py` scores.

## Collecting the scans

1. Use Karim's own PSA-graded cards only (the Vault's PSA rows).
2. For each cert, open its PSA cert page (psacard.com/cert/<cert number>) and save the front image as `<cert>.jpg`
   (and the back as `<cert>-back.jpg` if shown). The PSA API can be used instead when a token is set in the local
   environment; never paste a token into a file, commit or chat.
3. Put the images in `tools/grade-screen/calibration/` (git-ignored: the repo is public, and the scans plus grades are
   Karim's collection data). Nothing from that folder is ever committed.
4. In the same folder create `grades.csv`:

   ```
   cert,psa_grade
   12345678,9
   ```

## Running

```
cd tools/grade-screen
python3 calibrate.py calibration calibration/grades.csv
```

It prints one row per cert (the PSA cap each check would set, `-` for none) and a summary per check:

| column | meaning |
|---|---|
| judged | certs whose front was measured |
| capped | certs where the check would set a cap |
| held | caps at or above the PSA grade (the ceiling held) |
| false_caps | caps below the PSA grade: the screen would have ruled out a grade PSA gave |

A false cap is the failure G9c is about (a card ruled out of a grade it actually got). Nothing is written or changed.

## Slab plastic caveat

Cert-page scans are of the card inside a slab. The harness bypasses the sleeve/holder guard and takes the outline of the
card-shaped shape inside the slab (`condition.nested_card`). Slab plastic, its inner well and its reflections can
themselves look like edge specks or corner whitening, which is the same false-positive the guard exists to stop. So:

- poor agreement on slab scans is first a sign to photograph the same cards raw (out of the slab is not possible, so
  use raw cards from a returned order photographed before submission: `photos/` and `photos/log.csv`, see README), not
  proof the check is wrong;
- good agreement on slab scans alone is not enough to switch a check on (see the pass bar).

## Pass bar to switch a check on (proposed by the engineer, Karim approves)

For a check to move from look-only to ceiling:

1. At least 30 distinct cards judged, at least 10 of them capped by the check.
2. False caps at most 1 in 30 judged (about 3%), and **zero** false caps on cards PSA graded 10.
3. The same holds on raw phone photos of at least 10 of those cards taken before submission (rules out slab-plastic
   effects in either direction).
4. Karim reviews the printed table and approves the flag change for that one check.

Why this bar: a false cap costs a sale or a submission decision on a card that was fine, while a missed defect only costs
one grading fee, so the bar weights false caps much more heavily than misses. 30 cards is about what one returned PSA
order gives.

## Glare threshold (G9c)

`GLARE_MAX_SHARE = 0.10` in `condition.py`.

The glare mask is blown-out or near-white colourless pixels, each blob grown by its own radius + 1 mm to take in the
warm halo around a hotspot (the halo is what read as "stains" and a "dent" on the 2026-11-02 Ronaldo scan). Findings
whose box is half or more inside the mask are dropped. On a side-light photo only pixels that are not near-white in the
straight-on photo count, so a lamp pushing white ink to 255 is not called glare (the surface check already ignores
clipped pixels).

Past 10% of the card face (the 55 x 80 mm face inside the 4 mm border band, so about 440 mm^2: a hotspot core of about
5 mm radius, since its mask is grown to twice its radius + 1 mm) the straight-on
photo's surface checks (stains, print spots, registration) and that side's side-light check are cant_judge: "glare
covers N% of the card: retake with the light at an angle". Why 10%: a phone flash or desk lamp reflection on a glossy
card at normal distance is a few mm across and leaves most of the face to judge once masked; a hotspot past ~5 mm radius
means the light points straight at the card, and its halo spreads unevenly beyond what the mask can predict. Like the
other thresholds it is provisional: if calibration scans show many retakes on good photos, raise it; if halo findings
still appear, lower it.

Known limit: a scanned card whose inner face is printed pure white (255) looks like glare and goes to cant_judge.

## Holder signs (G9c review)

Constants in `condition.py` next to `holder_signs`. Measured on the card straightened from the cut edge
`borders.measure` fits (`outer.corners_px`), not the rough outline, so corners up to the 1.2 mm refit window loose are
corrected before the check.

- `PLASTIC_EDGE_MM = 0.2`: the gap sign (backdrop seen through plastic, then the card) only counts when the outline
  itself is a visible plastic edge, unlike the backdrop. Backdrop colour straight from the outline in is a loose outline
  or a dark printed border, never a holder.
- `LOOSE_OUTLINE_MM = 2.0`: backdrop straight from the outline in, up to 2.0 mm deep, is a loose outline and ignored.
  Corners 1.5 mm loose (past the refit window) must not trip; 2.0 leaves 0.5 mm for blur and a tilted hint. Deeper on
  3+ sides is a dark border on a dark backdrop that can't be told from a sleeve: measured as usual, plus cant_judge
  "front: sleeve check" with `LOW_CONTRAST_RETAKE` (retake on a lighter, contrasting backdrop), which the summary names.
- `RIM_MIN_MM = 1.5`, `RIM_MAX_MM = 3.0`, `RIM_PEAK_L = 95`, `RIM_STREAK_L = 12`: the rim sign needs a bright,
  colourless band wider than white stock or edge wear (0.3-1.0 mm) with a specular streak inside it (a near-white peak
  at least 12 L above the rest of the band, band ends trimmed 0.2 mm). Printed white borders and paper stock are flat,
  so a 2-3 mm white border does not count either.

Limits (synthetic only, needs a real-phone check of one sleeved and one unsleeved card): a penny sleeve whose edge is a
hairline under 1.5 mm with no gap shows neither sign and is measured as a raw card; a white border photographed with a
flash streak near the edge could read as a rim. Without scanner corners, a black-bordered card on a black bed is traced
at its art panel (pre-existing, not a holder question).
