"""Surface check from a raking-light photo (G6): dents, dimples, creases, scratches and print lines.

A flat, straight-on photo cannot show a dent: the ink looks the same. Light that skims across the card from a low
angle turns any bump or fold into a shadow/highlight. Method:
  1. find and straighten the card in the flat photo and in the raking photo (same outline finder as condition.py),
     then align the raking photo onto the flat one (ECC, small affine);
  2. divide raking by flat in log space: the printed design is in both, so it cancels; what is left is shading
     from the card's shape plus a smooth light falloff;
  3. remove the falloff (high-pass), ignore the outer 3 mm (cut edges) and blown-out glare, and score each pixel
     against the card's own noise (robust z-score);
  4. strong round spots -> dent / dimple; long thin marks -> crease (long) or scratch / print line (short).
Look flags only: thresholds are uncalibrated, so findings never lower the grade ceiling.
"""
import base64
import cv2
import numpy as np
import condition as cond
import centering as cen

PX = 12                      # px per mm in the straightened card
CW, CH = 63 * PX, 88 * PX
INSET = 3 * PX               # skip the outer 3 mm: cut edges and outline misfit live there (edge_checks covers edges)
Z_SPOT, Z_LINE = 5.0, 4.0    # robust z thresholds (provisional)
DENT_MM2 = (1.5, 400.0)      # dent / dimple marked-area range in mm^2 (shadow + highlight lobes)
LINE_MIN_MM, CREASE_MM = 6.0, 20.0
MAX_FINDINGS = 8


def straighten(src, hint=None):
    """BGR image of the card warped to CW x CH, or (None, reason). hint: phone-scanner corners (fractions)."""
    img = cond.read_image(src)
    if img is None:
        return None, "unreadable"
    q = cond.quad_from_hint(img, hint) if hint is not None else None
    if q is None:
        q = cen.find_card(img)
    if q is None:
        return None, "card outline not found"
    m = cv2.getPerspectiveTransform(cen.order(q), np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]]))
    return cv2.warpPerspective(img, m, (CW, CH), borderMode=cv2.BORDER_REPLICATE), None


def _edges(x):
    x = cv2.GaussianBlur(x, (0, 0), 1.5)
    return cv2.magnitude(cv2.Sobel(x, cv2.CV_32F, 1, 0), cv2.Sobel(x, cv2.CV_32F, 0, 1))


