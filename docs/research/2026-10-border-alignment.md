# Border alignment for the grading pre-check, Oct 29 2026

All sources checked 2026-10-29. Facts are sourced; lines marked **Inference** are my reasoning; numbers marked **Benchmark** are vendor or third-party claims we have not reproduced.

## Question and what "better" means
Question: what is the most accurate and repeatable way to find a card's cut edges and its printed inner frame from a phone photo, so the same card gives the same centering answer every time?

"Better" for Karim means: (1) the same card photographed twice gives the same L/R and T/B to within about 1 point (for example 54/46 vs 55/45); (2) it works weekly on raw cards at home without fiddling; (3) it stops paid grading submissions that centering alone would cap below a 10, which is where the money is saved.

## Why the current pipeline gives inconsistent output (from reading the repo)
These are facts about our code, not the market.
1. **The inner border is never measured.** `centering.lr_offset_mm` finds a left/right shift by mirror-matching edge energy, then `assess` turns it into a ratio using an assumed `border_mm=3.0`. The ratio depends on that guess, not on the card. Top/bottom is not measured at all. Non-symmetric designs return "can't measure".
2. **Corners are coarse.** The phone hint is found by scanic on a still shrunk to 1280 px (`scanner.tsx` `cornersOf`), and the server uses the hint as-is (`condition.quad_from_hint`). On a 4032 px still, 1 px at 1280 is about 3 px at full resolution, before contour-approximation error. `find_card` also takes corners from `approxPolyDP` on a dilated Canny map, which sits about a pixel outside the true edge.
3. **Resolution is thrown away.** `condition.load` warps every card to 10 px/mm, even when the phone photo has about 35 to 40 px/mm (Inference: a 4032 x 3024 still with the card filling about 80% of the short side gives roughly 2400 px across 63 mm, about 38 px/mm).
4. **No user confirmation step.** There is no point where a person checks or adjusts the lines, so one bad detection becomes a wrong answer with no warning.

## How much accuracy is needed
- Ratio = L / (L + R). At 50/50 with border width b, moving one edge by d shifts the ratio by d / (4b). Opposite errors on both sides shift it by d / (2b). (Arithmetic.)
- Blake Crosley's worked numbers agree: on a 2.4 mm border, a 600 dpi scan (0.042 mm/px) moves the ratio 0.88 points for one pixel of error each way; a phone shot at about 727 px across the card (0.087 mm/px) moves it about 1.8 points. 55/45 and 60/40 are only 5 points apart. [blakecrosley]
- To keep the worst case within 1 point on a 2.4 mm border, each edge must be placed within about 0.05 mm. That is about 21 px/mm if edges are found to the nearest pixel, or roughly 5 to 10 px/mm if sub-pixel line fitting reaches 0.2 to 0.5 px. **Inference**: the sub-pixel figure is typical for straight-edge fitting over hundreds of points, but I found no source that states it for card photos; we must measure it on our own cards.
- Consequence: Vault photos (about 6 px/mm) cannot support a centering verdict at 1-point accuracy even with perfect detection. Full-resolution phone stills can.

## (a) Comparison of options

