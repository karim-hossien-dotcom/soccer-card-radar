"""D3: condition screen against every grading point PSA, Beckett (BGS) and TAG publish.

Reject filter only: it can lower the grade ceiling, it never promises a grade. Each criterion is
either measured from the photo, or reported as "cant_judge" with the reason (a scan or phone photo
cannot show surface dents, gloss or fine scratches on chrome). Thresholds are provisional until
calibrated against returned PSA grades (order 26913695).

Grading points covered (sources, accessed 2026-10-29):
  PSA  psacard.com/gradingstandards: 10 = four perfectly sharp corners, sharp focus, full gloss,
       no staining, centering 55/45 front 75/25 back. 9 = only one minor flaw (slight wax stain on
       back, minor print imperfection, slightly off-white borders), 60/40 front 90/10 back. 8 =
       slightest fraying at one or two corners, 65/35 front 90/10 back. 7 = slight surface wear,
       slight fraying on some corners, focus slightly out of register, 70/30 front.
  BGS  beckett.com/grading/scale: subgrades centering, corners, edges, surface. Centering 10 = 50/50
       front 60/40 back; 9.5 = 50/50 one way 55/45 the other, back 60/40; 9 = 55/45 both ways, back
       70/30; 8 = 60/40, back 80/20. Edges 9 = unobtrusive specks of chipping; 8.5/8 = specks visible
       to the naked eye. Corners 9.5 = slight imperfection under magnification; 9 = speck of wear.
       Surface: print spots, color, registration/focus, gloss, scratches, metallic print lines.
  TAG  taggrading.com/pages/rubric and /scale: 1000-point score (10 Gem Mint 950+, 9 = 900-949,
       8 = 800-849). Corners: sharpness, squareness, wear, fill/fray. Edges: fill and fray, chipping,
       edge surface wear, notches, lifting, roughness, waviness, tears. TAG publishes no per-defect
       point costs, so TAG ceilings here are the band the matching PSA/BGS description falls in.
"""
import base64, sys, json
import cv2
import numpy as np
import centering as cen
import borders as bd

PX = 10            # px per mm in the normalised card
CW, CH = 63 * PX, 88 * PX
MARGIN = 3 * PX    # keep 3 mm of backdrop around the card so cut edges and corners can be inspected
PROVISIONAL = "thresholds provisional until calibrated against returned PSA grades"
OUTLINE_RETAKE = "outline isn't the card's edge: retake on a plain contrasting background with all four edges visible"
HOLDER_RETAKE = "card is in a sleeve or holder: take it out and retake"
EDGE_RETAKE = "cut edge not found on this side: retake with that edge clear against the background"
# G9c calibration gate. A check may lower the ceiling only after it agreed with returned PSA grades (calibrate.py; pass
# bar in CALIBRATION.md) and Karim approved switching it on. While off, its findings are look flags only; centering is
# the only check that sets a ceiling.
CALIBRATED = {"edges_chipping": False, "corners_whitening": False, "surface": False}
UNCALIBRATED = "not calibrated yet: does not lower the ceiling"

# Centering tolerances: worse side of the larger split, front / back.
PSA_CENT = [(10, 0.55, 0.75), (9, 0.60, 0.90), (8, 0.65, 0.90), (7, 0.70, 0.90)]
BGS_CENT = [(10, 0.52, 0.60),  # 50/50 within photo measuring error (~2%)
            (9.5, 0.55, 0.60), (9, 0.55, 0.70), (8, 0.60, 0.80)]


def warp_with_margin(img, quad):
    m = cv2.getPerspectiveTransform(cen.order(quad), np.float32([[MARGIN, MARGIN], [MARGIN + CW, MARGIN], [MARGIN + CW, MARGIN + CH], [MARGIN, MARGIN + CH]]))
    return cv2.warpPerspective(img, m, (CW + 2 * MARGIN, CH + 2 * MARGIN), borderMode=cv2.BORDER_REPLICATE)


def read_image(src):
    """A path, or the raw bytes of a jpg/png/webp upload, as a BGR image (None if it cannot be decoded)."""
    if isinstance(src, (bytes, bytearray, memoryview)):
        return cv2.imdecode(np.frombuffer(src, np.uint8), cv2.IMREAD_COLOR)
    return cv2.imread(src)


def quad_from_hint(img, hint):
    """Corners found by the phone scanner, as fractions of the photo's width/height ([[x, y] x 4]), checked for shape.
    None if missing or implausible (then the photo's own outline search runs)."""
    try:
        q = np.float32(hint).reshape(4, 2) * np.float32([img.shape[1], img.shape[0]])
    except (TypeError, ValueError):
        return None
    if not np.isfinite(q).all() or cv2.contourArea(cen.order(q)) < 0.08 * img.shape[0] * img.shape[1]:
        return None
    (w, h) = sorted(cv2.minAreaRect(q)[1])
    return q if h and 0.5 < w / h < 0.9 else None


def locate(path, hint=None):
    """(photo, rough card corners in photo px, error). hint: corners from the phone scanner (fractions)."""
    img = read_image(path)
    if img is None:
        return None, None, "unreadable"
    q = quad_from_hint(img, hint) if hint is not None else None
    if q is None:
        q = cen.find_card(img)
        if q is None or not cen.on_backdrop(img, q):
            h, w = img.shape[:2]
            if abs(min(w, h) / max(w, h) - 63.5 / 88.9) < 0.03:  # cropped at the card's edge, like a saved thumbnail
                return img, None, (f"photo is cropped tight to the card ({w}x{h} px, {min(w, h) / 63.5:.1f} px per mm): "
                                   "the check needs some plain background around the card, and 8+ px per mm (12+ for centering)")
            return img, None, "no clean outline on a plain backdrop (cropped, angled, in a holder or cluttered photo)"
    return img, q, None