def align(moving, fixed):
    """Warp `moving` onto `fixed` (both gray float32) with a small affine, matched on edge maps (raking light changes
    brightness, edges stay put). Keeps the result only if it matches better than no warp."""
    s = 0.5
    a, b = cv2.resize(_edges(np.log1p(fixed)), None, fx=s, fy=s), cv2.resize(_edges(np.log1p(moving)), None, fx=s, fy=s)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(a, b, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-6), None, 1)
    except cv2.error:
        return moving
    warp[:, 2] /= s
    out = cv2.warpAffine(moving, warp, (fixed.shape[1], fixed.shape[0]), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    fe = _edges(np.log1p(fixed)).ravel()
    score = lambda m: np.corrcoef(fe, _edges(np.log1p(m)).ravel())[0, 1]
    return out if score(out) >= score(moving) else moving


def where(x, y):
    """Plain-words location of a point in the straightened card."""
    col = ("left", "centre", "right")[min(2, int(3 * x / CW))]
    row = ("top", "middle", "bottom")[min(2, int(3 * y / CH))]
    return "centre" if (row, col) == ("middle", "centre") else f"{row} {col}"


def anomaly_map(flat, raking):
    """Robust z-score of shape shading. flat / raking: straightened BGR cards."""
    f = cv2.cvtColor(flat, cv2.COLOR_BGR2GRAY).astype(np.float32)
    r = align(cv2.cvtColor(raking, cv2.COLOR_BGR2GRAY).astype(np.float32), f)
    d = np.log1p(r) - np.log1p(f)
    mask = np.zeros(d.shape, bool)
    mask[INSET:-INSET, INSET:-INSET] = True
    # Clipped in any colour channel (glare, or bright ink pushed to white by the lamp): the ratio is meaningless there.
    clipped = (raking.max(axis=2) >= 245) | (flat.max(axis=2) >= 245)
    mask &= cv2.dilate(clipped.astype(np.uint8), np.ones((5, 5), np.uint8)) == 0
    mask &= f > 25                                                   # near-black ink: JPEG noise dominates the ratio
    # Print edges: a sub-pixel misalignment there looks like shading. Drop the strongest 15% of print gradients.
    g = _edges(np.log1p(f))
    mask &= cv2.dilate((g > np.percentile(g, 85)).astype(np.uint8), np.ones((5, 5), np.uint8)) == 0
    # Remove the lamp's falloff: fit a smooth quadratic surface over valid pixels (works right up to the edges,
    # where a blur would be one-sided), then keep 1-15 mm structure with a masked (normalised) high-pass.
    ys, xs = np.nonzero(mask)
    if ys.size < 1000:
        return None, mask
    pick = np.random.default_rng(0).choice(ys.size, min(40000, ys.size), replace=False)
    def basis(x, y):
        x, y = x / CW - 0.5, y / CH - 0.5
        return np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], -1)
    coef, *_ = np.linalg.lstsq(basis(xs[pick].astype(np.float32), ys[pick].astype(np.float32)), d[ys[pick], xs[pick]], rcond=None)
    yy, xx = np.mgrid[0:d.shape[0], 0:d.shape[1]].astype(np.float32)
    d = d - basis(xx, yy) @ coef.astype(np.float32)
    mf = mask.astype(np.float32)
    nblur = lambda a, s: cv2.GaussianBlur(a * mf, (0, 0), s) / np.maximum(cv2.GaussianBlur(mf, (0, 0), s), 1e-3)
    d = nblur(d, 1.5) - nblur(d, 6 * PX)
    v = d[mask]
    if v.size < 1000:
        return None, mask
    med = float(np.median(v)); mad = float(np.median(np.abs(v - med))) * 1.4826
    # Noise per pixel: the card's own spread, plus JPEG/sensor rounding, which is large in relative terms on dark ink
    # (a 2-level error on gray 30 is 7%). Dark areas therefore need a stronger mark to count.
    sigma = np.sqrt(mad ** 2 + (2.5 / (cv2.GaussianBlur(f, (0, 0), 2) + 1)) ** 2)
    z = (d - med) / sigma
    z[~mask] = 0
    return z, mask


def _lines(strong):
    """Straight marks, bridging gaps where masked print edges cut them. Collinear pieces are merged."""
    segs = cv2.HoughLinesP(strong * 255, 1, np.pi / 180, threshold=int(3 * PX), minLineLength=int(3 * PX), maxLineGap=int(5 * PX))
    if segs is None:
        return []
    merged = []  # [x0, y0, x1, y1]
    for x0, y0, x1, y1 in segs.reshape(-1, 4).astype(float):
        ang = np.arctan2(y1 - y0, x1 - x0) % np.pi
        for m in merged:
            mang = np.arctan2(m[3] - m[1], m[2] - m[0]) % np.pi
            da = min(abs(ang - mang), np.pi - abs(ang - mang))
            # distance of this segment's midpoint from m's line
            dx, dy = m[2] - m[0], m[3] - m[1]
            dist = abs(dy * ((x0 + x1) / 2 - m[0]) - dx * ((y0 + y1) / 2 - m[1])) / max(np.hypot(dx, dy), 1e-6)
            if da < np.radians(10) and dist < 3 * PX:
                pts = np.array([[m[0], m[1]], [m[2], m[3]], [x0, y0], [x1, y1]])
                u = np.array([np.cos(mang), np.sin(mang)])
                proj = pts @ u
                a, b = pts[np.argmin(proj)], pts[np.argmax(proj)]
                m[:] = [a[0], a[1], b[0], b[1]]
                break
        else:
            merged.append([x0, y0, x1, y1])
    return merged