| Option | Method | Outer edge | Inner border | Runs in | Licence / maintenance | Accuracy claim | What it misses | Effort for us |
|---|---|---|---|---|---|---|---|---|
| **cardcentering.app / mf11y/card-centering-app** | ML (ONNX in browser) for the outline; learned ranking of inner-border candidates with a heuristic fallback; user checks and nudges every guide (d-pad, zoom, step size); optional curved-edge assist | Auto + manual correct | Auto starting estimate + manual | Browser (SvelteKit, ONNX Runtime Web) | No licence stated, so do not copy code; 147 commits | None. Site says the glow "reflects guide positions, not verified accuracy" | No accuracy data; still needs the user | Pattern to copy: M |
| **gottasellemall69/card-centering-calculator** | OpenCV.js contour, perspective rectify, finds inner frame bounds, measures all four sides; drag outer and inner guides if wrong; falls back to a default inset if the inner frame is not found | Auto + manual | Auto + manual | Browser (Next.js, OpenCV.js) | MIT; 20 commits | None | The default-inset fallback can hide a failed detection | Closest to our stack: M |
| **ElitePete/card-centering-studio** | Manual only: two clicks to straighten, then 4 outer guides and 4 inner guides | Manual | Manual | Desktop Python (PySide6, OpenCV) | MIT (2026) | None. Aims for "repeatable" results from flatbed scans | No automation; flatbed scans only | Reference for the manual path: S |
| **Kiradex (described by Blake Crosley)** | Apple Vision rectangle detection; colour-step walks (31 per side, middle 30 to 70%); median; must agree on 3 of 5 | Auto | Auto (colour step) | iOS | n/a | None. Author lists phone accuracy as "unproven" | Misses tilt at the ends (50/50 at the median vs 60/40 at the worst point); stops early on small print near the border | Lessons only |
| **Card Centering Calculator (iOS, id6661022837)** | Auto edge detect, then adjust guides by hand; camera level indicator | Auto + manual | Auto + manual | iOS | Paid premium $4.99 | 4.7 stars from 2.5K ratings. Reviewers: "you have to be on point as possible" | Paywalled; no published error figures | Market proof of the auto + confirm pattern |
| **Centering50 (iOS)** | "Smart-Snap AI" detect + fine-tune; manual anchor mode with 15x zoom | Auto + manual | Auto + manual | iOS | Subscription $4.99/mo | **Benchmark** "0.1% precision" (no method or test shown) | Claim unsupported; 44 ratings | None |
| **cardgrader.ai centering calculator** | Manual: drag red lines to the outer edges, blue lines to the inner border | Manual | Manual | Web | Free | Says "exact percentage" (no validation) | Front only | None |
| **PreGradeCards / CardGrade.io** | Server-side AI finds four edges against the background | Auto | Not described | Web + server | Commercial | None published | No user confirmation described; advise a 600 dpi flatbed for non-holo centering | None |
| **AGS (grader)** | "Boundary detection", "pixel-rated measurements" | Auto | Not described | In-house | Commercial | **Benchmark** "±0.1% accuracy", no method | Not reproducible | None |
| **scanic (current)** | WASM Gaussian, Canny, dilate, contour scoring, multi-epsilon polygon fit | Auto, pixel-level | No | Browser | MIT | "Pinpoint accuracy", no numbers; works on a downscaled image (default 800 px) | No sub-pixel refinement; no inner border | Already in; keep for live framing |
| **jscanify** | OpenCV.js document scanner | Auto | No | Browser / Node | MIT | None | About 31 MB of OpenCV.js (earlier phone-scan research) | Not worth switching |
| **DocAligner** | Heatmap corner model (FastViT/MobileNetV2 + BiFPN); author dropped direct point regression because of "amplification error" | Auto, robust to clutter | No | Python, ONNX Runtime | Apache-2.0; 114 stars, no releases | None published on the page | Not trained on cards; corners only | L (fine-tune + host) |
| **jslok/card-scanner (RTM-Det)** | Instance segmentation mask, then contour + warp | Auto; handles full-art where Canny struggles | No | Python; TFLite conversion in progress | No licence stated | Mask mAP 0.90 | Mask edges are not precise enough to measure from directly (Inference) | L |
| **OpenCV LSD / fitLine** | Line-segment detector; robust line fitting (Huber and others) | Building blocks for sub-pixel edges | Building blocks | Python (opencv-python-headless ≥4.10 in our requirements) | Apache-2.0 (OpenCV). LSD was removed in 4.1.0 to 4.5.3 and restored after the NFA code was relicensed MIT | n/a | Needs our own logic | S to M |
| **Flatbed scan at 600 dpi** | Fixed geometry, 23.6 px/mm | Near-perfect | Easy | Any | n/a | 0.88 points per pixel each way on a 2.4 mm border [blakecrosley] | Not the weekly phone flow; light bar glare on foil (CardGrade.io) | Reference path: S |

