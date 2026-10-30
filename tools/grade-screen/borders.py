"""G7 border measurement: the four cut edges and the four printed borders, measured, not assumed.

1. Outer edges (sub-pixel, full-resolution photo): ~60 short profiles across each side of the rough outline; on each,
   the first strong colour step coming in from the backdrop, located to a fraction of a pixel (parabola on the
   gradient peak). A straight line is fitted per side with RANSAC; corners are the line intersections.
2. Straighten the card at R px/mm (R = the photo's own resolution, 20-40) using those corners.
3. Inner frame: ~40 profiles per side over 5-95% of its length. On each, colour steps (Lab, delta E) between 0.4 mm
   and the side's depth limit. A candidate border line is one that most profiles agree on (60%+), nearly parallel to
   the cut edge. The nearest such line to the edge is the border; others are kept as alternates.
4. Centering = left / (left + right) and top / (top + bottom), at mid-side and at the worst point along the side.

Refuses (status "refused") below 12 px/mm (flags results under 20) or when an outer edge is not a clean straight line; says
"needs_manual" when the inner border of any side cannot be found (borderless designs, full-art cards).
All distances are in mm on a 63.5 x 88.9 mm card.
"""
import cv2
import numpy as np
from centering import order

CARD_W, CARD_H = 63.5, 88.9
MIN_PPM = 12.0          # tested: border error <= 0.04 mm and split error < 0.5 point down to 10.5 px/mm on synthetic cards
GOOD_PPM = 20.0         # below this the result is flagged "lower resolution: check the lines"
MIN_INLIERS = 0.6       # share of profiles that must agree on a line
MAX_RMS_PX = 0.5        # outer edge line fit, inliers only
MAX_TILT = 0.02         # inner line slope vs the cut edge (mm per mm): steeper is not a border line
STEP_DE = 9.0
MAX_ASPECT_ERR = 0.06    # outline width/height vs a real card (63.5/88.9); a PSA slab is ~0.60, a card 0.714           # minimum colour step (delta E) for an inner border candidate
SIDES = ("top", "right", "bottom", "left")


def _lab(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32) * np.float32([100 / 255, 1, 1]) - np.float32([0, 128, 128])


def _fit_line(pts, thresh, iters=200, seed=0):
    """RANSAC then least squares on inliers. pts: (n, 2). Returns (point, unit direction, inlier mask, rms)."""
    rng = np.random.default_rng(seed)
    n = len(pts)
    best = None
    for _ in range(iters):
        i, j = rng.choice(n, 2, replace=False)
        d = pts[j] - pts[i]
        L = np.hypot(*d)
        if L < 1e-6:
            continue
        nrm = np.array([-d[1], d[0]]) / L
        r = np.abs((pts - pts[i]) @ nrm)
        m = r < thresh
        if best is None or m.sum() > best.sum():
            best = m
    if best is None or best.sum() < 2:
        return None
    vx, vy, x0, y0 = cv2.fitLine(pts[best].astype(np.float32), cv2.DIST_L2, 0, 0.01, 0.01).ravel()
    p0, u = np.array([x0, y0]), np.array([vx, vy])
    nrm = np.array([-u[1], u[0]])
    r = (pts - p0) @ nrm
    m = np.abs(r) < thresh
    return p0, u, m, float(np.sqrt(np.mean(r[m] ** 2))) if m.any() else 99.0


def _intersect(a, b):
    (p, u), (q, v) = a, b
    A = np.array([u, -v]).T
    t = np.linalg.solve(A, q - p)
    return p + t[0] * u


def _peak(y, i):
    """Sub-sample position of a peak at index i (parabola through 3 points)."""
    if 0 < i < len(y) - 1:
        a, b, c = y[i - 1], y[i], y[i + 1]
        den = a - 2 * b + c
        if den < 0:
            return i + 0.5 * (a - c) / den
    return float(i)