def findings_from(z):
    out = []
    strong = (np.abs(z) > Z_LINE).astype(np.uint8)
    strong = cv2.morphologyEx(strong, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # Split marks by shape: thin ones (aspect >= 4) feed the line finder; round ones are dent candidates.
    n, lab, stats, cents = cv2.connectedComponentsWithStats(strong, 8)
    thin = np.zeros_like(strong)
    spots = []
    for i in range(1, n):
        comp = (lab == i).astype(np.uint8)
        cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        (_, _), (rw, rh), _ = cv2.minAreaRect(cnts[0])
        if max(rw, rh) / max(1.0, min(rw, rh)) >= 4:
            thin |= comp
        else:
            spots.append(i)
    lines = []
    for x0, y0, x1, y1 in _lines(thin):
        length = np.hypot(x1 - x0, y1 - y0) / PX
        if length < LINE_MIN_MM:
            continue
        seg = np.zeros_like(strong); cv2.line(seg, (int(x0), int(y0)), (int(x1), int(y1)), 1, 3)
        lines.append((x0, y0, x1, y1, length, float(np.abs(z[seg > 0]).max())))
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        out.append({"kind": "crease" if length >= CREASE_MM else "scratch or print line", "where": where(cx, cy),
                    "x": round(float(cx) / CW, 3), "y": round(float(cy) / CH, 3), "size_mm": round(float(length), 1), "strength": round(lines[-1][5], 1)})
    near_line = np.zeros_like(strong)
    for x0, y0, x1, y1, *_ in lines:
        cv2.line(near_line, (int(x0), int(y0)), (int(x1), int(y1)), 1, int(6 * PX))   # 3 mm either side
    # One dent shows as a shadow lobe and a highlight lobe (and masks can split it more): group pieces within 4 mm.
    spot_mask = np.zeros_like(strong)
    for i in spots:
        x, y, w, h, area = stats[i]
        if area / PX ** 2 >= 0.3 and not near_line[int(cents[i][1]), int(cents[i][0])]:
            spot_mask[lab == i] = 1
    groups = cv2.dilate(spot_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(8 * PX), int(8 * PX))))
    gn, glab, gstats, _ = cv2.connectedComponentsWithStats(groups, 8)
    for g in range(1, gn):
        members = (glab == g) & (spot_mask > 0)
        area = int(members.sum())
        if not area:
            continue
        peak = float(np.abs(z[members]).max())
        ys, xs = np.nonzero(members)
        span = max(np.ptp(xs), np.ptp(ys)) / PX
        if DENT_MM2[0] <= area / PX ** 2 <= DENT_MM2[1] and peak >= Z_SPOT:
            cx, cy = xs.mean(), ys.mean()
            out.append({"kind": "dent or dimple", "where": where(cx, cy), "x": round(float(cx) / CW, 3), "y": round(float(cy) / CH, 3),
                        "size_mm": round(float(span), 1), "strength": round(peak, 1)})
    out = _resolve(out)
    out.sort(key=lambda f: -f["strength"])
    return out[:MAX_FINDINGS]


def _resolve(finds):
    """One defect, one finding: a short line within a dent's span is the dent's rim; a dent sitting on a crease
    (within 4 mm of its axis, inside its length + 6 mm) is the crease's end."""
    dents = [f for f in finds if f["kind"] == "dent or dimple"]
    creases = [f for f in finds if f["kind"] == "crease"]
    keep = []
    for f in finds:
        x, y = f["x"] * 63, f["y"] * 88
        if f["kind"] == "scratch or print line" and any(np.hypot(x - d["x"] * 63, y - d["y"] * 88) < d["size_mm"] / 2 + 5 for d in dents):
            continue
        if f["kind"] == "dent or dimple" and any(np.hypot(x - c["x"] * 63, y - c["y"] * 88) < c["size_mm"] / 2 + 6 and abs(x - c["x"] * 63) < 4 + c["size_mm"] for c in creases):
            continue
        keep.append(f)
    return keep