Not fetched: Reddit (reddit.com is not on this session's allowlist; one r/PokeGrading thread was read through a mirror), the ResearchGate paper (fetch failed), and the Roboflow centering dataset (fetch failed). Ludex, CollX, Gemrate and TCGrader publish no centering method I could find. Treat the Reddit evidence as thin.

### What collectors report (r/PokeGrading thread via mirror, Apr 10 2025, plus App Store reviews)
- Builder of a browser tool: four corner drag points plus perspective warp for the outer edge, and a second image for the inner border. Users asked for larger handles and an offset because "my finger is in the way" on Android. Tilt while shooting and bowed cards were the main problems; the fix offered was flattening the card in a penny sleeve and card saver.
- A careful user measures at several points along each edge and compares bowed parts with bowed parts. This matches PSA graders measuring at the worst point. [blakecrosley]
- App Store reviewers credit the camera level indicator and careful guide placement for good results.

## (b) Top 3 approaches, ranked by (accuracy x consistency) / effort for our stack

1. **Sub-pixel classical refinement on the server, then the user confirms (recommended).** Phone sends the full-resolution still plus scanic corners. The server fits a line to each cut edge at sub-pixel level, then searches for the inner frame along each side, returns 8 lines with a confidence score, and the user confirms or nudges them. Accuracy: high on bordered cards. Consistency: high, because the result comes from fixed arithmetic on lines the user has confirmed. Effort **M**. It fixes all four causes above. Same pattern as cardcentering.app, gottasellemall69 and Card Centering Calculator.
2. **Manual guides on a rectified, magnified image (fallback and calibration).** No auto inner detection; the user drags 8 guides with a zoom loupe. Accuracy depends on the user but is repeatable with a loupe and nudge buttons (ElitePete, cardgrader.ai). Effort **S**. Required anyway for borderless, full-art and heavy-foil cards, where automatic inner detection is unreliable.
3. **ML outline model (DocAligner-style heatmap or RTM-Det segmentation) feeding step 1.** Fixes outline failures on clutter, low contrast and full-art. It does not measure the inner border, and its corners still need step 1's refinement. Effort **L** (labelled card data, ONNX hosting, cold-start size on Vercel). Do this only if step 1's logs show outline failures are the main reason measurements fail.

Not ranked: auto-only with no user confirmation (Kiradex, CardGrade.io style). It cannot give the same answer every time on borderless, foil or tilted-print cards, and no vendor publishes repeatability figures.

## (c) Recommended design

**Phone (browser)**
1. Keep scanic on the live preview for framing, steadiness and glare hints only. Its corners are a starting point, not a measurement.
2. Add a level indicator (DeviceOrientation) and require the phone to be within about 3° of flat before auto-capture. Reviews and the Reddit thread both name tilt as the top error.
3. Capture the full-sensor still (ImageCapture.takePhoto where supported). Send the original file without resizing, plus the scanic corners as a hint. Optionally take 3 stills per side for the repeatability check in step 9.

**Server (Python on Vercel)**
4. **Outer edge refinement.** For each side, take 100 to 300 short intensity/gradient profiles at right angles to the hinted edge, inside a band of about ±2 mm. Find the sub-pixel gradient peak in each profile (parabolic or Gaussian fit, as in Flesia et al. 2014). Fit a line with RANSAC, then least squares on the inliers (`cv2.fitLine`, Huber). Intersect the 4 lines to get the corners. Use LSD as a second opinion when profiles are noisy. Record the inlier ratio and RMS residual for each side.
5. **Rectify at high resolution.** Warp to at least 25 px/mm (1575 x 2200), not 10. Better: measure inner borders on profiles in source-image coordinates and map only the line equations through the homography.
6. **Inner frame search.** For each side, sample the border colour just inside the cut edge (Lab). Walk inward along about 40 profiles spread over 5 to 95% of the side, not only the middle third (Kiradex's tilt blind spot). Mark candidate steps where colour difference or gradient rises above a threshold. Keep the step that is (a) consistent across profiles, (b) straight under a line fit, and (c) roughly parallel to the outer edge. Rank candidates by inlier count. Report two numbers per side: the line-fit width and the worst-point width (PSA judges the worst point).
7. **Use what we know about each set (optional, later).** Store confirmed inner-frame offsets per set and parallel (for example 2018 Prizm World Cup) and use them as the starting guess and a sanity range. This replaces the hard-coded `border_mm=3.0`.
8. **Confidence and refusal.** Return "needs manual" when a side has fewer than about 60% inliers, a residual above about 0.5 px, no inner-frame candidate, or the photo is below 20 px/mm. Never quietly fall back to a default inset (the gottasellemall69 risk).
9. **Repeatability check.** With 3 stills, run steps 4 to 6 on each. Report the median ratio and the spread. If L/R or T/B spreads by more than 1.5 points, mark the result "unstable, retake".

**User confirmation (phone)**
10. Show the rectified card with 8 lines: 4 cut edges and 4 inner frame lines. Each line is coloured by confidence. Give each line a loupe and nudge buttons in 0.05 mm steps, with an offset handle so the finger does not hide the edge (Reddit request). The user taps "Confirm" or adjusts.
11. Compute the ratios only from the confirmed line positions, with fixed arithmetic. Store the lines, image hash, px/mm and who confirmed them, so the same photo always gives the same answer and re-running an old check gives identical output.
12. Front and back are measured separately (PSA back tolerance 75/25 is already in `condition.py`).

## (d) Photo and setup rules to require
- Raw card, out of the toploader, one-touch or slab, for centering. A penny sleeve is allowed only for the outline check, and the user must confirm the edges. Our `holder` flag already exists; for centering, a holder should mean "manual only".
- Plain matte backdrop that contrasts with the card edge: dark for white borders, light for black borders.
- Phone flat within about 3°, card filling at least 70% of the frame, full-resolution still, no digital zoom, no flash, diffused light. For foil, light from the side.
- At least 20 px/mm at the card (below that: "too small to measure centering"). Vault and listing photos at about 6 px/mm get "can't measure centering", not a ratio.
- Card flat. A bowed card fails the straightness check in step 4 and goes to manual.
- Optional gold standard: a 600 dpi flatbed scan (23.6 px/mm) for submit-or-not calls near a threshold.

## (e) Risks
- **Unverified accuracy.** No source publishes phone-photo centering accuracy; every vendor number is a **benchmark**. Mitigation: before trusting it, photograph 10 cards 5 times each, compare with 600 dpi scans, and show whole-number ratios only if the worst error is 1 point or less (the test proposed by Blake Crosley).
- **Lens distortion.** A wide lens bends straight edges near the frame edge. Mitigation: keep the card in the centre at 1x zoom, and treat a curved-edge residual as a reason to refuse.
- **Inner border ambiguity.** Prizm and Select designs have several nested frames, and foil patterns create false steps. A wrong candidate can look confident. Mitigation: per-set offsets, the parallel check, user confirmation.
- **Borderless / full-art.** There is no printed border, so centering is defined by graders' judgment of the artwork. Use manual only and label it that way.
- **Vercel limits.** Full-resolution images (3 to 5 MB) times 3 stills times 2 sides will hit upload and time limits. Mitigation: upload direct to Supabase Storage and run the measurement there, or crop to the card plus margin on the phone before upload (only cropping, no resizing).
- **User drift.** Manual nudging brings back the inconsistency it is meant to fix. Mitigation: log how far the user moved each line from the auto line. Large, frequent moves on one set show where auto detection needs tuning.
- **ToS / licences.** No eBay API, scraping or ToS issues. Do not copy code from cardcentering.app / mf11y or jslok (no licence). ElitePete, gottasellemall69, scanic and jscanify are MIT; DocAligner is Apache-2.0.

## Gap ranking

| Gap | Weekly use | Money impact | Effort | Score |
|---|---|---|---|---|
| Measure the inner border (4 sides) instead of assuming 3 mm | High | High | M | 1 |
| Confirm/adjust screen for 8 lines + stored result | High | High | S-M | 2 |
| Sub-pixel outer edge refinement at full resolution | High | Med-High | S-M | 3 |
| Resolution gate (≥20 px/mm) + 3-shot repeatability check | Med | Med | S | 4 |
| ML outline model | Low-Med | Low-Med | L | 5 |

## Sources (all checked 2026-10-29)
- mf11y/card-centering-app: https://github.com/mf11y/card-centering-app
- Card Centering Tool (cardcentering.app): https://cardcentering.app/
- gottasellemall69/card-centering-calculator: https://github.com/gottasellemall69/card-centering-calculator
- ElitePete/card-centering-studio: https://github.com/ElitePete/card-centering-studio
- axiemaid/card-border-reader (no method published): https://github.com/axiemaid/card-border-reader
- Blake Crosley, How card centering is judged (Kiradex, error arithmetic): https://blakecrosley.com/blog/how-card-centering-is-judged
- r/PokeGrading thread via mirror (Apr 10 2025): https://reddit.birdcat.cafe/r/PokeGrading/comments/1jvybm0/ive_been_building_my_own_web_based_centering_tool
- Card Centering Calculator (iOS): https://apps.apple.com/us/app/-/id6661022837
- Centering50 (iOS): https://apps.apple.com/app/id6759667301
- Card Centering Tool - CCT (iOS): https://apps.apple.com/us/app/-/id6756671298
- cardgrader.ai centering calculator: https://cardgrader.ai/centering-calculator
- CardGrade.io phone vs scanner: https://cardgrade.io/blog/phone-camera-vs-scanner-card-grading
- CardGrade.io free centering tool: https://cardgrade.io/blog/free-card-centering-tool-online
- PreGradeCards browser scanner: https://pregradecards.com/blog/card-scanner-app-no-download-browser-grading-2026
- AGS centering: https://agscard.com/learn/how-ags-measures-centering-the-most-accurate-system-in-the-industry
- scanic README: https://cdn.jsdelivr.net/npm/scanic@1.0.8/README.md
- jscanify: https://github.com/puffinsoft/jscanify
- DocAligner: https://github.com/docsaidlab/docaligner
- jslok/card-scanner: https://github.com/jslok/card-scanner
- Classical card segmentation (Canny + flood fill): https://chris-qu-blog.blogspot.com/2024/08/segmenting-trading-cards.html
- OpenCV LineSegmentDetector (removal/restoration note): https://docs.opencv.org/4.12.0/javadoc/org/opencv/imgproc/LineSegmentDetector.html
- OpenCV LSD licence thread: https://answers.opencv.org/question/217613/linesegmentdetector-original-code-license-conflict
- OpenCV fitLine sample: https://docs.opencv.org/5.x/d3/d53/samples_2python_2snippets_2fitline_8py-example.html
- Flesia et al. 2014, Sub-pixel straight lines detection for measuring through machine vision: https://ria.utn.edu.ar/items/0aef578e-e8fa-488d-b216-2595860fff06/full

Recommended for PM:
1. Inner-border measurement on all 4 sides, replacing the assumed `border_mm=3.0` mirror method (M).
2. Confirm/adjust screen with 8 lines, loupe, nudge buttons and offset handles; ratios computed only from confirmed lines and stored (S-M).
3. Server sub-pixel outer edge refinement on the full-resolution still; stop normalising to 10 px/mm for centering (S-M).
4. Resolution gate (≥20 px/mm; Vault photos give "can't measure centering") plus a 3-shot repeatability check and a 10-card x 5-shot validation against 600 dpi scans before trusting the numbers (S).
5. Defer the ML outline model until logs show outline failures are the main reason measurements fail (L).