def lab(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)


def edge_band(L, side, depth_mm=0.8):
    """Outer band just inside the cut edge, as rows = depth, cols = position along the edge."""
    d, c = int(depth_mm * PX), 4 * PX
    s = 2  # skip the 0.2 mm where card and backdrop blend
    if side == "top":    return L[MARGIN + s: MARGIN + d, MARGIN + c: MARGIN + CW - c]
    if side == "bottom": return L[MARGIN + CH - d: MARGIN + CH - s, MARGIN + c: MARGIN + CW - c][::-1]
    if side == "left":   return L[MARGIN + c: MARGIN + CH - c, MARGIN + s: MARGIN + d].T
    return L[MARGIN + c: MARGIN + CH - c, MARGIN + CW - d: MARGIN + CW - s].T[::-1]


def runs(mask):
    """Number of separate True runs (one speck = one run along the edge)."""
    m = np.concatenate([[False], mask, [False]])
    return int(np.sum(m[1:] & ~m[:-1]))


def inner_band(L, side, a_mm=1.5, b_mm=3.0):
    """Printed border 1.5-3 mm in from the cut edge, same orientation as edge_band (rows = depth)."""
    a, b, c = int(a_mm * PX), int(b_mm * PX), 4 * PX
    if side == "top":    return L[MARGIN + a: MARGIN + b, MARGIN + c: MARGIN + CW - c]
    if side == "bottom": return L[MARGIN + CH - b: MARGIN + CH - a, MARGIN + c: MARGIN + CW - c][::-1]
    if side == "left":   return L[MARGIN + c: MARGIN + CH - c, MARGIN + a: MARGIN + b].T
    return L[MARGIN + c: MARGIN + CH - c, MARGIN + CW - b: MARGIN + CW - a].T[::-1]


def outside_band(g, side):
    """Backdrop 1-2.5 mm outside the cut edge, same orientation."""
    a, b, c = MARGIN - int(2.5 * PX), MARGIN - PX, 4 * PX
    if side == "top":    return g[a:b, MARGIN + c: MARGIN + CW - c]
    if side == "bottom": return g[MARGIN + CH + PX: MARGIN + CH + int(2.5 * PX), MARGIN + c: MARGIN + CW - c][::-1]
    if side == "left":   return g[MARGIN + c: MARGIN + CH - c, a:b].T
    return g[MARGIN + c: MARGIN + CH - c, MARGIN + CW + PX: MARGIN + CW + int(2.5 * PX)].T[::-1]


def smooth(v, k=41):
    return cv2.blur(np.ascontiguousarray(v, dtype=np.float32).reshape(1, -1), (k, 1)).ravel()


def edge_checks(card, skip=()):
    """Per side: chipping / whitening specks where the border is dark enough to show them (judged against the
    border colour at that spot), and cut-line roughness, waviness and notches where the border stands out from the backdrop.
    skip: sides whose cut edge was not found (G9c): not measured at all."""
    L = lab(card)[:, :, 0] * 100 / 255
    g = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY).astype(np.float32)
    out = []
    for side in ("top", "bottom", "left", "right"):
        if side in skip:
            continue
        inner = inner_band(L, side)
        ref = smooth(np.median(inner, axis=0))                    # local border lightness along the edge
        hi = smooth(np.percentile(inner, 97, axis=0))             # brightest dots the printed pattern itself has there
        Lab_full = lab(card)
        band = edge_band(L, side)
        idx = band.argmax(axis=0)
        top = band.max(axis=0)
        ca = edge_band(Lab_full[:, :, 1] - 128, side); cb = edge_band(Lab_full[:, :, 2] - 128, side)
        chroma = np.hypot(np.take_along_axis(ca, idx[None], 0)[0], np.take_along_axis(cb, idx[None], 0)[0])
        prof = top - ref                                          # brightest point in the outer 0.8 mm vs that border
        dark = ref < 70
        judged_mm = float(dark.sum()) / PX
        # A speck is lighter than the border AND lighter than anything the design prints next to it (prism dots, waves).
        # Exposed card stock is near-white and colourless; printed highlights (prism dots, pink/gold sheen) carry colour.
        # A chip stops at the edge; a printed line that runs off the edge is about as light just inside (0.9-1.3 mm in).
        adj = cv2.dilate(np.ascontiguousarray(inner_band(L, side, 0.9, 1.3).max(axis=0), dtype=np.float32).reshape(1, -1), np.ones((1, 5), np.uint8)).ravel()
        sp = (prof > 22) & (top - hi > 15) & (prof - smooth(prof, 81) > 15) & (top > 55) & (chroma < 15) & (top - adj > 15) & dark
        n = runs(sp) if judged_mm >= 10 else None
        starts = np.flatnonzero(sp & ~np.concatenate([[False], sp[:-1]])) if n else []
        # Cut line, only where card and backdrop differ clearly
        gin = smooth(np.median(inner_band(g, side, 0.5, 1.5), axis=0)); gout = smooth(np.median(outside_band(g, side), axis=0))
        contrast = np.abs(gin - gout)
        rough = wave = notches = None
        if (contrast > 40).mean() > 0.6:
            if side in ("top", "bottom"):
                strip = g[MARGIN - PX: MARGIN + PX, MARGIN + 4 * PX: MARGIN + CW - 4 * PX] if side == "top" else g[MARGIN + CH - PX: MARGIN + CH + PX, MARGIN + 4 * PX: MARGIN + CW - 4 * PX][::-1]
            else:
                strip = (g[MARGIN + 4 * PX: MARGIN + CH - 4 * PX, MARGIN - PX: MARGIN + PX] if side == "left" else g[MARGIN + 4 * PX: MARGIN + CH - 4 * PX, MARGIN + CW - PX: MARGIN + CW + PX][:, ::-1]).T
            mid = (gin + gout) / 2
            crossed = (strip - mid) * np.sign(gin - gout) > 0      # pixel looks like card, not backdrop
            ok = crossed.any(axis=0) & (contrast > 40)
            pos = crossed.argmax(axis=0).astype(np.float32)
            if ok.sum() > 100:
                x = np.arange(pos.size)[ok]; y = pos[ok]
                resid = y - np.polyval(np.polyfit(x, y, 2), x)   # 2nd order absorbs lens bow
                rough = round(float(np.std(resid)) / PX, 3)
                wave = round(float(np.ptp(cv2.blur(resid.reshape(1, -1), (31, 1)).ravel())) / PX, 3)
                notches = runs(cv2.erode((resid > 0.5 * PX).astype(np.uint8).reshape(1, -1), np.ones((1, 5), np.uint8)).ravel() > 0)  # >= 0.5 mm deep and 0.5 mm wide
        out.append({"side": side, "judged_mm": round(judged_mm), "specks": n,
                    "speck_along_px": [int(MARGIN + 4 * PX + i) for i in starts],  # G9c evidence: x (top/bottom) or y (left/right) in card px
                    "specks_per_10cm": None if n is None else round(n / judged_mm * 100, 1),
                    "roughness_mm": rough, "waviness_mm": wave, "notches": notches,
                    "note": ("border too light to see whitening or chipping" if n is None else None) if rough is not None else
                            ("border too light to see whitening or chipping; " if n is None else "") + "border too close to the backdrop colour to trace the cut line"})
    return out