def outer_edges(img, quad, ppm, half_mm=1.2, n=60, step=0.5):
    """Fit the 4 cut edges. quad: rough corners (image px). Returns (corners TL,TR,BR,BL, per-side stats)."""
    q = order(np.float32(quad))
    lab = _lab(cv2.GaussianBlur(img, (0, 0), 0.7))
    ctr = q.mean(0)
    lines, stats = [], {}
    offs = np.arange(-half_mm * ppm, half_mm * ppm + step, step, dtype=np.float32)
    for k, side in enumerate(SIDES):
        a, b = q[k], q[(k + 1) % 4]
        d = (b - a) / np.linalg.norm(b - a)
        nrm = np.array([-d[1], d[0]], np.float32)
        if (ctr - a) @ nrm < 0:
            nrm = -nrm  # point inward
        t = np.linspace(0.06, 0.94, n, dtype=np.float32)
        base = a[None] + t[:, None] * (b - a)[None]
        P = base[:, None, :] + offs[None, :, None] * nrm[None, None, :]
        prof = cv2.remap(lab, P[..., 0], P[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)  # (n, m, 3)
        g = np.sqrt((np.gradient(prof, axis=1) ** 2).sum(-1))
        pts = []
        for r in range(n):
            gr = g[r]
            mx = gr.max()
            if mx < 2.0:  # no edge (delta E per sample)
                continue
            # First strong step coming from the backdrop side: the cut edge, not a printed line just inside it.
            idx = np.flatnonzero(gr >= 0.5 * mx)[0]
            while idx + 1 < len(gr) and gr[idx + 1] >= gr[idx]:
                idx += 1
            s = offs[0] + _peak(gr, idx) * step
            pts.append(base[r] + s * nrm)
        if len(pts) < n * MIN_INLIERS:
            return None, {"side": side, "why": "edge not found"}
        f = _fit_line(np.array(pts), thresh=1.0)
        if f is None:
            return None, {"side": side, "why": "edge not straight"}
        p0, u, m, rms = f
        stats[side] = {"inliers": round(float(m.sum()) / n, 2), "rms_px": round(rms, 2)}
        lines.append((p0, u))
    corners = np.array([_intersect(lines[(k + 3) % 4], lines[k]) for k in range(4)], np.float32)
    return corners, stats


def straighten(img, corners, R, margin_mm=1.5):
    """Card warped flat at R px/mm with a margin of backdrop. Card spans [M, M+W] x [M, M+H]."""
    M = margin_mm * R
    W, H = CARD_W * R, CARD_H * R
    dst = np.float32([[M, M], [M + W, M], [M + W, M + H], [M, M + H]])
    m = cv2.getPerspectiveTransform(np.float32(corners), dst)
    size = (int(round(W + 2 * M)), int(round(H + 2 * M)))
    return cv2.warpPerspective(img, m, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE), M


def _side_profiles(lab, side, R, M, n=40, max_mm=12.0, band_mm=1.0):
    """Profiles from the cut edge inward: (positions along the side in mm, depths in mm, profiles (n, m, 3))."""
    W, H = CARD_W * R, CARD_H * R
    along = CARD_W if side in ("top", "bottom") else CARD_H
    across = CARD_H if side in ("top", "bottom") else CARD_W
    depth = min(max_mm, 0.4 * across)
    pos = np.linspace(0.05, 0.95, n) * along
    dep = np.arange(0, depth * R) / R
    half = max(1, int(band_mm * R / 2))
    out = np.zeros((n, len(dep), 3), np.float32)
    for i, p in enumerate(pos):
        c = int(round(M + p * R))
        if side == "top":
            strip = lab[int(round(M)): int(round(M)) + len(dep), c - half: c + half + 1].mean(1)
        elif side == "bottom":
            e = int(round(M + H))  # pixel centre on the cut edge: depth 0, as on the top/left sides
            strip = lab[e - len(dep) + 1: e + 1, c - half: c + half + 1].mean(1)[::-1]
        elif side == "left":
            strip = lab[c - half: c + half + 1, int(round(M)): int(round(M)) + len(dep)].mean(0)
        else:
            e = int(round(M + W))
            strip = lab[c - half: c + half + 1, e - len(dep) + 1: e + 1].mean(0)[::-1]
        out[i, :len(strip)] = strip
    return pos, dep, out


def _steps(prof, R, w_mm=0.25):
    """Colour step strength at each depth: delta E between the mean colour just before and just after."""
    w = max(2, int(round(w_mm * R)))
    c = np.cumsum(np.pad(prof, ((0, 0), (1, 0), (0, 0))), axis=1)
    m = prof.shape[1]
    s = np.zeros(prof.shape[:2], np.float32)
    i = np.arange(w, m - w)
    before = (c[:, i] - c[:, i - w]) / w
    after = (c[:, i + w] - c[:, i]) / w
    s[:, i] = np.sqrt(((after - before) ** 2).sum(-1))
    return s


def inner_lines(lab, side, R, M):
    """Candidate printed-border lines for one side, nearest the cut edge first."""
    pos, dep, prof = _side_profiles(lab, side, R, M)
    s = _steps(prof, R)
    lo = int(0.4 * R)
    peaks = []  # (profile index, depth mm, strength)
    for r in range(len(pos)):
        sr = s[r]
        for i in range(max(lo, 1), len(sr) - 1):
            if sr[i] >= STEP_DE and sr[i] >= sr[i - 1] and sr[i] > sr[i + 1]:
                peaks.append((r, (_peak(sr, i) - 0.5) / R, float(sr[i])))  # step between samples i-1 and i
    if not peaks:
        return []
    P = np.array(peaks)
    n = len(pos)
    mid = pos.mean()
    cands = []
    for slope in np.linspace(-MAX_TILT, MAX_TILT, 21):
        proj = P[:, 1] - slope * (pos[P[:, 0].astype(int)] - mid)
        for d0 in np.unique(np.round(proj, 1)):
            near = np.abs(proj - d0) < 0.15
            support = len(np.unique(P[near, 0]))
            if support >= MIN_INLIERS * n:
                cands.append((support, d0, slope))
    cands.sort(key=lambda c: (-c[0], c[1]))
    found = []
    for support, d0, slope in cands:
        if any(abs(d0 - f["depth_mm"]) < 0.4 for f in found):
            continue
        proj = P[:, 1] - slope * (pos[P[:, 0].astype(int)] - mid)
        near = np.abs(proj - d0) < 0.2
        # one point per profile: the strongest near the line
        pts = {}
        for (r, d, st), ok in zip(P, near):
            if ok and (int(r) not in pts or st > pts[int(r)][1]):
                pts[int(r)] = (d, st)
        if len(pts) < MIN_INLIERS * n:
            continue
        x = pos[list(pts)]
        y = np.array([v[0] for v in pts.values()])
        k, c0 = np.polyfit(x - mid, y, 1)
        if abs(k) > MAX_TILT * 1.5:
            continue
        res = y - (k * (x - mid) + c0)
        ends = (c0 + k * (pos[0] - mid), c0 + k * (pos[-1] - mid))
        # colour on each side of the line (pairs left with right, top with bottom)
        di = np.clip(np.round(y * R).astype(int), 1, prof.shape[1] - 2)
        rows = np.array(list(pts))
        g = int(0.4 * R)
        before = np.median([prof[r, max(0, d - g): d - 1].mean(0) for r, d in zip(rows, di) if d - g > 0] or [np.zeros(3)], 0)
        after = np.median([prof[r, d + 2: d + g].mean(0) for r, d in zip(rows, di) if d + g < prof.shape[1]] or [np.zeros(3)], 0)
        found.append({"depth_mm": round(float(c0), 3), "ends_mm": [round(float(e), 3) for e in ends],
                      "slope": round(float(k), 4), "inliers": round(len(pts) / n, 2),
                      "rms_mm": round(float(np.sqrt(np.mean(res ** 2))), 3),
                      "strength": round(float(np.median([v[1] for v in pts.values()])), 1),
                      "colors": [before.round(1).tolist(), after.round(1).tolist()]})
    found.sort(key=lambda f: f["depth_mm"])
    return found[:4]


def _pair(a, b):
    """Choose the border line on two opposite sides: the nearest-to-edge pair whose colours match
    (same printed frame on both sides); falls back to the nearest line on each."""
    if not a or not b:
        return (a[0] if a else None), (b[0] if b else None)
    best, best_s = (a[0], b[0]), None
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            de = np.linalg.norm(np.subtract(x["colors"], y["colors"]), axis=1).mean()
            if de > 25:
                continue
            s = i + j + de / 25
            if best_s is None or s < best_s:
                best, best_s = (x, y), s
    return best


def split(a, b):
    """(larger share, side of the larger border) e.g. 0.55 means 55/45."""
    t = a + b
    return max(a, b) / t if t > 0 else None


def centering(lines):
    """L/R and T/B splits at mid-side and at the worst point along the sides (lines: side -> chosen line)."""
    out = {}
    for key, s1, s2 in (("lr", "left", "right"), ("tb", "top", "bottom")):
        A, B = lines.get(s1), lines.get(s2)
        if not A or not B:
            continue
        mid = split(A["depth_mm"], B["depth_mm"])
        worst = max(split(A["ends_mm"][i], B["ends_mm"][i]) for i in (0, 1))
        out[key] = {"mid": round(mid, 4), "worst": round(max(mid, worst), 4),
                    "wider": s1 if A["depth_mm"] > B["depth_mm"] else s2}
    return out


def outline_shape_error(quad):
    """None when the outline has a card's proportions, else why not (a slab, toploader, mat or shadow was traced)."""
    q = order(np.float32(quad))
    sides_px = [np.linalg.norm(q[(k + 1) % 4] - q[k]) for k in range(4)]
    aspect = (sides_px[0] + sides_px[2]) / (sides_px[1] + sides_px[3])
    if abs(aspect / (CARD_W / CARD_H) - 1) > MAX_ASPECT_ERR:
        return f"outline is {aspect:.3f} wide/tall, a card is {CARD_W / CARD_H:.3f}: probably a slab, toploader or another object, not the card's cut edge"
    return None


def measure(img, quad):
    """Everything the confirm screen needs. img: full-resolution BGR photo; quad: rough corners in image px."""
    q = order(np.float32(quad))
    sides_px = [np.linalg.norm(q[(k + 1) % 4] - q[k]) for k in range(4)]
    ppm = float((sides_px[0] + sides_px[2]) / 2 / CARD_W + (sides_px[1] + sides_px[3]) / 2 / CARD_H) / 2
    out = {"status": "refused", "px_per_mm": round(ppm, 1), "outer": None, "inner": {}, "alternates": {}, "centering": {}, "why": []}
    shape = outline_shape_error(q)
    if shape:
        out["why"].append(shape)
        return out, None
    if ppm < MIN_PPM:
        out["why"].append(f"photo has {ppm:.1f} px per mm; centering needs {MIN_PPM:.0f}+ (move closer or use the full-size photo)")
        return out, None
    corners, st = outer_edges(img, q, ppm)
    if corners is None:
        out["why"].append(f"{st['side']} cut edge: {st['why']} (plain dark backdrop, card flat)")
        return out, None
    # refine once around the fitted edges
    c2, st2 = outer_edges(img, corners, ppm, half_mm=0.5)
    if c2 is not None:
        corners, st = c2, st2
    out["outer"] = {"corners_px": corners.round(2).tolist(), "fit": st}
    bad = [s for s, v in st.items() if v["inliers"] < MIN_INLIERS or v["rms_px"] > MAX_RMS_PX]
    if bad:
        out["why"].append("cut edge not clean on " + ", ".join(bad) + " (glare, shadow, sleeve or damaged edge)")
        return out, None
    R = float(min(40.0, max(MIN_PPM, round(ppm))))
    flat, M = straighten(img, corners, R)
    out["straight"] = {"px_per_mm": R, "margin_px": M}
    lab = _lab(cv2.GaussianBlur(flat, (0, 0), 0.6))
    cands = {s: inner_lines(lab, s, R, M) for s in SIDES}
    l, r = _pair(cands["left"], cands["right"])
    t, b = _pair(cands["top"], cands["bottom"])
    chosen = {"left": l, "right": r, "top": t, "bottom": b}
    for s in SIDES:
        c = chosen[s]
        out["inner"][s] = None if c is None else {k: c[k] for k in ("depth_mm", "ends_mm", "slope", "inliers", "rms_mm", "strength")}
        out["alternates"][s] = [x["depth_mm"] for x in cands[s] if c is None or x is not c]
    missing = [s for s in SIDES if chosen[s] is None]
    out["centering"] = centering(chosen)
    if missing:
        out["status"] = "needs_manual"
        out["why"].append("printed border not found on " + ", ".join(missing) + " (borderless design, or the border blends into the art): set it by hand")
    else:
        out["status"] = "ok"
    if ppm < GOOD_PPM:
        out["why"].append(f"lower resolution ({ppm:.0f} px per mm): check the lines on the confirm screen")
    return out, flat
