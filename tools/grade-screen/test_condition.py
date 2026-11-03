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


def test_chips_on_one_edge_are_found_and_shown_as_a_look_flag():
    """G9c: chipping is measured and shown, but stays a look flag until calibrated (was: capped PSA 8)."""
    d = c.assess(fake(chips=8))
    assert specks(d) >= 6
    assert d["ceiling"]["psa"] == 10 and d["ceiling"]["why"] == [], d["ceiling"]
    assert any("chipping specks" in l and c.UNCALIBRATED in l for l in d["ceiling"]["look"]), d["ceiling"]["look"]
    assert d["ceiling"]["would_cap"]["edges_chipping"] == 8


def test_calibration_flag_on_lets_chipping_cap_again():
    """G9c: the gate is the only thing between a check and the ceiling: flip it on, the PSA 8 cap returns."""
    old = dict(c.CALIBRATED)
    try:
        c.CALIBRATED["edges_chipping"] = True
        d = c.assess(fake(chips=8))
    finally:
        c.CALIBRATED.clear(); c.CALIBRATED.update(old)
    assert d["ceiling"]["psa"] == 8 and d["ceiling"]["why"][0].startswith("front edges: chipping specks"), d["ceiling"]
    assert not any("chipping" in l for l in d["ceiling"]["look"])
    assert all(v is False for v in c.CALIBRATED.values()), "every calibration flag ships off"


def test_corner_whitening_is_look_only_until_calibrated():
    d = c.assess(fake(corner_white=True))
    assert d["ceiling"]["psa"] == 10 and any("whitening at 1 corner" in l for l in d["ceiling"]["look"]), d["ceiling"]


def test_printed_dots_and_lines_are_not_chips():
    assert sum(e["specks"] or 0 for e in c.assess(fake(dots=True))["front"]["edges"]) <= 4
    assert specks(c.assess(fake(line=True))) == 0


def test_corner_whitening():
    d = c.assess(fake(corner_white=True))
    tl = next(x for x in d["front"]["corners"] if x["corner"] == "top-left")
    assert tl["whitening_pct"] > 3


def card_on(img, x0, y0, border=(40, 30, 120), centre=(200, 200, 205), bw=4):
    cv2.rectangle(img, (x0, y0), (x0 + 63 * S, y0 + 88 * S), border, -1)
    cv2.rectangle(img, (x0 + bw * S, y0 + bw * S), (x0 + 63 * S - bw * S, y0 + 88 * S - bw * S), centre, -1)
    return img


def save(img, name="card.png"):
    p = os.path.join(tempfile.mkdtemp(), name)
    cv2.imwrite(p, img)
    return p


