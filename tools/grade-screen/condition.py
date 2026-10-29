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
import sys, json
import cv2
import numpy as np
import centering as cen

PX = 10            # px per mm in the normalised card
CW, CH = 63 * PX, 88 * PX
MARGIN = 3 * PX    # keep 3 mm of backdrop around the card so cut edges and corners can be inspected
PROVISIONAL = "thresholds provisional until calibrated against returned PSA grades"

# Centering tolerances: worse side of the larger split, front / back.
PSA_CENT = [(10, 0.55, 0.75), (9, 0.60, 0.90), (8, 0.65, 0.90), (7, 0.70, 0.90)]
BGS_CENT = [(10, 0.52, 0.60),  # 50/50 within photo measuring error (~2%)
            (9.5, 0.55, 0.60), (9, 0.55, 0.70), (8, 0.60, 0.80)]


def warp_with_margin(img, quad):
    m = cv2.getPerspectiveTransform(cen.order(quad), np.float32([[MARGIN, MARGIN], [MARGIN + CW, MARGIN], [MARGIN + CW, MARGIN + CH], [MARGIN, MARGIN + CH]]))
    return cv2.warpPerspective(img, m, (CW + 2 * MARGIN, CH + 2 * MARGIN), borderMode=cv2.BORDER_REPLICATE)


def load(path):
    """Normalised card with a backdrop margin, plus how many real pixels per mm the photo had."""
    img = cv2.imread(path)
    if img is None:
        return None, "unreadable", 0.0
    q = cen.find_card(img)
    if q is None or not cen.on_backdrop(img, q):
        return None, "no clean outline on a plain backdrop (cropped, angled, in a holder or cluttered photo)", 0.0
    w = np.linalg.norm(cen.order(q)[1] - cen.order(q)[0])
    return warp_with_margin(img, q), None, w / 63.0


def lab(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)


def border_ref(L, side):
    """Median lightness of the printed border 1.5-3 mm in from one cut edge (corners excluded)."""
    a, b, c = MARGIN + int(1.5 * PX), MARGIN + 3 * PX, 6 * PX
    if side == "top":    return float(np.median(L[a:b, MARGIN + c: MARGIN + CW - c]))
    if side == "bottom": return float(np.median(L[MARGIN + CH - b: MARGIN + CH - a, MARGIN + c: MARGIN + CW - c]))
    if side == "left":   return float(np.median(L[MARGIN + c: MARGIN + CH - c, a:b]))
    return float(np.median(L[MARGIN + c: MARGIN + CH - c, MARGIN + CW - b: MARGIN + CW - a]))


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


def edge_checks(card):
    """Per side: chipping / whitening specks where the border is dark enough to show them (judged against the
    border colour at that spot), and cut-line roughness, waviness and notches where the border stands out from the backdrop."""
    L = lab(card)[:, :, 0] * 100 / 255
    g = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY).astype(np.float32)
    out = []
    for side in ("top", "bottom", "left", "right"):
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
                    "specks_per_10cm": None if n is None else round(n / judged_mm * 100, 1),
                    "roughness_mm": rough, "waviness_mm": wave, "notches": notches,
                    "note": ("border too light to see whitening or chipping" if n is None else None) if rough is not None else
                            ("border too light to see whitening or chipping; " if n is None else "") + "border too close to the backdrop colour to trace the cut line"})
    return out


def corner_checks(card):
    """Per corner: whitening (light pixels in the 1.5 mm corner vs the border right next to it) and rounding
    (backdrop inside the ideal square corner), the latter only where border and backdrop differ clearly."""
    L = lab(card)[:, :, 0] * 100 / 255
    g = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY).astype(np.float32)
    r = int(1.5 * PX)
    tri = np.add.outer(np.arange(r), np.arange(r)) < r
    ring = (np.add.outer(np.arange(3 * r), np.arange(3 * r)) >= 2 * r) & (np.add.outer(np.arange(3 * r), np.arange(3 * r)) < 3 * r)
    out = []
    for name in ("top-left", "top-right", "bottom-left", "bottom-right"):
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