def corner_checks(card, skip=()):
    """Per corner: whitening (light pixels in the 1.5 mm corner vs the border right next to it) and rounding
    (backdrop inside the ideal square corner), the latter only where border and backdrop differ clearly.
    skip: sides whose cut edge was not found (G9c): their two corners are not measured."""
    L = lab(card)[:, :, 0] * 100 / 255
    g = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY).astype(np.float32)
    r = int(1.5 * PX)
    tri = np.add.outer(np.arange(r), np.arange(r)) < r
    ring = (np.add.outer(np.arange(3 * r), np.arange(3 * r)) >= 2 * r) & (np.add.outer(np.arange(3 * r), np.arange(3 * r)) < 3 * r)
    out = []
    for name in ("top-left", "top-right", "bottom-left", "bottom-right"):
        if any(sd in name.split("-") for sd in skip):
            continue
        y0 = MARGIN if "top" in name else MARGIN + CH - 3 * r
        x0 = MARGIN if "left" in name else MARGIN + CW - 3 * r
        fy = slice(None) if "top" in name else slice(None, None, -1)
        fx = slice(None) if "left" in name else slice(None, None, -1)
        Lc = L[y0:y0 + 3 * r, x0:x0 + 3 * r][fy, fx]; gc = g[y0:y0 + 3 * r, x0:x0 + 3 * r][fy, fx]
        by = slice(MARGIN - int(2.5 * PX), MARGIN - PX) if "top" in name else slice(MARGIN + CH + PX, MARGIN + CH + int(2.5 * PX))
        bx = slice(MARGIN - int(2.5 * PX), MARGIN - PX) if "left" in name else slice(MARGIN + CW + PX, MARGIN + CW + int(2.5 * PX))
        back = float(np.median(g[by, bx]))
        ref_L, ref_g = float(np.median(Lc[ring])), float(np.median(gc[ring]))
        rnd = None
        if abs(ref_g - back) > 40:
            is_back = np.abs(gc[:r, :r] - back) < np.abs(gc[:r, :r] - ref_g)
            rnd = round(float(np.sqrt(2 * (is_back & tri).sum())) / PX, 2)
        wh = None
        if ref_L < 70:
            light = ((Lc[:r, :r] - ref_L) > 25) & tri & (np.abs(gc[:r, :r] - back) >= np.abs(gc[:r, :r] - ref_g))
            wh = round(100 * float(light.sum()) / tri.sum(), 1)
        notes = []
        if wh is None: notes.append("border too light to see whitening")
        if rnd is None: notes.append("border too close to the backdrop colour to see the corner shape")
        out.append({"corner": name, "rounding_mm": rnd, "whitening_pct": wh, "note": "; ".join(notes) or None})
    known = [c["rounding_mm"] for c in out if c["rounding_mm"] is not None]
    base = float(np.median(known)) if len(known) >= 3 else None
    for c in out:  # factory corners are not perfectly square: a ding is a corner clearly worse than the others
        c["rounding_vs_others_mm"] = None if base is None or c["rounding_mm"] is None else round(c["rounding_mm"] - base, 2)
    return out


def _to_top(img, side):
    """The straightened card turned so `side` is at the top (the MARGIN of backdrop stays on every side)."""
    return {"top": img, "right": np.rot90(img, 1), "bottom": np.rot90(img, 2), "left": np.rot90(img, 3)}[side]


def _first_run(mask, min_len, start_max):
    """(start, end) of the first True run of min_len+ that starts at or before start_max, else None."""
    d = np.diff(np.concatenate([[0], mask.astype(np.int8), [0]]))
    for a, b in zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)):
        if a > start_max:
            return None
        if b - a >= min_len:
            return int(a), int(b)
    return None


