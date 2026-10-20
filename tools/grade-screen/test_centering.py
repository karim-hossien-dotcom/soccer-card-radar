"""Synthetic accuracy test: draw a symmetric card design shifted by a known amount, photograph it at an
angle on a cluttered background, and check the measured shift."""
import cv2, numpy as np, os, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from centering import assess, PX_PER_MM, W, H

rng = np.random.default_rng(7)


def card(shift_mm):
    c = np.full((H, W, 3), 235, np.uint8)
    cx = W // 2 + int(round(shift_mm * PX_PER_MM))
    b = int(3 * PX_PER_MM)  # 3 mm frame
    half = W // 2 - b
    cv2.rectangle(c, (cx - half, b), (cx + half, H - b), (40, 60, 160), -1)  # printed frame
    cv2.rectangle(c, (cx - half + 25, b + 25), (cx + half - 25, H - b - 120), (20, 20, 20), 3)
    for y in range(80, H - 200, 60):  # symmetric pattern
        cv2.circle(c, (cx - 150, y), 12, (200, 200, 60), -1)
        cv2.circle(c, (cx + 150, y), 12, (200, 200, 60), -1)
    cv2.ellipse(c, (cx + 30, 420), (110, 180), 10, 0, 360, (90, 140, 90), -1)  # asymmetric "player"
    cv2.putText(c, "PLAYER NAME", (cx - 170, H - 70), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (255, 255, 255), 3)
    return c


def photo(c, angle_px=60):
    bg = rng.integers(60, 140, (1400, 1100, 3), dtype=np.uint8)
    bg = cv2.GaussianBlur(bg, (31, 31), 0)
    src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    j = rng.uniform(-angle_px, angle_px, (4, 2)).astype(np.float32)
    dst = np.float32([[230, 220], [860, 240], [880, 1180], [210, 1160]]) + j
    m = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(c, m, (1100, 1400))
    mask = cv2.warpPerspective(np.ones((H, W), np.uint8), m, (1100, 1400)).astype(bool)
    bg[mask] = warped[mask]
    return bg


errs, results = [], []
with tempfile.TemporaryDirectory() as d:
    for i, s in enumerate([0, 0.3, -0.3, 0.6, -0.6, 1.0, -1.0, 1.5, -2.0, 0.15] * 2):
        p = os.path.join(d, f"{i}.png")
        cv2.imwrite(p, photo(card(s)))
        r = assess(p, 3.0)
        got = r.get("offset_mm")
        errs.append(None if got is None else abs(got - s))
        results.append((s, r["result"], got))
measured = [e for e in errs if e is not None]
print(f"measured {len(measured)}/{len(errs)}; mean abs error {np.mean(measured):.2f} mm; max {np.max(measured):.2f} mm")
for s, res, got in results:
    print(f"true {s:+.2f} mm -> {got} mm  {res}")
