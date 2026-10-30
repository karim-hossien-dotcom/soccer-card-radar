# What AI / computer-vision grading companies actually use, Oct 29 2026

All sources checked 2026-10-29. **Fact** = from a cited primary source (company page, patent, job posting, press release). **Inference** = my reasoning. **Benchmark** = a vendor claim nobody has independently reproduced. Patents describe what a company *filed*, not necessarily what runs in production; that gap is called out where it matters.

This does not repeat `2026-10-border-alignment.md` (centering apps, sub-pixel edges, confirm screen, resolution gate) or `2026-10-phone-scan.md` (scanic, ImageCapture).

## Question and what "better" means
Question: what imaging and measurement do the graders and pre-grade apps really use, and which parts can `tools/grade-screen/` copy?
"Better" for Karim: (1) weekly use on raw cards at home; (2) saves money by stopping submissions that will come back below 10 (or below 9); (3) the same card gives the same answer every time.

## Which "Holodex"?
Ambiguous. **HoloDex - TCG Scan & Collect** (MAVELLI FZCO, iOS/Android) is the closest exact match: card ID ("Powered by TinEye"), portfolio, and "AI Grading Insights" that "spot whitening, centering issues, and surface wear". It is **TCG only** (Pokémon, One Piece, Lorcana, etc.), with no sports or soccer cards, and it publishes **no method**. One App Store reviewer reports a PSA 10 slab scored 9.4. Other "Holo"-named apps exist (Holo, HoloDx, Holomint); none publish a grading method. Conclusion: nothing to copy; treat it as a market signal only. The owner's "Zeus" is probably **Zeagley** (Inference); see below.

## Main table