SLEEVE_GAP_DE, CARD_DE = 20.0, 35.0  # backdrop seen through plastic vs the backdrop outside; the card inside vs the backdrop
HOLDER_SIDES = 3                      # sides that must show it (a sleeve's open end can hide one)
# G9c review. A gap only counts as a sleeve when the outline itself is something: the plastic's edge, visibly unlike the
# backdrop, at least PLASTIC_EDGE_MM wide. Backdrop colour straight from the outline in is either a loose outline (the
# scanner's corners a little outside the cut edge) or a dark printed border on a dark backdrop; neither is a holder.
PLASTIC_EDGE_MM = 0.2
LOOSE_OUTLINE_MM = 2.0  # backdrop straight from the outline in, up to this deep: a loose outline, ignored. Deeper on
                        # HOLDER_SIDES+ sides: a dark border we can't tell from a sleeve -> LOW_CONTRAST_RETAKE.
                        # 2.0 mm: corners 1.5 mm loose must not trip (CALIBRATION.md "Holder signs").
# Rim sign: a plastic edge wider than white stock or edge wear (0.3-1.0 mm) and with a specular streak (a near-white
# highlight in the band, falling off by RIM_STREAK_L): printed white borders and paper stock are flat.
RIM_MIN_MM, RIM_MAX_MM, RIM_PEAK_L, RIM_STREAK_L = 1.5, 3.0, 95.0, 12.0
LOW_CONTRAST_RETAKE = ("card border too close to the backdrop to tell a dark border from a sleeve: "
                       "retake on a lighter, contrasting backdrop")


def holder_signs(card):
    """G9c: (why the traced outline looks like a sleeve or toploader, not the card's cut edge, or None;
    True if a dark border on a dark backdrop makes that impossible to tell).
    Profiles from the outline inward, 30 per side, 6 mm clear of the corners. Two signs:
      gap: a plastic edge at the outline (PLASTIC_EDGE_MM+, unlike the backdrop), then a run of 0.5 mm+ in the
           backdrop's colour (seen through clear plastic) starting within 2.5 mm, then the card further in.
      rim: a bright, colourless band RIM_MIN_MM-RIM_MAX_MM wide at the outline with a specular streak (peak
           RIM_PEAK_L+, RIM_STREAK_L+ brighter than the rest of the band) and something much darker right inside.
           White stock, edge wear and printed white borders are flat, and the first two are narrower.
    Either sign on HOLDER_SIDES+ sides (60% of the profiles on each) -> holder. Backdrop colour straight from the
    outline in, deeper than LOOSE_OUTLINE_MM, on HOLDER_SIDES+ sides (counting gap sides) -> can't tell."""
    Lab = lab(card) * np.float32([100 / 255, 1, 1]) - np.float32([0, 128, 128])
    gap_sides, rim_sides, unsure_sides, depth = [], [], [], []
    edge_px, loose_px, trim = max(2, int(PLASTIC_EDGE_MM * PX)), int(LOOSE_OUTLINE_MM * PX), max(1, int(0.2 * PX))
    for side in ("top", "right", "bottom", "left"):
        t = _to_top(Lab, side)
        cols = np.linspace(MARGIN + 6 * PX, t.shape[1] - MARGIN - 6 * PX, 30).astype(int)
        back = np.median(t[MARGIN - int(2.5 * PX): MARGIN - PX][:, cols].reshape(-1, 3), axis=0)
        prof = t[MARGIN: MARGIN + 8 * PX][:, cols]                     # depth x profiles x Lab
        de = np.linalg.norm(prof - back, axis=2)
        L, chroma = prof[..., 0], np.hypot(prof[..., 1], prof[..., 2])
        gaps = rims = unsure = 0
        for j in range(len(cols)):
            r = _first_run(de[2:, j] < SLEEVE_GAP_DE, int(0.5 * PX), int(2.5 * PX))
            if r:
                inner = np.flatnonzero(de[2 + r[1]:, j] > CARD_DE)
                plastic = r[0] >= edge_px and np.median(de[2: 2 + r[0], j]) > SLEEVE_GAP_DE
                if plastic and inner.size:
                    gaps += 1; depth.append((2 + r[1] + inner[0]) / PX)
                elif not plastic and 2 + r[1] > loose_px:
                    unsure += 1
            r = _first_run((L[:, j] > 70) & (chroma[:, j] < 12), 2, int(0.5 * PX))
            if r and int(RIM_MIN_MM * PX) <= r[1] - r[0] <= int(RIM_MAX_MM * PX) and r[1] + 3 < L.shape[0]:
                band = L[r[0] + trim: r[1] - trim, j]
                if (band.size and band.max() >= RIM_PEAK_L and band.max() - band.min() >= RIM_STREAK_L
                        and L[r[1] + 3, j] < L[r[0]:r[1], j].mean() - 30):
                    rims += 1
        if gaps >= 0.6 * len(cols): gap_sides.append(side)
        elif gaps + unsure >= 0.6 * len(cols): unsure_sides.append(side)
        if rims >= 0.6 * len(cols): rim_sides.append(side)
    if len(gap_sides) >= HOLDER_SIDES:
        return f"second card edge {np.median(depth):.1f} mm inside the traced outline on {len(gap_sides)} sides, backdrop showing between", False
    if len(rim_sides) >= HOLDER_SIDES:
        return f"bright plastic edge around the card on {len(rim_sides)} sides", False
    return None, len(gap_sides) + len(unsure_sides) >= HOLDER_SIDES