def overlay(raking, finds, width=420):
    """Small JPEG (data URL) of the straightened raking photo with each finding circled and numbered."""
    img = raking.copy()
    for i, f in enumerate(finds, 1):
        c = (int(f["x"] * CW), int(f["y"] * CH))
        r = int(max(4.0, f["size_mm"] / 2 + 2) * PX)
        cv2.circle(img, c, r, (32, 176, 255), 5)
        cv2.putText(img, str(i), (c[0] + r, c[1] - r), cv2.FONT_HERSHEY_SIMPLEX, 2.2, (32, 176, 255), 5)
    k = width / CW
    ok, buf = cv2.imencode(".jpg", cv2.resize(img, None, fx=k, fy=k, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 80])
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode() if ok else None


LIGHTS = ("left", "top", "right", "bottom")


def merge(per_light):
    """Findings from several light directions -> one list. Two findings are the same defect when their centres are
    within 4 mm (or half the larger one's size); the stronger one is kept and the lights that saw it are listed."""
    out = []
    for light, finds in per_light:
        for f in finds:
            x, y = f["x"] * 63, f["y"] * 88
            same = next((o for o in out if np.hypot(x - o["x"] * 63, y - o["y"] * 88) < max(4.0, max(f["size_mm"], o["size_mm"]) / 2)), None)
            if same is None:
                out.append({**f, "lights": [light]})
                continue
            if light not in same["lights"]:
                same["lights"].append(light)
            if f["strength"] > same["strength"] or (f["kind"] == "crease" and same["kind"] != "crease"):
                lights = same["lights"]
                same.clear(); same.update({**f, "lights": lights})
    out = _resolve(out)
    out.sort(key=lambda f: (-len(f["lights"]), -f["strength"]))
    return out[:MAX_FINDINGS]


def analyse_lights(flat_src, rakings, flat_hint=None):
    """rakings: [(light name, image src, hint)] - the same side lit from up to four directions. A fold running
    parallel to the light barely shades, so each direction catches what the others miss."""
    flat, e1 = straighten(flat_src, flat_hint)
    if flat is None:
        return {"status": "cant_judge", "why": f"straight-on photo: {e1}", "findings": [], "overlay": None, "lights": []}
    per, used, why, first = [], [], [], None
    for light, src, hint in rakings:
        rk, e2 = straighten(src, hint)
        if rk is None:
            why.append(f"{light} light: {e2}"); continue
        z, mask = anomaly_map(flat, rk)
        if z is None:
            why.append(f"{light} light: too much glare or black"); continue
        per.append((light, findings_from(z))); used.append(light)
        first = rk if first is None else first
    if not per:
        return {"status": "cant_judge", "why": "; ".join(why) or "no side-light photo", "findings": [], "overlay": None, "lights": []}
    finds = merge(per)
    return {"status": "measured", "why": "; ".join(why) or None, "findings": finds, "overlay": overlay(first, finds), "lights": used}


def straight_jpeg(src, width=900, hint=None):
    """The straightened card as JPEG bytes, for the AI second look."""
    card, _ = straighten(src, hint)
    if card is None:
        return None
    k = width / CW
    ok, buf = cv2.imencode(".jpg", cv2.resize(card, None, fx=k, fy=k, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
    return buf.tobytes() if ok else None


if __name__ == "__main__":
    import json, sys
    print(json.dumps({k: v for k, v in analyse_lights(sys.argv[1], [("raking", sys.argv[2], None)]).items() if k != "overlay"}, indent=1))