| Company | Hardware | Lighting | Centering method | Surface method | ML vs classical | Human review | Evidence |
|---|---|---|---|---|---|---|---|
| **TAG** (Technical Authentication & Grading; assignee Tag P LLC) | Patent: an enclosure with a stage, camera (18 MP example) or scanner; the card fills about 90% of the frame, giving **about 1200 ppi (about 47 px/mm)**. Optional confocal fibre sensor for thickness; IR for thickness. Not stated in production docs. | Patent: LEDs on the side walls and top, switched by computer, **9 lighting conditions, 7 to 9 images per side**, high and low angle. Marketing: "Photometric Stereoscopic Imaging". Claims: shadows to find raised and depressed areas; a "topological image" overlaid on the photo. | Border margins on all 4 sides; T/B and L/R ratios (e.g. 55.4/44.6); skew measured; **up to 100 measurement points** along the centering lines. Rubric: Pristine front about 51/49, back about 54.5/45.5 (sports). | Image subtraction against a **"Golden Image"** (built from good parts of other copies) plus comparison between lighting conditions; blob analysis; region weighting (face area counts most). Card Vision viewer zooms "up to 800%". | Measurements are classical (thresholding, blob, subtraction, template matching, perceptual hash for ID). **ML maps attributes to scores: k-nearest neighbours, k = 11.** Corners: angle, residual, fill, fray. Edges: residual (peaks and valleys), fray, colour uniformity, **up to 500 points per edge**, sampled from about 0.75 in from each corner. TAG calls it "machine-learning", not "AI". | **Yes. "All defects identified by TAG's grading system are thoroughly reviewed by human grading experts."** A Card ID department checks identity. (Rare Candy's description of TAG as "completely automated" is contradicted by TAG's own help centre.) | Patent pubs US 2018/0004756 and US 2022/0374946; app 18/106,999 (non-final rejection Mar 9 2026); TAG site, rubric, help centre |
| **PSA / Collectors** (Genamint acquired Apr 21 2021) | Collectors patent US 12,141,817 (filed Jul 30 2021, granted Nov 12 2024): fixed-focal colour camera above the platform, optional liquid lens, optional second camera below for the back, or a scanner. Imaging job: DSLR/mirrorless, Basler/Cognex/Keyence, turntables, robotic arms. | Patent: front lights for several lighting conditions; **backlight under the card to evaluate edges**. | Patent: pixel-to-mm from known optics; "precise angles and parallelism of the card edges". Centering method not detailed. | Patent: CNN scores for scratches, staining, print defects, creases; method not detailed. Genamint release: detects "alterations or other changes made to a card's surface" and fingerprints each card. | **CNN (VGG16/VGG19 preferred)**, transfer learning, TensorFlow, Keras, OpenCV. 2026 ML job: "using computer vision to drive digital grading". | **Yes. AI is a first pass; "ultimate grading … performed manually"; the human grader is blind to the computer grade; a second grader reviews if they differ.** "We're not eliminating humans" (Nat Turner, 2021). | PR Newswire 2021; patent gazette US 12,141,817; Collectors job postings |
| **CGC / CSG** | Not public. | "Forensic devices using UV light and infrared light". | **"AI automates … measuring its centering"** and card attribution. Method not public. | Human graders plus UV/IR forensics. No CV surface method public. | AI for centering and ID; the rest is not public. | Yes. Graders are "backed by" the technology. | CGC Cards "About" page. Forum threads on "aided by advanced technology" could not be fetched. |
| **Beckett (BGS)** (Collectors agreed to acquire it Dec 15 2025) | No public imaging or AI tech. | Not public. | Not public. | Not public. | None stated. | Human inspection and subgrades. | Beckett grading page; Collectors announcement |
| **AGS** (Automated Grading Systems, "RoboGrading") | AG-1000 / AG-1500 scanners (Wikipedia). Site: "micron-precision 3D metrology", NVIDIA GPU, under 10 s per card, "nearly 30 million data points per card". Co-founder's patent application (US 2023/0252532): several cameras, lasers, IR/UV cameras, laser range finder. | "Special lighting" (site). Application: modulated light sources and brightness levels, plus a 3D scan. | "Boundary detection", "pixel-rated measurements", "front-to-back comparison", "proprietary ratio models". **Benchmark: "±0.1% accuracy"** (no method). Application: border widths plus parallelism of inner border lines; 0.025 mm. | "3D depth mapping", "surface variance" (site). Application: the laser has "99% repeatability … at one (1) micron" (**Benchmark**). | AI models turn sensor data into numeric defect values (application). Critics call it "an automated set of rules" (Wikipedia). | **None in grading: "Our AI grades your cards, we don't."** Humans edit training labels (application). | AGS site pages; US 2023/0252532 (inventors include co-founder Alex Aleksandrovski); Wikipedia |
| **Zeagley** (probably the owner's "Zeus") | Not disclosed; "multi-angle imaging", "thousands of scans per card". | Not disclosed. | Not disclosed. | Not disclosed. | Spokesperson: largely "if-else" logic with logging. | None ("No humans, no bias"). | **Halted submissions about Jun 20 2025 after a Collectors cease-and-desist.** cllct; Cardlines |
| **US 11,335,153** (autonomous grader; assignee not visible) | Raspberry Pi-class controller, camera on an adjustable rail, a rotating case with a dark backing for contrast. | **LEDs at top, bottom, left and right, aimed at the card centre, lit in combinations to mimic a grader tilting the card.** | "To the nearest 0.5 mm"; corner angle "to the nearest degree". | Deep NN trained on defect classes. | Mixed. | Optional. | Justia |
| **Ximilar** (API vendor behind some apps) | Customer photos. Needs "relatively high-resolution images"; warns that phone AI upscaling corrupts results. | None. | Learned centering grader on the Beckett scale; returns relative and absolute offsets. | Learned model; the author says it "misses the surface by quite a large margin" on a Jordan example. | All ML: card detection, front/back, sports vs TCG, separate corner models. | None. | Ximilar blog (Sep 2023, updated May 2026) |
| **TCGrader** (phone) | Phone photo. | None. | **GPT-4o Vision** prompt. | Same. | General-purpose LLM. | None. | App Store |
| **CardGrade.io** (phone/web) | Phone or a 600 dpi flatbed; "Forensic Capture" adds **8 macro close-ups (each corner, front and back)**. | None stated. | Server-side edge finding (border doc). | Not stated. | Not stated. | None stated. | Press release Aug 16 2026 |
| **CardSight AI** | API. | — | No centering. | No condition model; reads slab labels. | ID only. | — | PyPI v2.1.0 (Oct 4 2026) |
| **DingDetect** | Phone. | — | Manual guide lines. | "AI surface scanning … COMING SOON". | — | — | App Store |
| **HoloDex** | Phone. | — | Not described. | "Spot … surface wear". | "AI grading insights", method not public. | — | App Store; getholodex.com |
| **Collectr, Ludex, Card Dealer Pro, Rare Candy** | — | — | No published grading or centering method found. Rare Candy's scanner reads slabs and estimates value; it does not grade. | — | — | — | Rare Candy blog; searches |

### Accuracy and repeatability: independent evidence
- **None found** for TAG, AGS, PSA's vision system, Ximilar or any phone app. Every number above is a **benchmark** (AGS ±0.1%; laser "99% at 1 micron"; Zeagley's portable unit "matches the full system over 95%").
- TAG's founder ran his own study of human graders: 200 cards were resubmitted to three companies and got "different grades for the exact card"; only 12 trimmed cards were caught. This is TAG's own claim about competitors, not a test of TAG.
- AGS: "the same card gets the same grade—every time" (Jan 15 2024), with no sample size published.
- Reddit was not reachable in this session, so collector regrade reports are missing. Treat this section as thin.