def nested_card(img):
    """Largest outline with a card's proportions (within borders.MAX_ASPECT_ERR) in the photo, as corners in photo px,
    or None. For PSA cert-page scans (calibrate.py), where the largest outline is the slab, not the card inside it."""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    area = img.shape[0] * img.shape[1]
    best, best_a = None, 0.0
    for lo, hi in ((30, 100), (60, 180), (100, 250)):
        cnts, _ = cv2.findContours(cv2.dilate(cv2.Canny(g, lo, hi), np.ones((3, 3), np.uint8)), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:30]:
            h = cv2.convexHull(c)
            a = cv2.contourArea(h)
            if a < 0.08 * area or a <= best_a:
                continue
            q = cv2.approxPolyDP(h, 0.02 * cv2.arcLength(h, True), True)
            if len(q) == 4 and bd.outline_shape_error(q.reshape(4, 2)) is None:
                best, best_a = q.reshape(4, 2).astype(np.float32), a
    return best


# G9c glare mask. A flash or lamp hotspot is blown out and colourless, with a warm halo around it that reads as stains,
# dents or scratches. GLARE_MAX_SHARE: above this share of the card face, the straight-on photo's surface checks are not
# judged (reason in CALIBRATION.md, "Glare threshold").
GLARE_MAX_SHARE = 0.10
GLARE_RETAKE = "glare covers {pct}% of the card: retake with the light at an angle"


def glare_mask(img, px, grow_max=GLARE_MAX_SHARE, ref=None):
    """Specular glare in a straightened card photo (uint8 0/1): blown-out or near-white colourless pixels; each blob of
    0.25 mm^2+ up to grow_max of the photo is grown by its own radius + 1 mm to take in its halo. Bigger blobs are kept
    pixel for pixel. ref: the straight-on photo, same geometry, for a side-light photo: only pixels that are not near-white
    there count (a lamp pushing white ink to 255 is overexposure the surface check already masks, not a hotspot)."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    core = (img.min(axis=2) >= 245) | ((hsv[..., 2] >= 250) & (hsv[..., 1] < 40))
    if ref is not None:
        core &= ref.min(axis=2) < 225
    core = core.astype(np.uint8)
    core = cv2.morphologyEx(core, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = core.copy()
    n, _, st, cent = cv2.connectedComponentsWithStats(core)
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]
        if a < 0.25 * px * px or a > grow_max * core.size:  # a prism dot / a broad overexposed side
            continue
        cv2.circle(mask, (int(cent[i][0]), int(cent[i][1])), int(2 * np.sqrt(a / np.pi) + px), 1, -1)
    return mask


def in_glare(mask, x, y, w, h):
    """True when a finding's box (px) lies mostly (half or more) inside the glare mask."""
    x0, y0 = max(0, int(x)), max(0, int(y))
    box = mask[y0: max(y0 + 1, int(y + h)), x0: max(x0 + 1, int(x + w))]
    return box.size > 0 and float(box.mean()) >= 0.5


def surface_checks(card):
    """What a photo can show of the surface: stains on light areas, print spots on light areas, colour registration.
    G9c: glare (and its halo) is masked first; findings mostly inside it are dropped; past GLARE_MAX_SHARE of the face
    nothing is judged (glare_retake says why)."""
    inner = card[MARGIN + 4 * PX: MARGIN + CH - 4 * PX, MARGIN + 4 * PX: MARGIN + CW - 4 * PX]
    glare = glare_mask(inner, PX, grow_max=1.0)
    share = float(glare.mean())
    out = {"glare_pct": round(100 * share, 1)}
    if share > GLARE_MAX_SHARE:
        out.update(stain_spots=None, print_spots=None, registration_mm=None, glare_retake=GLARE_RETAKE.format(pct=round(100 * share)))
        return out
    Lab = lab(inner); L, A, B = Lab[:, :, 0] * 100 / 255, Lab[:, :, 1] - 128, Lab[:, :, 2] - 128
    light = (L > 80) & (glare == 0)
    if light.sum() > 25 * PX * PX:  # at least 25 mm^2 of light area to judge against
        b_ref = float(np.median(B[light]))
        stain = light & (B - b_ref > 12) & (A > -5)
        stain = cv2.morphologyEx(stain.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, _, st, _ = cv2.connectedComponentsWithStats(stain)
        kept = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= PX * PX and not in_glare(glare, *st[i, :4])]  # >= 1 mm^2
        out["stain_spots"] = len(kept)
        off = MARGIN + 4 * PX  # G9c evidence: boxes in card px (the inner face starts 4 mm in)
        out["stain_boxes"] = [[int(st[i, 0] + off), int(st[i, 1] + off), int(st[i, 2]), int(st[i, 3])] for i in kept]
        lap = cv2.Laplacian(cv2.GaussianBlur(L, (3, 3), 0), cv2.CV_32F)
        spot = light & (lap > 25)
        n2, _, st2, _ = cv2.connectedComponentsWithStats(spot.astype(np.uint8))
        ps = [i for i in range(1, n2) if 2 <= st2[i, cv2.CC_STAT_AREA] <= 30 and not in_glare(glare, *st2[i, :4])]
        out["print_spots"] = len(ps)
        if ps:
            x0, y0 = min(st2[i, 0] for i in ps), min(st2[i, 1] for i in ps)
            x1, y1 = max(st2[i, 0] + st2[i, 2] for i in ps), max(st2[i, 1] + st2[i, 3] for i in ps)
            out["print_spot_box"] = [int(x0 + off), int(y0 + off), int(x1 - x0), int(y1 - y0)]
    else:
        out["stain_spots"] = out["print_spots"] = None
    # Registration: shift between red and blue channel edge maps.
    e = lambda ch: cv2.Sobel(inner[:, :, ch].astype(np.float32), cv2.CV_32F, 1, 1, ksize=3)
    (dx, dy), resp = cv2.phaseCorrelate(e(2), e(0))
    out["registration_mm"] = round(float(np.hypot(dx, dy)) / PX, 2) if resp > 0.05 else None
    return out


