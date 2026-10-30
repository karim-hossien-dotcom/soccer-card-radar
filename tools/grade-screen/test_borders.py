"""Synthetic tests for borders.py: cards drawn with known borders, photographed at an angle, with noise."""
import cv2
import numpy as np
import borders as bd

S = 2  # supersampling


def card(ppm, left=2.5, right=3.5, top=3.0, bottom=4.0, tilt_mm=0.0, frame_line=True, borderless=False):
    """Flat card at ppm*S px/mm: white border, coloured design, an inner thin frame line 1 mm inside the design edge."""
    R = ppm * S
    W, H = int(round(bd.CARD_W * R)), int(round(bd.CARD_H * R))
    img = np.full((H, W, 3), (235, 238, 240), np.uint8)
    if borderless:
        img[:] = (40, 90, 160)
    else:
        # design rectangle; tilt_mm shifts the left design edge by +tilt at the bottom vs the top
        pts = np.float32([[left, top], [bd.CARD_W - right, top], [bd.CARD_W - right, bd.CARD_H - bottom], [left + tilt_mm, bd.CARD_H - bottom]]) * R
        cv2.fillPoly(img, [np.round(pts * 16).astype(np.int32)], (60, 40, 170), shift=4)
        if frame_line:
            inner = np.float32([[left + 1, top + 1], [bd.CARD_W - right - 1, top + 1], [bd.CARD_W - right - 1, bd.CARD_H - bottom - 1], [left + 1 + tilt_mm, bd.CARD_H - bottom - 1]]) * R
            cv2.polylines(img, [np.round(inner * 16).astype(np.int32)], True, (220, 200, 40), max(1, int(0.3 * R)), cv2.LINE_AA, shift=4)
        rng = np.random.default_rng(1)  # art: random blobs inside the design
        for _ in range(60):
            c = (int(rng.uniform(left + 3, bd.CARD_W - right - 3) * R), int(rng.uniform(top + 3, bd.CARD_H - bottom - 3) * R))
            cv2.circle(img, c, int(rng.uniform(1, 5) * R), tuple(int(v) for v in rng.integers(0, 255, 3)), -1)
    return img


def photo(flat, ppm, angle=4.0, persp=0.03, noise=3.0, size=(2400, 3200), seed=0):
    """Place the card on a dark backdrop with rotation and perspective; return (photo, true corners)."""
    R = ppm * S
    Hc, Wc = flat.shape[:2]
    w, h = bd.CARD_W * ppm, bd.CARD_H * ppm
    cx, cy = size[0] / 2, size[1] / 2
    a = np.deg2rad(angle)
    rot = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    base = np.array([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]])
    base[0, 0] += persp * w; base[1, 0] -= persp * w  # top edge shorter: phone tilted
    dst = (base @ rot.T + [cx, cy]).astype(np.float32)
    src = np.float32([[0, 0], [Wc, 0], [Wc, Hc], [0, Hc]]) - 0.5  # pixel centres: the card's outer edge is half a pixel out
    big = (size[0] * S, size[1] * S)
    m = cv2.getPerspectiveTransform(src, dst * S - 0.5)
    bg = np.full((big[1], big[0], 3), 25, np.uint8)
    warped = cv2.warpPerspective(flat, m, big, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_TRANSPARENT, dst=bg)
    img = cv2.resize(warped, size, interpolation=cv2.INTER_AREA)
    img = cv2.GaussianBlur(img, (0, 0), 0.8)
    rng = np.random.default_rng(seed)
    img = np.clip(img + rng.normal(0, noise, img.shape), 0, 255).astype(np.uint8)
    return img, dst - 0.5  # true corners in pixel-centre coordinates of the downsampled photo


def rough(corners, err=6, seed=0):
    return corners + np.random.default_rng(seed).uniform(-err, err, corners.shape).astype(np.float32)