def sleeved(gap=True):
    """G9c: card in a sleeve on a black bed: a bright plastic rim 2 mm out from the card, and between rim and card the
    bed seen through the plastic (gap=False: a tight sleeve, a 2 mm plastic rim right against the card, with the
    specular streak plastic shows: a near-white highlight 0.5 mm in, falling off to grey either side. A flat 1 mm band
    is what white card stock looks like, so the review fix no longer counts it as plastic)."""
    img = np.full((120 * S, 90 * S, 3), 6, np.uint8)
    x0, y0, g = 13 * S, 16 * S, 2 * S
    if gap:
        cv2.rectangle(img, (x0 - g, y0 - g), (x0 + 63 * S + g, y0 + 88 * S + g), (222, 222, 222), -1)
        cv2.rectangle(img, (x0 - g + S, y0 - g + S), (x0 + 63 * S + g - S, y0 + 88 * S + g - S), (18, 18, 18), -1)
    else:
        for i in range(g):  # concentric 1 px rings, outside in: grey -> highlight at 0.5 mm -> grey at the card
            v = int(255 - 65 * abs(i - S // 2) / (g - S // 2))
            cv2.rectangle(img, (x0 - g + i, y0 - g + i), (x0 + 63 * S + g - i, y0 + 88 * S + g - i), (v, v, v), 1)
    return save(card_on(img, x0, y0), "sleeve.png")


def white_bordered(bw=3, white=(240, 240, 240)):
    img = np.full((120 * S, 90 * S, 3), 6, np.uint8)
    return save(card_on(img, 13 * S, 16 * S, border=white, centre=(40, 30, 120), bw=bw), "white.png")


def blended_bottom():
    """G9c: the bed below the card is the colour of the card's border, so the bottom cut edge cannot be traced.
    White specks sit along the bottom and left edges; the phone scanner's corners are given."""
    img = np.full((120 * S, 90 * S, 3), 6, np.uint8)
    x0, y0, w, h = 13 * S, 16 * S, 63 * S, 88 * S
    img[y0 + h:, :] = (40, 30, 120)
    card_on(img, x0, y0)
    for i in range(8):
        y = y0 + 10 * S + i * (60 * S // 8)
        cv2.rectangle(img, (x0, y), (x0 + 3, y + 3), (245, 245, 245), -1)
    for i in range(6):
        x = x0 + 10 * S + i * 8 * S
        cv2.rectangle(img, (x, y0 + h - 4), (x + 3, y0 + h), (245, 245, 245), -1)
    H, W = img.shape[:2]
    quad = [[x0 / W, y0 / H], [(x0 + w) / W, y0 / H], [(x0 + w) / W, (y0 + h) / H], [x0 / W, (y0 + h) / H]]
    return save(img, "blend.png"), quad


def test_sleeved_card_takes_the_holder_path():
    for gap in (True, False):
        d = c.assess(sleeved(gap))
        assert d["holder"] is True, (gap, d["front"])
        assert d["front"]["edges"] == [] and d["front"]["corners"] == [] and d["front"]["surface"] == {}
        assert d["ceiling"]["psa"] is None and d["ceiling"]["bgs"] is None and d["ceiling"]["tag"] is None, d["ceiling"]
        assert d["centering"] == {}, d["centering"]  # the outline is the plastic: no centering from it
        cj = next(x for x in d["cant_judge"] if x["point"] == "front: sleeve or holder")
        assert cj["why"].startswith(c.HOLDER_RETAKE), cj
    d = c.assess(fake(), sleeved())  # sleeve on the back only: same path
    assert d["holder"] is True and d["ceiling"]["psa"] is None and d["front"]["edges"] == []


def test_white_bordered_card_is_not_a_holder():
    for p in (white_bordered(), white_bordered(bw=2), white_bordered(white=(255, 255, 255)), fake()):
        d = c.assess(p)
        assert d["holder"] is False and d["front"].get("holder") is None, d["front"].get("holder")
        assert len(d["front"]["edges"]) == 4 and d["ceiling"]["psa"] is not None


def test_side_without_a_cut_edge_is_not_judged():
    p, quad = blended_bottom()
    d = c.assess(p, hints={"front": quad})
    f = d["front"]
    assert f["edges_missing"] == ["bottom"], f["borders"]["why"]
    assert sorted(e["side"] for e in f["edges"]) == ["left", "right", "top"], f["edges"]
    assert sorted(x["corner"] for x in f["corners"]) == ["top-left", "top-right"], f["corners"]
    assert specks(d, "left") >= 6  # the other sides are still measured
    lines = d["ceiling"]["why"] + d["ceiling"]["look"]
    assert not any("bottom" in l for l in lines), lines
    assert sum(int(l.split(", ")[-1].split(" total")[0]) for l in lines if "total" in l) == specks(d, "left"), lines  # no bottom specks counted
    cj = next(x for x in d["cant_judge"] if x["point"] == "front bottom edge and its corners")
    assert cj["why"] == c.EDGE_RETAKE


def hotspot(img, cx, cy, r, halo=1.8):
    """G9c: a flash hotspot: blown-out core with a warm halo fading out over 0.8 r (the halo is what read as 'stains' and
    'dents' on the 2026-11-02 Ronaldo scan)."""
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot(xx - cx, yy - cy) / r
    k = np.clip((halo - d) / (halo - 1), 0, 1)[..., None]
    out = img.astype(np.float32) * (1 - k) + np.float32([175, 238, 250]) * k
    out[d <= 1] = 255
    return np.clip(out, 0, 255).astype(np.uint8)


def glare_card(r_mm, stain=False):
    """fake() layout with a hotspot of radius r_mm on the plain light centre; stain=True adds a real 3 mm stain elsewhere."""
    img = card_on(np.full((120 * S, 90 * S, 3), 6, np.uint8), 13 * S, 16 * S)
    if stain:
        cv2.circle(img, (int(28 * S), int(85 * S)), int(1.5 * S), (150, 200, 215), -1)
    return save(hotspot(img, 53 * S, 46 * S, r_mm * S), "glare.png")


def test_hotspot_on_a_plain_area_is_not_a_stain():
    d = c.assess(glare_card(3))
    s = d["front"]["surface"]
    assert s["stain_spots"] == 0 and 0 < s["glare_pct"] <= 100 * c.GLARE_MAX_SHARE, s
    assert not any("stain" in l for l in d["ceiling"]["look"]), d["ceiling"]["look"]
    assert c.assess(glare_card(3, stain=True))["front"]["surface"]["stain_spots"] == 1  # a real stain away from it still counts


def test_big_hotspot_makes_the_surface_cant_judge():
    d = c.assess(glare_card(6))
    s = d["front"]["surface"]
    assert s["glare_pct"] > 100 * c.GLARE_MAX_SHARE and s["stain_spots"] is None and s["print_spots"] is None, s
    cj = next(x for x in d["cant_judge"] if x["point"] == "front surface (stains, print spots, registration)")
    assert cj["why"] == f"glare covers {round(s['glare_pct'])}% of the card: retake with the light at an angle", cj
    assert not any("stain" in l for l in d["ceiling"]["look"])


def crop_size(url):
    import base64
    assert url.startswith("data:image/jpeg;base64,"), url[:40]
    im = cv2.imdecode(np.frombuffer(base64.b64decode(url.split(",", 1)[1]), np.uint8), cv2.IMREAD_COLOR)
    return im.shape[1], im.shape[0]


def test_every_flag_carries_side_bbox_and_a_crop():
    """G9c: each look / why line (centering excepted) has side, bbox on the straightened card and a zoomed crop."""
    d = c.assess(fake(chips=8, corner_white=True), glare_card(3, stain=True))
    ceil = d["ceiling"]
    assert len(ceil["look_evidence"]) == len(ceil["look"]) >= 3 and len(ceil["why_evidence"]) == len(ceil["why"]), ceil
    by = dict(zip(ceil["look"], ceil["look_evidence"]))
    chip = next(e for l, e in by.items() if "chipping" in l)
    x, y, w, h = chip["bbox"]
    assert chip["side"] == "front" and chip["px_per_mm"] == c.PX and abs(x + w / 2 - c.MARGIN) < 3 and h > w, chip["bbox"]  # on the left cut edge
    corner = next(e for l, e in by.items() if "whitening" in l)
    assert corner["bbox"][:2] == [c.MARGIN - c.PX, c.MARGIN - c.PX]  # top-left
    stain = next(e for l, e in by.items() if "stain" in l)
    assert stain["side"] == "back", stain
    for e in (chip, corner, stain):
        assert max(crop_size(e["crop"])) == c.CROP_PX
    old = dict(c.CALIBRATED)
    try:
        c.CALIBRATED["edges_chipping"] = True
        d = c.assess(fake(chips=8))
    finally:
        c.CALIBRATED.clear(); c.CALIBRATED.update(old)
    assert d["ceiling"]["why_evidence"][0]["crop"].startswith("data:image/jpeg"), d["ceiling"]["why_evidence"]
    assert "_card" not in d["front"]  # the straightened card is not sent back


def mat_photo():
    """G9a: card on a black mat (0.819 wide/tall) with light dust near the mat's edge, on a light table. The mat is the
    outline found (and the one a phone hint can give); before the fix its dust read as chipping and capped PSA 8."""
    rng = np.random.default_rng(3)
    img = np.full((130 * S, 100 * S, 3), 175, np.uint8)
    mh = 98; mw = 0.819 * mh
    mx0, my0 = (100 - mw) / 2, (130 - mh) / 2
    cv2.rectangle(img, (int(mx0 * S), int(my0 * S)), (int((mx0 + mw) * S), int((my0 + mh) * S)), (12, 12, 12), -1)
    for _ in range(400):
        side, t, d = rng.integers(4), rng.uniform(0, 1), rng.uniform(0.2, 0.7)
        x, y = ((mx0 + d, my0 + t * mh), (mx0 + mw - d, my0 + t * mh), (mx0 + t * mw, my0 + d), (mx0 + t * mw, my0 + mh - d))[side]
        cv2.circle(img, (int(x * S), int(y * S)), 2, (235, 235, 235), -1)
    x0, y0, w, h = int(18.5 * S), int(21 * S), 63 * S, 88 * S
    cv2.rectangle(img, (x0, y0), (x0 + w, y0 + h), (40, 30, 120), -1)
    cv2.rectangle(img, (x0 + 4 * S, y0 + 4 * S), (x0 + w - 4 * S, y0 + h - 4 * S), (200, 200, 205), -1)
    p = os.path.join(tempfile.mkdtemp(), "mat.png")
    cv2.imwrite(p, img)
    quad = [[mx0 / 100, my0 / 130], [(mx0 + mw) / 100, my0 / 130], [(mx0 + mw) / 100, (my0 + mh) / 130], [mx0 / 100, (my0 + mh) / 130]]
    return p, quad


def test_wrong_outline_measures_no_edges_and_sets_no_ceiling():
    p, quad = mat_photo()
    for hints in (None, {"front": quad}):  # outline found in the photo, or sent by the phone scanner
        d = c.assess(p, hints=hints)
        f = d["front"]
        assert "0.819 wide/tall" in f["borders"]["why"][0], f["borders"]
        assert f["edges"] == [] and f["corners"] == [] and f["surface"] == {}, f
        assert d["ceiling"]["psa"] is None and not any("edges" in w or "corner" in w for w in d["ceiling"]["why"]), d["ceiling"]
        cj = next(x for x in d["cant_judge"] if x["point"] == "front edges, corners and stains")
        assert cj["why"].startswith("outline isn't the card's edge: retake on a plain contrasting background with all four edges visible"), cj


def test_wrong_back_outline_cannot_lower_the_ceiling():
    p, _ = mat_photo()
    d = c.assess(fake(), p)
    assert d["back"]["edges"] == [] and d["back"]["corners"] == []
    assert d["ceiling"]["psa"] == 10 and not any(w.startswith("back") for w in d["ceiling"]["why"]), d["ceiling"]
    assert any(x["point"] == "back edges, corners and stains" for x in d["cant_judge"])


def test_holder_and_unusable_photos_never_claim_a_grade():
    h = c.assess(fake(chips=8), holder=True)
    assert h["front"]["edges"] == [] and h["ceiling"]["psa"] is None
    blank = os.path.join(tempfile.mkdtemp(), "b.png"); cv2.imwrite(blank, np.zeros((400, 300, 3), np.uint8))
    assert c.assess(blank)["ceiling"]["psa"] is None


# G9c review: holder false positives. Fixtures follow the reviewer's probe (bed 6, the phone scanner's corners).
def scan_quad(off_mm=0.0, x0=13 * S, y0=16 * S, W=90 * S, H=120 * S):
    """The phone scanner's corners (fractions of the photo), off_mm outside the cut edge (negative: inside)."""
    o = off_mm * S
    return [[(x0 - o) / W, (y0 - o) / H], [(x0 + 63 * S + o) / W, (y0 - o) / H],
            [(x0 + 63 * S + o) / W, (y0 + 88 * S + o) / H], [(x0 - o) / W, (y0 + 88 * S + o) / H]]


def bed(v=6, noise=0):
    img = np.full((120 * S, 90 * S, 3), v, np.uint8)
    if noise:
        img = np.clip(img + np.random.default_rng(0).normal(0, noise, img.shape), 0, 255).astype(np.uint8)
    return img


def measured_not_holder(d, label, centering=False):
    f = d["front"]
    assert d["holder"] is False and f.get("holder") is None, (label, f.get("holder"))
    assert not any("sleeve or holder" in x["point"] for x in d["cant_judge"]), label
    assert len(f["edges"]) == 4 - len(f.get("edges_missing") or []), (label, f["edges"])
    if centering:  # centering still works where it did before G9c
        assert d["centering"], (label, f["borders"]["why"])


def test_black_border_on_black_backdrop_is_not_a_holder():
    """Review item 1: a dark printed border on the dark bed looks like bed seen through a sleeve. Without a plastic
    edge at the outline that is a contrast problem: measured, plus a retake on a lighter backdrop (never 'take it out')."""
    cases = [(bed(), b) for b in (12, 20, 30)] + [(bed(6, 4), 18)]
    for img, b in cases:
        p = save(card_on(img, 13 * S, 16 * S, border=(b, b, b), centre=(60, 120, 200)), "black.png")
        for hint in (None, scan_quad()):
            d = c.assess(p, hints={"front": hint} if hint else None)
            measured_not_holder(d, (b, hint is not None))  # border 12-18 on bed 6: the cut edge itself is not found
            if hint is None:
                continue  # no corners: the tracer finds the art panel, not the card (pre-existing, not a sleeve question)
            cj = [x for x in d["cant_judge"] if x["point"] == "front: sleeve check"]
            assert cj and cj[0]["why"] == c.LOW_CONTRAST_RETAKE, (b, d["cant_judge"][-3:])
    assert "lighter" in c.LOW_CONTRAST_RETAKE and "take it out" not in c.LOW_CONTRAST_RETAKE


def test_loose_outline_is_not_a_holder():
    """Review item 2: the scanner's corners up to LOOSE_OUTLINE_MM outside the cut edge (backdrop between) are a loose
    outline, not a sleeve; no low-contrast retake either. Any card, white-bordered included."""
    assert c.LOOSE_OUTLINE_MM >= 1.5
    plain = save(card_on(bed(), 13 * S, 16 * S), "plain.png")
    white = save(card_on(bed(), 13 * S, 16 * S, border=(240, 240, 240), centre=(40, 30, 120), bw=3), "white.png")
    for p in (plain, white):
        for off in (0.5, 1.0, 1.5, -0.5):
            d = c.assess(p, hints={"front": scan_quad(off)})
            measured_not_holder(d, (p, off), centering=off <= 1.0)  # 1.5 mm is past the cut-edge refit window (1.2 mm)
            assert not any(x["point"] == "front: sleeve check" for x in d["cant_judge"]), (p, off)


def test_thin_white_edge_on_a_dark_card_is_not_a_holder():
    """Review item 3: white stock or edge wear 0.3-1.0 mm wide around a dark full-bleed card is the wear the edge
    check exists to find, not a plastic rim (a rim must be wider than RIM_MIN_MM and show a specular streak)."""
    assert c.RIM_MIN_MM > 1.0
    for t in (0.3, 0.6, 1.0):
        img = bed()
        x0, y0, w, h, k = 13 * S, 16 * S, 63 * S, 88 * S, int(t * S)
        cv2.rectangle(img, (x0, y0), (x0 + w, y0 + h), (235, 235, 235), -1)
        cv2.rectangle(img, (x0 + k, y0 + k), (x0 + w - k, y0 + h - k), (30, 25, 90), -1)
        p = save(img, "thin.png")
        for hint in (None, scan_quad()):
            d = c.assess(p, hints={"front": hint} if hint else None)
            measured_not_holder(d, (t, hint is not None))


def test_sleeved_card_with_the_scanner_corners_on_the_sleeve_is_a_holder():
    """The phone path: corners on the sleeve's outline, 2 mm outside the card."""
    for gap in (True, False):
        d = c.assess(sleeved(gap), hints={"front": scan_quad(2.0)})
        assert d["holder"] is True and d["ceiling"]["psa"] is None, (gap, d["front"].get("holder"), d["front"]["borders"]["why"])


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)