def centering_grades(worse, back=False):
    """Best PSA and BGS grade whose written centering tolerance this split (worse side, 0.5-1) still meets."""
    i = 2 if back else 1
    p = next((g for g, f, b in PSA_CENT if worse <= (f if i == 1 else b)), 6)
    b = next((g for g, f, bk in BGS_CENT if worse <= (f if i == 1 else bk)), 7)
    return p, b


def grade_ceilings(front, back, cent):
    """Map every finding to the highest grade each company's written standard still allows. Only centering and the
    checks switched on in CALIBRATED may lower it; the rest are look flags, with the cap they would set kept in
    would_cap (PSA grade per check, for calibrate.py)."""
    psa, bgs, tag, why, look = 10, 10, 10, [], []
    why_ev, look_ev = [], []  # G9c: per line, {side, bbox, px_per_mm} on the straightened card (None for centering)
    would = {k: None for k in CALIBRATED}

    def cap(p, b, t, reason, ev=None):
        nonlocal psa, bgs, tag
        psa, bgs, tag = min(psa, p), min(bgs, b), min(tag, t)
        why.append(f"{reason} -> PSA {p}, BGS {b}, TAG {t}"); why_ev.append(ev)

    def flag(text, ev):
        look.append(text); look_ev.append(ev)

    def gated(check, p, b, t, reason, ev):
        would[check] = p if would[check] is None else min(would[check], p)
        if CALIBRATED[check]:
            cap(p, b, t, reason, ev)
        else:
            flag(f"{reason} ({UNCALIBRATED})", ev)

    # Centering
    for key, worse in cent.items():
        side, axis = key.split("_")
        p, b = centering_grades(worse, back=side == "back")
        if p < 10 or b < 10:
            cap(p, b, min(p, b), f"{side} {'L/R' if axis == 'lr' else 'T/B'} centering {round(worse*100)}/{round((1-worse)*100)}")

    for side_name, res in (("front", front), ("back", back)):
        if not res:
            continue
        # Edges: chipping / whitening specks (checked by eye against the Ronaldo #161 test card only: gated)
        ev = lambda box: {"side": side_name, "bbox": [int(v) for v in box], "px_per_mm": PX}
        sp = [e["specks"] for e in res["edges"] if e["specks"] is not None]
        sides_hit = sum(1 for s in sp if s >= 3)
        total = sum(sp)
        if total >= 1:
            worst = max((e for e in res["edges"] if e["specks"]), key=lambda e: e["specks"])
            at = worst.get("speck_along_px") or [MARGIN + 4 * PX]
            chip_ev = ev(_edge_box(worst["side"], at[0] - 2 * PX, min(at[-1], at[0] + 12 * PX) + 2 * PX))
            if sides_hit == 0 and total <= 6:
                gated("edges_chipping", 9, 9, 9, f"{side_name} edges: {total} scattered speck(s) of chipping", chip_ev)
            elif sides_hit <= 2:
                gated("edges_chipping", 8, 8.5, 8, f"{side_name} edges: chipping specks along {sides_hit} side(s), {total} total", chip_ev)
            else:
                gated("edges_chipping", 8, 8, 8, f"{side_name} edges: chipping specks along {sides_hit} sides, {total} total", chip_ev)
        worn = [c for c in res["corners"] if (c["whitening_pct"] or 0) > 3]
        if worn:
            n = len(worn)
            gated("corners_whitening", 9 if n == 1 else 8, 9 if n == 1 else 8.5, 9 if n == 1 else 8,
                  f"{side_name}: whitening at {n} corner(s) ({', '.join(c['corner'] for c in worn)})", ev(_corner_box(worn[0]["corner"])))
        # Look flags (TAG notches/waviness/roughness, corner dings)
        for e in res["edges"]:
            whole = ev(_edge_box(e["side"], MARGIN + 4 * PX, MARGIN + (CW if e["side"] in ("top", "bottom") else CH) - 4 * PX))
            if e["notches"]:
                flag(f"{side_name} {e['side']} edge: {e['notches']} possible notch(es) 0.5 mm+ (TAG notches; PSA/BGS edges)", whole)
            if e["waviness_mm"] is not None and e["waviness_mm"] > 0.5:
                flag(f"{side_name} {e['side']} edge: cut line wavy by {e['waviness_mm']} mm (TAG waviness)", whole)
            if e["roughness_mm"] is not None and e["roughness_mm"] > 0.08:
                flag(f"{side_name} {e['side']} edge: rough cut ({e['roughness_mm']} mm) (TAG roughness, fill/fray)", whole)
        for c in res["corners"]:
            if (c["rounding_vs_others_mm"] or 0) > 0.35:
                flag(f"{side_name} {c['corner']} corner blunter than the others by {c['rounding_vs_others_mm']} mm (PSA sharp corners, BGS corners, TAG squareness)", ev(_corner_box(c["corner"])))
        # Surface from the straight-on photo (stains, print spots, registration): gated
        s = res["surface"]
        face = [MARGIN + 4 * PX, MARGIN + 4 * PX, CW - 8 * PX, CH - 8 * PX]
        if s.get("stain_spots"):
            x, y, w, h = s["stain_boxes"][0]
            gated("surface", 9, 9, 9, f"{side_name}: {s['stain_spots']} possible stain(s) on light areas (PSA staining / wax stain, BGS surface)",
                  ev([x - PX, y - PX, w + 2 * PX, h + 2 * PX]))
        if s.get("print_spots") is not None and s["print_spots"] > 8:
            gated("surface", 9, 9, 9, f"{side_name}: {s['print_spots']} print specks on light areas (BGS print spots, PSA print imperfection)", ev(s.get("print_spot_box") or face))
        if s.get("registration_mm") is not None and s["registration_mm"] > 0.2:
            gated("surface", 7, 7, 7, f"{side_name}: colour out of register by {s['registration_mm']} mm (PSA 7 'out of register', BGS registration)", ev(face))
    return {"psa": psa, "bgs": bgs, "tag": tag, "why": why, "look": look, "why_evidence": why_ev, "look_evidence": look_ev, "would_cap": would}


