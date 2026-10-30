"""Surface check (surface.py) on synthetic photos: a printed card on a dark mat, straight-on and under raking light."""
import cv2
import numpy as np
import surface as sf

rng = np.random.default_rng(3)
W, H = 1260, 1760            # card px in the synthetic photo (20 px/mm)


def design():
    """Busy print: colour blocks, lines and text-like marks, so the check must cancel the design."""
    img = np.full((H, W, 3), 235, np.uint8)
    for _ in range(60):
        x, y = rng.integers(0, W - 200), rng.integers(0, H - 200)
        cv2.rectangle(img, (int(x), int(y)), (int(x + rng.integers(40, 300)), int(y + rng.integers(40, 300))), [int(c) for c in rng.integers(20, 230, 3)], -1)
    for _ in range(40):
        cv2.line(img, tuple(int(v) for v in rng.integers(0, W, 2)), tuple(int(v) for v in rng.integers(0, H, 2)), [int(c) for c in rng.integers(0, 255, 3)], 3)
    for _ in range(30):
        cv2.putText(img, "TOPPS 10", (int(rng.integers(0, W - 300)), int(rng.integers(40, H))), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (20, 20, 20), 3)
    return img


def height(dent=None, crease=None):
    """Height map in px units. dent=(fx, fy); crease=(fx, fy0, fy1): vertical fold."""
    hm = np.zeros((H, W), np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if dent:
        cx, cy = dent[0] * W, dent[1] * H
        hm -= 6 * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * 60.0 ** 2))   # ~6 mm wide
    if crease:
        x0, y0, y1 = crease[0] * W, crease[1] * H, crease[2] * H
        taper = np.clip(np.minimum(yy - y0, y1 - yy) / 80.0, 0, 1)        # real folds fade out at the ends
        band = np.exp(-((xx - x0) ** 2) / (2 * 6.0 ** 2)) * taper
        hm += 3 * band.astype(np.float32)
    return hm


def place(card, angle=2.0):
    """Card on a dark mat with a small rotation, like a phone photo."""
    bg = np.full((2300, 1800, 3), 28, np.uint8)
    m = cv2.getRotationMatrix2D((W / 2, H / 2), angle, 1.0)
    m[:, 2] += [(1800 - W) / 2, (2300 - H) / 2]
    return cv2.warpAffine(card, m, (1800, 2300), borderValue=(28, 28, 28))


def raking(card, hm):
    """Light from the left, low angle: shading follows the height slope along x, plus a smooth falloff."""
    gx = cv2.Sobel(hm, cv2.CV_32F, 1, 0, ksize=5) / 32
    falloff = np.linspace(1.15, 0.8, W, dtype=np.float32)[None, :]
    shade = np.clip(falloff * (1 - 4.0 * gx), 0.3, 1.6)
    return np.clip(card.astype(np.float32) * shade[..., None], 0, 255).astype(np.uint8)


def enc(img):
    return cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tobytes()


CARD = design()


def run(hm, angle=2.0):
    return sf.analyse(enc(place(CARD, angle)), enc(place(raking(CARD, hm), angle + 0.4)))


def test_clean_card_has_no_findings():
    r = run(height())
    assert r["status"] == "measured", r
    assert r["findings"] == [], r["findings"]


def test_dent_found_where_it_is():
    r = run(height(dent=(0.75, 0.2)))
    dents = [f for f in r["findings"] if f["kind"] == "dent or dimple"]
    assert len(r["findings"]) == 1 and dents[0]["where"] == "top right", r["findings"]
    assert abs(dents[0]["x"] - 0.75) < 0.1 and abs(dents[0]["y"] - 0.2) < 0.1   # within ~6 mm: the circle covers it


def test_crease_found_as_a_line():
    r = run(height(crease=(0.3, 0.45, 0.85)))
    lines = [f for f in r["findings"] if f["kind"] == "crease"]
    assert len(r["findings"]) == 1 and lines[0]["size_mm"] > 20, r["findings"]
    assert r["overlay"].startswith("data:image/jpeg;base64,")


def test_dent_and_crease_together():
    r = run(height(dent=(0.6, 0.75), crease=(0.25, 0.1, 0.4)))
    kinds = sorted((f["kind"], f["where"]) for f in r["findings"])
    assert kinds == [("crease", "top left"), ("dent or dimple", "bottom centre")], r["findings"]


def test_no_card_is_cant_judge():
    blank = enc(np.full((800, 600, 3), 30, np.uint8))
    assert sf.analyse(blank, blank)["status"] == "cant_judge"


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)