## Patterns across the serious players (Inference from the facts above)
1. **Multi-light capture is the core of surface grading.** TAG (9 conditions), PSA (front plus backlight), AGS (modulated light plus laser) and US 11,335,153 (4 directional LEDs) all switch lights. Nobody serious grades surface from one flat photo.
2. **Measurements are classical; ML only maps measurements to a grade** (TAG kNN), or acts as a first pass that a human checks (PSA CNN plus a blind human).
3. **A human confirms in the market leaders** (TAG, PSA, CGC). Only AGS and Zeagley claim zero humans, and neither has independent validation; Zeagley stopped operating.
4. **Resolution:** TAG's example is about 47 px/mm. A full-resolution phone still of the whole card is about 38 px/mm (border doc, Inference). Per-corner macros (the CardGrade pattern) exceed that.

## What we can copy with a phone
| Copy | From | Why it fits us | Note |
|---|---|---|---|
| **4-direction raking capture** (N, E, S, W) instead of one raking shot in `surface.py`; take the per-pixel max/min anomaly across directions | TAG multi-light; US 11,335,153 four-side LEDs | A dent or scratch parallel to the single light direction is invisible today (Inference: a groove casts no shadow along the light). A phone plus any small torch held low at 4 positions is enough. | Same pipeline as now (align, divide by flat, high-pass); only capture and merging change. With 3 or more known directions, a Lambertian photometric-stereo solve for normals becomes possible, but foil and chrome break the Lambertian assumption (Inference), so keep the anomaly-map approach as the primary method. |
| **TAG corner attributes: angle, fill, fray, residual**; edge attributes: residual, fray, colour uniformity, sampled from about 0.75 in from each corner | TAG patent | Turns our corner and edge "look flags" into numbers that can be calibrated. `borders.py` already fits edge lines, so corner angle and fill come almost for free. | Fray needs resolution: add **optional per-corner macro shots** (CardGrade's 8-macro pattern). |
| **Many sample points per edge** (TAG: 100 for centering, 500 per edge) | TAG patent | `borders.py` uses n=60 outer and 40 inner profiles. Raising the count is cheap and lowers variance (Inference). | Pure parameter change. |
| **kNN (or similar small model) from measured attributes to grade, trained on Karim's returned grades** | TAG kNN k=11 | Works with tens to hundreds of labelled cards; no deep learning needed (Inference). PSA order 26913695 is the first labelled set. | Keep thresholds as today until enough grades return. |
| **Human confirms every flagged defect before it counts** | TAG help centre; PSA blind grader | Same design as the border doc's confirm screen; applies to surface and corners too. | Log confirm and reject decisions as training labels (AGS does this for its models). |
| **Card fingerprint** (perceptual hash of the straightened card) | TAG patent (64-bit pHash); Genamint fingerprinting | Lets us match re-photos of the same card for repeatability checks and spot our own re-submissions. | S. |

**Do not copy:** LLM-vision grading (TCGrader/GPT-4o) as a measurement. It gives no repeatable numbers, and Ximilar's own example shows learned surface grading missing badly. One-image learned normals (FlashNormal, Aug 2026) report about 15° mean angular error, which is shape-level, not dent-level (Inference that this is too coarse for card dents). Phone-screen photometric stereo (Galaxy S22, 10 cm) works on leaves but was "significantly lower-quality" on glossy objects and was affected by ambient light. Chrome and Prizm are glossy, so skip it.

## What needs a rig (and the cheapest rig)
Needs fixed geometry and switched lights (Inference, based on what every hardware grader does):
- True photometric-stereo normals with calibrated light directions (TAG, CoinAI: one LED per frame, 16 frames per face, chrome-ball calibration).
- Repeatable raking angle, so dent depth scores are comparable week to week.
- Backlight edge silhouette (PSA patent) for clean fray and notch measurement without background contrast problems.
- Thickness, trimming and 3D micron depth (TAG confocal/IR, AGS laser). **Out of reach**; keep "can't judge: trimming" in reports.

Cheapest rig that captures most of the value (Inference; **costs not checked**, all parts are commodity):
1. A box or stand that holds the phone straight down at a fixed height (the card fills about 90% of the frame, as in TAG's patent).
2. 4 to 8 small LEDs on a ring at a low angle (about 10 to 20° above the card plane), switched one at a time by an Arduino or Raspberry Pi Pico. This is the US 11,335,153 and CoinAI pattern at card scale. Phone capture is triggered by hand or through the web app's timer.
3. A small white LED panel under a frosted card tray for the backlit silhouette (PSA pattern).
4. A chrome ball (a ball bearing) for one-off light-direction calibration (CoinAI method).
5. Optional: linear polariser film on the LEDs and a polariser over the phone lens, to cut foil glare (Inference; not sourced to a grader).
Reference point: CoinAI's full open coin rig (48 LEDs, 3 machine-vision cameras, GPUs) cost about **$12,000**, which is far beyond what we need. The HardwareX low-cost material scanner (consumer camera, MR16 LEDs, Arduino, CC BY-NC-SA) is the closer design reference.

## Gap table (us vs market)
| Capability | Who does it | How well | What they miss | Our effort |
|---|---|---|---|---|
| Multi-direction surface capture | TAG, PSA, AGS (rigs) | Production; no published accuracy | No phone app does it | S-M |
| Quantified corner and edge attributes | TAG (angle, fill, fray, residual) | Production; method in patent | Phone apps return a single opaque grade | M |
| Model calibrated to real grades | TAG kNN; PSA CNN; Ximilar | No published error | Nobody publishes calibration on soccer chrome | S (once grades return) |
| Human confirm loop | TAG, PSA, CGC | Market standard | Phone apps skip it | S |
| Fingerprint and repeatability | TAG pHash; Genamint | Production | No phone app reports repeatability | S |
| Backlit edge silhouette | PSA patent | Unknown | — | M (rig) |
| 3D, thickness, trim | TAG, AGS | Benchmarks only | — | L (rig, out of scope) |

## Ranked recommendations for our pipeline
Score = (weekly usefulness x money impact) / effort.
1. **4-direction raking capture plus merge in `surface.py`** (S-M). Biggest blind spot today; phone only; directly protects against paying to grade dented or scratched chrome.
2. **Calibrate on returned PSA grades with a small kNN or logistic model over our measured attributes** (S, gated on order 26913695 returning). This is what turns flags into a submit / don't-submit call, which is where the money is.
3. **TAG-style corner and edge attributes in `condition.py` / `borders.py`, plus optional per-corner macro shots** (M).
4. **Confirm-every-flag screen, with decisions logged as labels** (S; extends the border doc's 8-line confirm screen).
5. **Card fingerprint plus 3-shot repeatability report** (S).
6. **Cheap LED rig** (M-L). Build only if #1 shows that hand-held torch angle variance is the main source of inconsistency.
Defer: golden-image subtraction (needs a clean reference scan per card, L), learned surface models (need hundreds of labelled defects, L), 3D, thickness and trim (out of reach).

**Flags:** No eBay API, scraping or third-party ToS is involved. **Patent risk if the app is ever sold:** TAG holds granted US patents on multi-light topological imaging and grading (9,767,163; 10,146,841; 10,445,330; 10,459,931; 10,942,933), and Collectors holds US 12,141,817. Personal use is low risk; a commercial release should get a freedom-to-operate check (Inference, not legal advice). Ximilar is a paid API with no published grading accuracy; use it only as an optional second opinion.

## Not public / not reached
TAG production hardware and resolution (only patent examples); how TAG calculates point deductions; PSA's production use of Genamint; CGC's centering method; Beckett tech (none disclosed); AGS's real sensor specs; Zeagley everything. Not reached: Reddit (not on the allowlist), CGC forum threads (fetch failed), Google Patents pages (not on the allowlist; used USPTO, the gazette, Justia and ipiq instead), TAG sample DIG report (not on the allowlist).

## Sources (all checked 2026-10-29)
- TAG home: https://taggrading.com/
- TAG how it works: https://taggrading.com/pages/tagd
- TAG vs manual: https://taggrading.com/pages/tagvsother
- TAG rubric: https://taggrading.com/pages/rubric
- TAG about (founder studies): https://taggrading.com/pages/about2
- TAG help, "Does TAG use AI": https://help.taggrading.com/en/articles/6747668-does-tag-use-ai-to-grade-cards
- TAG patent pub US 2018/0004756: https://ipiq.io/patents/311627
- TAG patent pub US 2022/0374946: https://ipiq.io/patents/487565
- TAG app 18/106,999 status (Tag P LLC): https://insights.ipauthor.com/18106999.html
- TAG granted patents (USPTO PDFs): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9767163 , https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10146841 , https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10459931 , https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10445330 , https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10942933
- Phantom Display TAG explainer: https://phantomdisplay.com/blogs/blog/tag-card-grading-the-new-grader-explained
- Rare Candy TAG guide: https://rarecandy.com/blog/collectors-guide-grading-with-tag
- PSA acquires Genamint (Apr 21 2021): https://prnewswire.com/news-releases/professional-sports-authenticator-acquires-genamint-to-introduce-next-generation-technology-to-grading-process-301273225.html
- Collectors patent US 12,141,817 (gazette): https://patentsgazette.uspto.gov/week46/OG/html/1528-2/US12141817-20241112.html
- Collectors patent text: https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12141817
- Collectors Senior Imaging Engineer: https://builtin.com/job/senior-imaging-engineer/6675293
- Collectors Senior ML Engineer: https://builtin.com/job/senior-machine-learning-engineer/8219659
- PSA First View thread: https://www.elitefourum.com/t/new-psa-feature-called-first-view/40005
- Collectors to acquire Beckett: https://www.collectors.com/company-announcement
- Beckett grading: https://www.beckett.com/grading
- CGC Cards about: https://www.cgccards.com/card-grading/about-cgc/
- AGS computer vision: https://agscard.com/learn/understanding-computer-vision-in-card-grading
- AGS centering: https://agscard.com/learn/how-ags-measures-centering-the-most-accurate-system-in-the-industry
- AGS about RoboGrading: https://agscard.com/about-robograding
- AGS accuracy page: https://agscard.com/ai-grading-accuracy-vs-psa-bgs
- AGS cracking slabs: https://agscard.com/blog/cracking-slabs
- AGS Wikipedia: https://en.wikipedia.org/wiki/Automated_Grading_Systems,_Inc.
- US 2023/0252532 (Aleksandrovski et al.): https://patents.justia.com/patent/20230252532
- US 11,335,153: https://patents.justia.com/patent/11335153
- US 12,106,334 (Sebastian, phone AI grading): https://patentsgazette.uspto.gov/week40/OG/html/1527-1/US12106334-20241001.html
- Zeagley (cllct): https://cllct.com/sports-collectibles/sports-cards/despite-selling-transparency-new-ai-card-grading-company-is-shrouded-in-mystery
- Zeagley (Cardlines): https://cardlines.com/is-zeagley-ai-powered-grading-the-next-big-thing
- Ximilar AI card grading: https://www.ximilar.com/ai-card-grading-automate-sports-cards-pre-grading
- TCGrader: https://apps.apple.com/us/app/tcgrader/id6754809465
- CardGrade Forensic Capture: https://www.daily-tribune.com/online_features/press_releases/cardgrade-expands-ai-card-pre-screening-with-forensic-capture-collection-tools-and-free-centering-calculator/article_977baa52-15ac-5d23-953b-07f81284391c.html
- CardSight AI SDK: https://pypi.org/project/cardsightai/
- DingDetect: https://apps.apple.com/app/ding-detect/id6773055856
- HoloDex App Store: https://apps.apple.com/app/id6747442689
- HoloDex site: https://getholodex.com
- Differentiable Mobile Display Photometric Stereo: https://arxiv.org/pdf/2502.05055
- FlashNormal: https://arxiv.org/pdf/2608.25360
- CoinAI open rig: https://www.pcbway.com/project/sponsor/CoinAI_open_hardware_photometric_stereo_rig_for_coin_authentication_2546e8ba.html
- Low-cost photometric-stereo material scanner dataset: https://data.mendeley.com/datasets/8mprk8br23/4

Recommended for PM:
1. 4-direction raking capture and merge in `surface.py` (S-M).
2. Grade calibration (kNN/logistic over measured attributes) once PSA order 26913695 returns (S, gated).
3. TAG-style corner (angle, fill, fray, residual) and edge (residual, fray, colour uniformity) attributes, plus optional per-corner macros (M).
4. Confirm-every-flag screen, with decisions logged as labels (S).
5. Card fingerprint plus 3-shot repeatability report (S).
6. Cheap switched-LED rig, only if #1 shows hand-held light angle is the main source of variance (M-L).