def _edge_box(side, a, b, depth=2 * PX):
    """Box (x, y, w, h, card px) straddling the cut edge `side`, from a to b along it."""
    if side == "top": return [a, MARGIN - depth, b - a, 2 * depth]
    if side == "bottom": return [a, MARGIN + CH - depth, b - a, 2 * depth]
    if side == "left": return [MARGIN - depth, a, 2 * depth, b - a]
    return [MARGIN + CW - depth, a, 2 * depth, b - a]


def _corner_box(name, size=4 * PX):
    """4 mm box on a corner, 1 mm of it outside the card."""
    x = MARGIN - PX if "left" in name else MARGIN + CW + PX - size
    y = MARGIN - PX if "top" in name else MARGIN + CH + PX - size
    return [x, y, size, size]


CROP_PX, MAX_CROPS = 120, 16  # G9c evidence crops: long side in px, and how many per report (the rest: bbox only)


def crop_url(img, bbox, px, size=CROP_PX):
    """Small zoomed JPEG (data URL) of bbox (x, y, w, h) plus 1 mm around it, long side `size` px. None if empty."""
    x, y, w, h = bbox
    x0, y0 = max(0, int(x - px)), max(0, int(y - px))
    x1, y1 = min(img.shape[1], int(x + w + px)), min(img.shape[0], int(y + h + px))
    if x1 - x0 < 2 or y1 - y0 < 2:
        return None
    sub = img[y0:y1, x0:x1]
    k = size / max(sub.shape[:2])
    sub = cv2.resize(sub, (max(1, round(sub.shape[1] * k)), max(1, round(sub.shape[0] * k))), interpolation=cv2.INTER_CUBIC if k > 1 else cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", sub, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode() if ok else None


CANT_JUDGE = [
    ("surface scratches, scuffs and metallic print lines", "PSA 10/9, BGS surface, TAG surface", "need angled light or video; flat scans and phone photos hide them on chrome"),
    ("dents, dimples and creases that do not break the ink", "PSA, BGS surface, TAG surface", "need raking light"),
    ("gloss / original sheen", "PSA 10 'full original gloss', BGS 'perfect gloss'", "needs the card in hand"),
    ("edge lifting, tears and layer separation", "TAG edges", "needs a side view"),
    ("corner fill and fray under magnification", "BGS 9.5 'under magnification', TAG fill/fray", "needs a close-up at 10x; the screen only sees fray large enough for the photo"),
    ("trimming / altered stock", "all graders reject altered cards", "needs a size measurement against a known copy"),
]


def centering_only(path, hint=None):
    """Borders and splits only (no image, no wear checks): the extra stills of the 3-shot repeatability check."""
    img, q, err = locate(path, hint)
    if q is None:
        return {"status": "refused", "why": [err], "centering": {}}
    out, _ = bd.measure(img, q)
    return {k: out[k] for k in ("status", "why", "centering", "px_per_mm", "inner")}


def side_report(path, hint=None, straight=None, holder_guard=True):
    """One side's checks. straight: a dict that receives the card straightened by the border check (for the
    confirm screen), keyed "img". holder_guard=False skips the sleeve/toploader detection (calibrate.py on slab scans)."""
    img, q, err = locate(path, hint)
    if q is None:
        return None, err
    w = np.linalg.norm(cen.order(q)[1] - cen.order(q)[0])
    card, ppm = warp_with_margin(img, q), w / 63.0
    if ppm < 8:
        return None, f"photo too small ({ppm:.1f} px per mm; need 8+) to judge corners and edges"
    borders, flat = bd.measure(img, q)
    rep = {"file": path if isinstance(path, str) else None, "px_per_mm": round(ppm, 1), "borders": borders, "_card": card}
    shape = bd.outline_shape_error(q)
    sleeve, unsure = None, False
    if not shape and holder_guard:  # on the card straightened from the fitted cut edge, not the rough outline (G9c review)
        fit = (borders.get("outer") or {}).get("corners_px")
        sleeve, unsure = holder_signs(warp_with_margin(img, np.float32(fit)) if fit else card)
    if shape:  # G9a: the outline is a mat, shadow or holder, not the cut edge: edges/corners/stains on it are meaningless
        rep.update(edges=[], corners=[], surface={}, outline_error=shape)
    elif sleeve:  # G9c: the outline is the plastic; centering from it would be wrong too
        rep.update(edges=[], corners=[], surface={}, holder=sleeve)
        borders.update(status="refused", centering={}, why=[f"{HOLDER_RETAKE} ({sleeve})"])
        flat = None
    else:  # G9c per-edge guard: a side without a found cut edge (and its two corners) is not measured at all
        miss = borders.get("edges_missing") or []
        rep.update(edges=edge_checks(card, miss), corners=corner_checks(card, miss), surface=surface_checks(card), edges_missing=miss)
        if unsure:
            rep["sleeve_check"] = LOW_CONTRAST_RETAKE
    if straight is not None and flat is not None:
        straight["img"] = flat
    return rep, None


def assess(front, back=None, holder=False, hints=None):
    """front / back: file paths or raw image bytes (jpg, png, webp).
    holder=True: card photographed in a sleeve, toploader, magnetic case or slab. Plastic hides and fakes edge and
    corner detail, so only centering is reported."""
    return assess_with_centering(front, back, holder, hints)[0]


def assess_with_centering(front, back=None, holder=False, hints=None, straight=None, holder_guard=True):
    """assess(), plus the unrounded centering splits (worse side, 0.5-1) keyed front_lr / front_tb / back_lr / back_tb,
    measured from the printed border lines (borders.py) at the worst point along each side.
    straight: optional dict that receives {"front": {"img"}, "back": {"img"}} straightened cards.
    hints: {"front": corners, "back": corners} from the phone scanner (fractions of the photo).
    holder_guard: detect a sleeve/toploader from the photo (G9c); False only for calibrate.py on slab scans.
    A detected holder on either side takes the same path as holder=True."""
    hints = hints or {}
    straight = straight if straight is not None else {}
    straight.setdefault("front", {}); straight.setdefault("back", {})
    guard = holder_guard and not holder
    f, ferr = side_report(front, hints.get("front"), straight["front"], guard)
    b, berr = side_report(back, hints.get("back"), straight["back"], guard) if back else (None, "no back photo")
    seen = [(n, r["holder"]) for n, r in (("front", f), ("back", b)) if r and r.get("holder")]
    holder = holder or bool(seen)
    if holder:
        for r in (f, b):
            if r:
                r["edges"], r["corners"], r["surface"] = [], [], {}
        ferr = ferr or "in a holder: edges, corners and surface not judged (plastic hides wear and adds glare)"
    cent, cent_why = {}, []
    for name, rep in (("front", f), ("back", b)):
        if not rep:
            continue
        bo = rep["borders"]
        for axis in ("lr", "tb"):
            c = bo["centering"].get(axis)
            if c and bo["status"] in ("ok", "needs_manual"):
                cent[f"{name}_{axis}"] = c["worst"]  # graders judge the worst point
        if bo["why"] and not rep.get("holder"):
            cent_why.append(f"{name}: " + "; ".join(bo["why"]))
    if not f:
        ceil = {"psa": None, "bgs": None, "tag": None, "why": ["front photo not usable: no ceiling"], "look": []}
    elif holder:  # centering alone says nothing about corners, edges or surface: no ceiling, centering reported below
        ceil = {"psa": None, "bgs": None, "tag": None, "look": [],
                "why": [f"{HOLDER_RETAKE}: no condition ceiling" if seen else "in a holder: only centering checked, no condition ceiling"]}
    elif f.get("outline_error"):  # nothing on the front was measured on the card itself
        ceil = {"psa": None, "bgs": None, "tag": None, "why": ["front outline isn't the card's edge: no ceiling"], "look": []}
    else:
        ceil = grade_ceilings(f, b, cent)
    ceil.setdefault("why_evidence", [None] * len(ceil["why"])); ceil.setdefault("look_evidence", [None] * len(ceil["look"]))
    cards = {n: r.pop("_card", None) for n, r in (("front", f), ("back", b)) if r}
    n_crops = 0
    for e in ceil["why_evidence"] + ceil["look_evidence"]:  # G9c: a zoomed crop next to each flag
        if e is not None:
            e["crop"] = crop_url(cards[e["side"]], e["bbox"], PX) if n_crops < MAX_CROPS and cards.get(e["side"]) is not None else None
            n_crops += e["crop"] is not None
    cant = [{"point": p, "graders": g, "why": w} for p, g, w in CANT_JUDGE]
    for name, rep in (("front", f), ("back", b)):
        if rep and rep.get("outline_error"):
            cant.append({"point": f"{name} edges, corners and stains", "graders": "PSA, BGS, TAG", "why": OUTLINE_RETAKE + f" ({rep['outline_error']})"})
        if rep and rep["surface"].get("glare_retake"):
            cant.append({"point": f"{name} surface (stains, print spots, registration)", "graders": "PSA, BGS, TAG", "why": rep["surface"]["glare_retake"]})
        for sd in (rep or {}).get("edges_missing") or []:
            cant.append({"point": f"{name} {sd} edge and its corners", "graders": "PSA, BGS, TAG", "why": EDGE_RETAKE})
        if rep and rep.get("sleeve_check"):
            cant.append({"point": f"{name}: sleeve check", "graders": "PSA, BGS, TAG", "why": rep["sleeve_check"]})
    for name, why in seen:
        cant.append({"point": f"{name}: sleeve or holder", "graders": "PSA, BGS, TAG", "why": f"{HOLDER_RETAKE} ({why})"})
    for w in cent_why:
        cant.append({"point": "centering (border lines)", "graders": "PSA, BGS, TAG", "why": w + " - check or set the lines on the confirm screen"})
    if ferr: cant.append({"point": "front (all points)", "graders": "all", "why": ferr})
    if berr: cant.append({"point": "back (all points)", "graders": "all", "why": berr})
    return {"front": f, "back": b, "centering": {k: f"{round(v*100)}/{round((1-v)*100)}" for k, v in cent.items()},
            "ceiling": ceil, "cant_judge": cant, "note": PROVISIONAL, "holder": holder}, cent


if __name__ == "__main__":
    holder = "--holder" in sys.argv
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    print(json.dumps(assess(a[0], a[1] if len(a) > 1 else None, holder=holder), indent=1, default=float))
