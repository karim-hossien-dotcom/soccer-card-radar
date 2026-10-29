"""Synthetic checks for condition.py: real chips are found, printed patterns are not mistaken for chips."""
import os, tempfile
import cv2
import numpy as np
import condition as c

S = 16  # px per mm in the fake photo, like a typical eBay scan


def fake(chips=0, dots=False, line=False, corner_white=False, seed=1):
    rng = np.random.default_rng(seed)
    img = np.full((120 * S, 90 * S, 3), 6, np.uint8)             # black scanner bed
    x0, y0, w, h = 13 * S, 16 * S, 63 * S, 88 * S
    cv2.rectangle(img, (x0, y0), (x0 + w, y0 + h), (40, 30, 120), -1)           # dark red border
    cv2.rectangle(img, (x0 + 4 * S, y0 + 4 * S), (x0 + w - 4 * S, y0 + h - 4 * S), (200, 200, 205), -1)  # light centre
    cv2.circle(img, (x0 + w // 2, y0 + h // 2), 18 * S, (60, 120, 200), -1)    # symmetric "player"
    if dots:  # printed prism dots all over the border, including the very edge
        for _ in range(1500):
            x, y = rng.integers(x0, x0 + w), rng.integers(y0, y0 + 4 * S)
            cv2.circle(img, (int(x), int(y)), 2, (230, 230, 230), -1)
    if line:  # a light printed line running off the left edge
        cv2.line(img, (x0, y0 + 40 * S), (x0 + 4 * S, y0 + 40 * S), (235, 235, 235), 3)
    for i in range(chips):  # white chips: only at the cut edge
        y = y0 + 10 * S + i * (60 * S // max(chips, 1))
        cv2.rectangle(img, (x0, y), (x0 + 3, y + 3), (245, 245, 245), -1)
    if corner_white:
        cv2.rectangle(img, (x0, y0), (x0 + 6, y0 + 6), (245, 245, 245), -1)
    p = os.path.join(tempfile.mkdtemp(), "card.png")
    cv2.imwrite(p, img)
    return p


def specks(d, side="left"):
    return next(e["specks"] for e in d["front"]["edges"] if e["side"] == side)


def test_clean_card_has_no_chips():
    d = c.assess(fake())
    assert d["front"] is not None
    assert sum(e["specks"] or 0 for e in d["front"]["edges"]) == 0, d["front"]["edges"]


def test_chips_on_one_edge_are_found_and_cap_the_grade():
    d = c.assess(fake(chips=8))
    assert specks(d) >= 6
    assert d["ceiling"]["psa"] <= 8


def test_printed_dots_and_lines_are_not_chips():
    assert sum(e["specks"] or 0 for e in c.assess(fake(dots=True))["front"]["edges"]) <= 4
    assert specks(c.assess(fake(line=True))) == 0


def test_corner_whitening():
    d = c.assess(fake(corner_white=True))
    tl = next(x for x in d["front"]["corners"] if x["corner"] == "top-left")
    assert tl["whitening_pct"] > 3


def test_holder_and_unusable_photos_never_claim_a_grade():
    h = c.assess(fake(chips=8), holder=True)
    assert h["front"]["edges"] == [] and h["ceiling"]["psa"] is None
    blank = os.path.join(tempfile.mkdtemp(), "b.png"); cv2.imwrite(blank, np.zeros((400, 300, 3), np.uint8))
    assert c.assess(blank)["ceiling"]["psa"] is None


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)
