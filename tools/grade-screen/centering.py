"""D1 spike: left/right centering from a card photo. Reject filter only: never says a card is gradable.

Steps: find the card outline -> flatten to a 2.5x3.5 rectangle -> find how far the printed design is
shifted from the card's centre by matching the image against its own mirror (most soccer designs are
left/right symmetric) -> express it as a PSA-style L/R ratio given the set's nominal border width.
"""
import sys, json
import cv2
import numpy as np

W, H = 630, 880  # 10 px per mm on a 63 x 88 mm card
PX_PER_MM = W / 63.0


def find_card(img):
    """Largest card-shaped outline across several edge maps. None if not found (angled, cropped, cluttered).
    Largest wins: an inner printed frame is also card-shaped, and locking onto it would make every card look centred."""
    g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    k = np.ones((3, 3), np.uint8)
    maps = [cv2.dilate(cv2.Canny(g, lo, hi), k) for lo, hi in ((30, 100), (60, 180), (100, 250))]
    maps += [cv2.threshold(g, 0, 255, t + cv2.THRESH_OTSU)[1] for t in (cv2.THRESH_BINARY, cv2.THRESH_BINARY_INV)]
    area = img.shape[0] * img.shape[1]
    best, best_a = None, 0.0
    for m in maps:
        cnts, _ = cv2.findContours(m, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:15]:
            h = cv2.convexHull(c)
            a = cv2.contourArea(h)
            if a < 0.15 * area or a > 0.95 * area or a <= best_a:
                continue
            for eps in (0.02, 0.03, 0.05):
                q = cv2.approxPolyDP(h, eps * cv2.arcLength(h, True), True)
                if len(q) == 4:
                    (w, hh) = sorted(cv2.minAreaRect(q)[1])
                    if 0.45 < w / hh < 0.95:  # loose: perspective distorts the ratio
                        best, best_a = q.reshape(4, 2).astype(np.float32), a
                    break
    return best


def order(p):
    s, d = p.sum(1), np.diff(p, axis=1).ravel()
    return np.array([p[np.argmin(s)], p[np.argmin(d)], p[np.argmax(s)], p[np.argmax(d)]], np.float32)


def flatten(img, quad):
    m = cv2.getPerspectiveTransform(order(quad), np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
    return cv2.warpPerspective(img, m, (W, H))


def lr_offset_mm(card, max_mm=4.0):
    """Shift (mm) of the printed design's symmetry axis from the card centre; + means print sits right."""
    g = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY).astype(np.float32)
    e = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)) + np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))
    m = int(2 * PX_PER_MM)  # ignore the cut edge itself
    e = e[m:-m, :]
    # Only the outer frame bands: the centre (player photo, logos) is rarely symmetric.
    e[:, int(W * 0.3): int(W * 0.7)] = 0
    f = e[:, ::-1]
    best, best_s = -1.0, 0
    lim = int(max_mm * PX_PER_MM * 2)
    for s in range(-lim, lim + 1):  # mirror of a design centred at W/2+d lines up after shifting 2d
        a = e[:, max(s, 0) + m: W + min(s, 0) - m]
        b = f[:, max(-s, 0) + m: W + min(-s, 0) - m]
        c = float((a * b).sum() / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
        if c > best:
            best, best_s = c, s
    return best_s / 2 / PX_PER_MM, best


def assess(path, border_mm=3.0):
    img = cv2.imread(path)
    if img is None:
        return {"file": path, "result": "cant_measure", "why": "unreadable"}
    h, w = img.shape[:2]
    if abs(w / h - 63 / 88) < 0.025:
        # Already cropped to the cut edge (scans, tight eBay crops): use as-is. Detecting here would lock
        # onto an inner printed frame and make the card look centred.
        card = cv2.resize(img, (W, H))
    else:
        q = find_card(img)
        if q is None:
            return {"file": path, "result": "cant_measure", "why": "card outline not found"}
        card = flatten(img, q)
    d, conf = lr_offset_mm(card)
    left = (border_mm + d) / (2 * border_mm)
    left = min(max(left, 0.0), 1.0)
    worse = max(left, 1 - left)
    out = {"file": path, "offset_mm": round(d, 2), "lr": f"{round(left*100)}/{round((1-left)*100)}", "symmetry": round(conf, 3)}
    if conf < 0.35:
        out.update(result="cant_measure", why="design not symmetric enough")
    elif worse > 0.60:
        out.update(result="reject", why="L/R worse than 60/40")
    elif worse > 0.55:
        out.update(result="warn", why="L/R outside PSA 10 (55/45)")
    else:
        out.update(result="no_visible_issue")
    return out


if __name__ == "__main__":
    b = float(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].endswith((".jpg", ".png", ".webp", ".jpeg")) else 3.0
    for p in [a for a in sys.argv[1:] if a.lower().endswith((".jpg", ".png", ".webp", ".jpeg"))]:
        print(json.dumps(assess(p, b)))