def test_known_borders():
    ppm = 24
    img, true = photo(card(ppm), ppm)
    out, flat = bd.measure(img, rough(true))
    assert out["status"] == "ok", out
    assert np.abs(np.array(out["outer"]["corners_px"]) - true).max() < 0.6, (out["outer"], true)
    got = {s: out["inner"][s]["depth_mm"] for s in bd.SIDES}
    want = {"left": 2.5, "right": 3.5, "top": 3.0, "bottom": 4.0}
    for s in bd.SIDES:
        assert abs(got[s] - want[s]) < 0.04, (s, got, out["alternates"])
    assert abs(out["centering"]["lr"]["mid"] - 3.5 / 6) < 0.005
    assert abs(out["centering"]["tb"]["mid"] - 4 / 7) < 0.005
    assert flat is not None and flat.shape[1] > 1500


def test_repeatable_across_shots():
    """Same card, 5 photos at different angles/noise: L/R split spread under 1 point."""
    ppm = 22
    flat = card(ppm, left=2.2, right=3.8)
    lr = []
    for k in range(5):
        img, true = photo(flat, ppm, angle=-6 + 3 * k, persp=0.01 * k, seed=k)
        out, _ = bd.measure(img, rough(true, seed=k))
        assert out["status"] == "ok", out
        lr.append(out["centering"]["lr"]["mid"])
    assert max(lr) - min(lr) < 0.01, lr


def test_no_side_bias_at_minimum_resolution():
    """At 20.5 px/mm, landscape 4K frame like a phone video still: every border within 0.04 mm, right/bottom included."""
    ppm = 20.5
    img, true = photo(card(ppm), ppm, angle=1.5, persp=0.0, size=(3840, 2160))
    out, _ = bd.measure(img, rough(true))
    want = {"left": 2.5, "right": 3.5, "top": 3.0, "bottom": 4.0}
    for s in bd.SIDES:
        assert abs(out["inner"][s]["depth_mm"] - want[s]) < 0.04, (s, out["inner"][s])


def test_tilted_print_worst_point():
    ppm = 24
    img, true = photo(card(ppm, left=3.0, right=3.0, tilt_mm=0.8), ppm)
    out, _ = bd.measure(img, rough(true))
    c = out["centering"]["lr"]
    # left edge runs 3.0 mm (top of the design) -> 3.8 mm (bottom); right stays 3.0
    at = lambda y: (3.0 + 0.8 * (y - 3.0) / (bd.CARD_H - 7.0))
    assert abs(c["mid"] - at(bd.CARD_H / 2) / (at(bd.CARD_H / 2) + 3)) < 0.008, c
    y = 0.95 * bd.CARD_H
    assert abs(c["worst"] - at(y) / (at(y) + 3)) < 0.008, c
    assert abs(out["inner"]["left"]["slope"]) > 0.005


def test_low_resolution_refused():
    ppm = 12
    img, true = photo(card(ppm), ppm, size=(1200, 1600))
    out, flat = bd.measure(img, rough(true, err=3))
    assert out["status"] == "refused" and flat is None and "px per mm" in out["why"][0]


def test_slab_outline_refused():
    """An outline the shape of a PSA slab (0.60 wide/tall) is not a card edge."""
    ppm = 24
    img, true = photo(card(ppm), ppm)
    c = true.mean(0)
    slab = c + (true - c) * [1.0, 1.0 * (0.714 / 0.60)]  # stretch vertically to slab proportions
    out, flat = bd.measure(img, slab.astype(np.float32))
    assert out["status"] == "refused" and flat is None and "slab" in out["why"][0], out


def test_borderless_needs_manual():
    ppm = 22
    img, true = photo(card(ppm, borderless=True), ppm)
    out, flat = bd.measure(img, rough(true))
    assert out["status"] == "needs_manual" and flat is not None, out
    assert out["outer"] is not None


if __name__ == "__main__":
    import time
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            t = time.time(); fn(); print("ok", name, f"{time.time() - t:.1f}s")