def surface_checks(card):
    """What a photo can show of the surface: stains on light areas, print spots on light areas, colour registration."""
    inner = card[MARGIN + 4 * PX: MARGIN + CH - 4 * PX, MARGIN + 4 * PX: MARGIN + CW - 4 * PX]
    Lab = lab(inner); L, A, B = Lab[:, :, 0] * 100 / 255, Lab[:, :, 1] - 128, Lab[:, :, 2] - 128
    light = L > 80
    out = {}
    if light.sum() > 25 * PX * PX:  # at least 25 mm^2 of light area to judge against
        b_ref = float(np.median(B[light]))
        stain = light & (B - b_ref > 12) & (A > -5)
        stain = cv2.morphologyEx(stain.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, _, st, _ = cv2.connectedComponentsWithStats(stain)
        out["stain_spots"] = int(sum(1 for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= PX * PX))  # >= 1 mm^2
        lap = cv2.Laplacian(cv2.GaussianBlur(L, (3, 3), 0), cv2.CV_32F)
        spot = light & (lap > 25)
        n2, _, st2, _ = cv2.connectedComponentsWithStats(spot.astype(np.uint8))
        out["print_spots"] = int(sum(1 for i in range(1, n2) if 2 <= st2[i, cv2.CC_STAT_AREA] <= 30))
    else:
        out["stain_spots"] = out["print_spots"] = None
    # Registration: shift between red and blue channel edge maps.
    e = lambda ch: cv2.Sobel(inner[:, :, ch].astype(np.float32), cv2.CV_32F, 1, 1, ksize=3)
    (dx, dy), resp = cv2.phaseCorrelate(e(2), e(0))
    out["registration_mm"] = round(float(np.hypot(dx, dy)) / PX, 2) if resp > 0.05 else None
    return out


def grade_ceilings(front, back, cent):
    """Map every finding to the highest grade each company's written standard still allows."""
    psa, bgs, tag, why = 10, 10, 10, []

    def cap(p, b, t, reason):
        nonlocal psa, bgs, tag
        psa, bgs, tag = min(psa, p), min(bgs, b), min(tag, t)
        why.append(f"{reason} -> PSA {p}, BGS {b}, TAG {t}")

    # Centering
    for label, worse, i in (("front L/R", cent.get("front_lr"), 1), ("back L/R", cent.get("back_lr"), 2)):
        if worse is None:
            continue
        p = next((g for g, f, b in PSA_CENT if worse <= (f if i == 1 else b)), 6)
        b = next((g for g, f, bk in BGS_CENT if worse <= (f if i == 1 else bk)), 7)
        if p < 10 or b < 10:
            cap(p, b, min(p, b), f"{label} centering {round(worse*100)}/{round((1-worse)*100)}")

    # Edges: chipping / whitening specks (checked by eye against the Ronaldo #161 test card). Caps the ceiling.
    look = []  # measured but not yet calibrated: shown for a human look, does not lower the ceiling
    for side_name, res in (("front", front), ("back", back)):
        if not res:
            continue
        sp = [e["specks"] for e in res["edges"] if e["specks"] is not None]
        sides_hit = sum(1 for s in sp if s >= 3)
        total = sum(sp)
        if total >= 1:
            if sides_hit == 0 and total <= 6:
                cap(9, 9, 9, f"{side_name} edges: {total} scattered speck(s) of chipping")
            elif sides_hit <= 2:
                cap(8, 8.5, 8, f"{side_name} edges: chipping specks along {sides_hit} side(s), {total} total")
            else:
                cap(8, 8, 8, f"{side_name} edges: chipping specks along {sides_hit} sides, {total} total")
        worn = [c for c in res["corners"] if (c["whitening_pct"] or 0) > 3]
        if worn:
            n = len(worn)
            cap(9 if n == 1 else 8, 9 if n == 1 else 8.5, 9 if n == 1 else 8, f"{side_name}: whitening at {n} corner(s) ({', '.join(c['corner'] for c in worn)})")
        # Look flags (TAG notches/waviness/roughness, corner dings, stains, print spots, registration)
        for e in res["edges"]:
            if e["notches"]:
                look.append(f"{side_name} {e['side']} edge: {e['notches']} possible notch(es) 0.5 mm+ (TAG notches; PSA/BGS edges)")
            if e["waviness_mm"] is not None and e["waviness_mm"] > 0.5:
                look.append(f"{side_name} {e['side']} edge: cut line wavy by {e['waviness_mm']} mm (TAG waviness)")
            if e["roughness_mm"] is not None and e["roughness_mm"] > 0.08:
                look.append(f"{side_name} {e['side']} edge: rough cut ({e['roughness_mm']} mm) (TAG roughness, fill/fray)")
        for c in res["corners"]:
            if (c["rounding_vs_others_mm"] or 0) > 0.35:
                look.append(f"{side_name} {c['corner']} corner blunter than the others by {c['rounding_vs_others_mm']} mm (PSA sharp corners, BGS corners, TAG squareness)")
        s = res["surface"]
        if s.get("stain_spots"):
            look.append(f"{side_name}: {s['stain_spots']} possible stain(s) on light areas (PSA staining / wax stain, BGS surface)")
        if s.get("print_spots") is not None and s["print_spots"] > 8:
            look.append(f"{side_name}: {s['print_spots']} print specks on light areas (BGS print spots, PSA print imperfection)")
        if s.get("registration_mm") is not None and s["registration_mm"] > 0.2:
            look.append(f"{side_name}: colour out of register by {s['registration_mm']} mm (PSA 7 'out of register', BGS registration)")
    return {"psa": psa, "bgs": bgs, "tag": tag, "why": why, "look": look}


CANT_JUDGE = [
    ("surface scratches, scuffs and metallic print lines", "PSA 10/9, BGS surface, TAG surface", "need angled light or video; flat scans and phone photos hide them on chrome"),
    ("dents, dimples and creases that do not break the ink", "PSA, BGS surface, TAG surface", "need raking light"),
    ("gloss / original sheen", "PSA 10 'full original gloss', BGS 'perfect gloss'", "needs the card in hand"),
    ("edge lifting, tears and layer separation", "TAG edges", "needs a side view"),
    ("corner fill and fray under magnification", "BGS 9.5 'under magnification', TAG fill/fray", "needs a close-up at 10x; the screen only sees fray large enough for the photo"),
    ("trimming / altered stock", "all graders reject altered cards", "needs a size measurement against a known copy"),
]


def side_report(path):
    card, err, ppm = load(path)
    if card is None:
        return None, err
    if ppm < 8:
        return None, f"photo too small ({ppm:.1f} px per mm; need 8+) to judge corners and edges"
    lr = cen.lr_offset_mm(card[MARGIN:MARGIN + CH, MARGIN:MARGIN + CW])
    return {"file": path, "px_per_mm": round(ppm, 1), "lr_offset_mm": round(lr[0], 2), "lr_symmetry": round(lr[1], 3),
            "edges": edge_checks(card), "corners": corner_checks(card), "surface": surface_checks(card)}, None


def assess(front, back=None, border_mm=3.0, holder=False):
    """holder=True: card photographed in a sleeve, toploader, magnetic case or slab. Plastic hides and fakes edge and
    corner detail, so only centering is reported."""
    f, ferr = side_report(front)
    b, berr = side_report(back) if back else (None, "no back photo")
    if holder:
        for r in (f, b):
            if r:
                r["edges"], r["corners"], r["surface"] = [], [], {}
        ferr = ferr or "in a holder: edges, corners and surface not judged (plastic hides wear and adds glare)"
    cent = {}
    for key, rep in (("front_lr", f), ("back_lr", b)):
        if rep and rep["lr_symmetry"] >= 0.35:
            left = min(max((border_mm + rep["lr_offset_mm"]) / (2 * border_mm), 0), 1)
            cent[key] = max(left, 1 - left)
    if not f:
        ceil = {"psa": None, "bgs": None, "tag": None, "why": ["front photo not usable: no ceiling"], "look": []}
    elif holder:  # centering alone says nothing about corners, edges or surface: no ceiling, centering reported below
        ceil = {"psa": None, "bgs": None, "tag": None, "why": ["in a holder: only centering checked, no condition ceiling"], "look": []}
    else:
        ceil = grade_ceilings(f, b, cent)
    cant = [{"point": p, "graders": g, "why": w} for p, g, w in CANT_JUDGE]
    cant.append({"point": "top/bottom centering", "graders": "PSA, BGS, TAG", "why": "card designs are not top/bottom symmetric; measure with a centering tool"})
    if ferr: cant.append({"point": "front (all points)", "graders": "all", "why": ferr})
    if berr: cant.append({"point": "back (all points)", "graders": "all", "why": berr})
    return {"front": f, "back": b, "centering": {k: f"{round(v*100)}/{round((1-v)*100)}" for k, v in cent.items()},
            "ceiling": ceil, "cant_judge": cant, "note": PROVISIONAL}


if __name__ == "__main__":
    holder = "--holder" in sys.argv
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    print(json.dumps(assess(a[0], a[1] if len(a) > 1 else None, holder=holder), indent=1, default=float))
