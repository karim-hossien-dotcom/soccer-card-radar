"""The Vercel function (apps/dashboard/api/condition.py): auth, upload limits, and the report it returns."""
import importlib.util, os, sys, uuid
import test_condition as t

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.path.join(HERE, "..", "..", "apps", "dashboard", "api")
spec = importlib.util.spec_from_file_location("api_condition", os.path.join(API, "condition.py"))
api = importlib.util.module_from_spec(spec); spec.loader.exec_module(api)
ENV = {"ADMIN_TOKEN": "s3cret"}


def form(**parts):
    b = "----WebKitFormBoundaryXyZ" + uuid.uuid4().hex[:12]  # mixed case, like a browser: the boundary is case-sensitive
    out = b""
    for name, data in parts.items():
        if isinstance(data, str):
            data = data.encode()
            out += f'--{b}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'.encode() + data + b"\r\n"
        else:
            out += f'--{b}\r\nContent-Disposition: form-data; name="{name}"; filename="{name}.png"\r\nContent-Type: image/png\r\n\r\n'.encode() + data + b"\r\n"
    return {"content-type": f"multipart/form-data; boundary={b}", "host": "cards.test", "origin": "https://cards.test"}, out + f"--{b}--\r\n".encode()


def png(**kw):
    return open(t.fake(**kw), "rb").read()


def test_vendored_copy_matches_tools():
    for f in ("condition.py", "centering.py", "surface.py", "borders.py"):
        assert open(os.path.join(HERE, f), "rb").read() == open(os.path.join(API, "_grade_screen", f), "rb").read(), f"run sync_vercel.py: {f} drifted"


def test_same_site_only():
    h, body = form(front=png())
    assert api.handle(h, body, env=ENV)[0] == 200
    assert api.handle({**h, "origin": "https://evil.example"}, body, env=ENV)[0] == 403
    assert api.handle({k: v for k, v in h.items() if k != "origin"}, body, env=ENV)[0] == 403
    assert api.handle({k: v for k, v in h.items() if k != "origin"} | {"referer": "https://cards.test/grading"}, body, env=ENV)[0] == 200


def test_site_lock_cookie():
    import importlib.util as iu, os as _os
    sp = iu.spec_from_file_location("sess", _os.path.join(API, "_grade_screen", "session.py")); se = iu.module_from_spec(sp); sp.loader.exec_module(se)
    h, body = form(front=png())
    locked = {**ENV, "AUTH_PASSWORD": "pw", "VERCEL_ENV": "production"}
    assert api.handle(h, body, env=locked)[0] == 401                                    # no cookie
    assert api.handle({**h, "cookie": "cr_session=karimhossien.1.x"}, body, env=locked)[0] == 401
    assert api.handle({**h, "cookie": f"cr_session={se.sign('pw')}"}, body, env=locked)[0] == 200
    assert api.handle({**h, "cookie": f"cr_session={se.sign('other')}"}, body, env=locked)[0] == 401
    assert api.handle(h, body, env={**ENV, "VERCEL_ENV": "production"})[0] == 401       # deployed, no password: closed
    assert se.verify(se.sign("pw", now=0), "pw", now=10) and not se.verify(se.sign("pw", now=0), "pw", now=31 * 24 * 3600)


def test_tiny_cropped_vault_photo_says_why():
    import cv2, numpy as np
    thumb = np.full((613, 440, 3), 200, np.uint8)  # like a saved Vault thumbnail, cropped at the card edge
    ok, b = cv2.imencode(".png", thumb)
    h, body = form(front=b.tobytes())
    st, r = api.handle(h, body, env=ENV)
    assert st == 200 and r["verdict"] == "cant_judge" and "cropped tight" in r["summary"] and "6.9 px per mm" in r["summary"], r["summary"]


def test_grade_by_url():
    site = {"content-type": "application/json", "host": "cards.test", "origin": "https://cards.test"}
    chip = png(chips=8)
    seen = []
    orig = api.fetch, api.ask_gate
    api.fetch = lambda url, cookie=None: (seen.append((url, cookie)), chip)[1]
    try:
        api.ask_gate = lambda key, img, mt: {"type": "raw", "straight_on": True, "all_edges_visible": True, "fills_frame": True}
        st, r = api.handle(site, b'{"imageUrl": "/cards/abc.webp"}', env={"ANTHROPIC_API_KEY": "k"})
        assert st == 200 and r["measured"] and r["verdict"] == "ceiling" and r["summary"].startswith("At best PSA 8"), r
        assert seen[-1] == ("https://cards.test/cards/abc.webp", None)
        # behind the site lock: the session cookie (only that one) goes with the Vault photo request
        api.handle({**site, "cookie": "other=1; cr_session=karimhossien.9.sig"}, b'{"imageUrl": "/cards/abc.webp"}', env={})
        assert seen[-1] == ("https://cards.test/cards/abc.webp", "cr_session=karimhossien.9.sig")
        api.handle({**site, "cookie": "cr_session=karimhossien.9.sig"}, b'{"imageUrl": "https://i.ebayimg.com/images/g/x/s-l225.jpg"}', env={})
        assert seen[-1][1] is None  # never sent to eBay
        api.ask_gate = lambda key, img, mt: {"type": "holder", "straight_on": True, "all_edges_visible": True, "fills_frame": True}
        st, r = api.handle(site, b'{"imageUrl": "https://i.ebayimg.com/images/g/x/s-l225.jpg"}', env={"ANTHROPIC_API_KEY": "k"})
        assert st == 200 and not r["measured"] and r["summary"] == "Can't judge: card is in a toploader or holder", r
        assert api.handle(site, b'{"imageUrl": "https://evil.example/x.jpg"}', env={})[0] == 400
        assert api.handle(site, b'{"imageUrl": "/cards/../etc/passwd"}', env={})[0] == 400
        st, r = api.handle(site, b'{"imageUrl": "/cards/abc.webp"}', env={})  # no key: measured without the gate
        assert st == 200 and r["gate"] is None and r["measured"]
    finally:
        api.fetch, api.ask_gate = orig


def test_limits_and_types():
    h, body = form(back=png())
    assert api.handle(h, body, env=ENV)[0] == 400                     # front required
    h, body = form(front=b"GIF89a" + b"0" * 100)
    assert api.handle(h, body, env=ENV)[0] == 415
    h, body = form(front=b"\xff\xd8\xff" + b"0" * (8 * 1024 * 1024))
    assert api.handle(h, body, env=ENV)[0] == 413
    assert api.handle({"content-type": "application/json", "host": "cards.test", "origin": "https://cards.test"}, b"{}", env=ENV)[0] == 400


def test_report_with_chips_and_back():
    h, body = form(front=png(chips=8), back=png())
    status, r = api.handle(h, body, env=ENV)
    assert status == 200, r
    assert r["ceiling"]["psa"] <= 8 and r["holder"] is False
    assert r["front"]["file"] is None and r["back"] is not None
    # this test card is drawn centred at ~16 px/mm: measured, and flagged as lower resolution (check the lines)
    assert r["centering"]["front_lr"] == "50/50" and r["front"]["borders"]["status"] == "ok"
    assert any(x["point"] == "centering (border lines)" and "lower resolution" in x["why"] for x in r["cant_judge"])


def test_measured_borders_four_sides():
    import cv2, test_borders as tb
    img, true = tb.photo(tb.card(24, left=2.5, right=3.5, top=3.0, bottom=4.0), 24)
    ok, jpg = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    q = [[float(x / img.shape[1]), float(y / img.shape[0])] for x, y in true]
    h, body = form(front=jpg.tobytes(), front_quad=api.json.dumps(q))
    status, r = api.handle(h, body, env=ENV)
    assert status == 200, r
    bo = r["front"]["borders"]
    assert bo["status"] == "ok" and bo["image"].startswith("data:image/jpeg;base64,"), bo["why"]
    assert r["centering"]["front_lr"] == "58/42" and r["centering"]["front_tb"] == "57/43", r["centering"]
    assert r["centering_grades"]["front_lr"]["psa"] == 9 and r["centering_grades"]["front_tb"]["psa"] == 9


def test_centering_only_mode():
    import cv2, test_borders as tb
    img, true = tb.photo(tb.card(24), 24, seed=3)
    ok, jpg = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    q = [[float(x / img.shape[1]), float(y / img.shape[0])] for x, y in true]
    h, body = form(front=jpg.tobytes(), front_quad=api.json.dumps(q), only="centering")
    status, r = api.handle(h, body, env=ENV)
    assert status == 200 and set(r) == {"borders"}, r
    assert r["borders"]["status"] == "ok" and abs(r["borders"]["centering"]["lr"]["mid"] - 3.5 / 6) < 0.01


def test_four_side_lights_catch_a_horizontal_crease():
    import test_surface as ts
    hm = ts.height(hcrease=(0.5, 0.2, 0.8))
    lit = {l: ts.enc(ts.place(ts.raking(ts.CARD, hm, l), 2.0 + 0.3 * i)) for i, l in enumerate(("left", "top", "right", "bottom"))}
    h, body = form(front=ts.enc(ts.place(ts.CARD)), front_raking=lit["left"], front_raking_top=lit["top"],
                   front_raking_right=lit["right"], front_raking_bottom=lit["bottom"])
    status, r = api.handle(h, body, env=ENV)
    assert status == 200, r
    sc = r["surface_scan"][0]
    assert sc["lights"] == ["left", "top", "right", "bottom"], sc
    creases = [f for f in sc["findings"] if f["kind"] == "crease"]
    assert len(creases) == 1 and {"top", "bottom"} <= set(creases[0]["lights"]), sc["findings"]
    assert any("crease" in x and "light" in x for x in r["ceiling"]["look"]), r["ceiling"]["look"]


def test_holder_flag_means_no_ceiling():
    h, body = form(front=png(chips=8), holder="1")
    status, r = api.handle(h, body, env=ENV)
    assert status == 200 and r["holder"] is True and r["ceiling"]["psa"] is None and r["front"]["edges"] == []


def test_wrong_outline_is_cant_judge_not_a_ceiling():
    """G9a: card on a black mat whose outline is 0.819 wide/tall: no PSA 8 from mat dust, summary says retake."""
    p, quad = t.mat_photo()
    h, body = form(front=open(p, "rb").read(), front_quad=api.json.dumps(quad))
    status, r = api.handle(h, body, env=ENV)
    assert status == 200 and r["ceiling"]["psa"] is None and r["front"]["edges"] == [], r["ceiling"]
    assert r["verdict"] == "cant_judge" and "outline isn't the card's edge" in r["summary"], r["summary"]
    assert any(x["point"] == "front edges, corners and stains" for x in r["cant_judge"])


def test_centering_grades_tolerances():
    g = api.centering_grades({"front_lr": 0.58, "back_lr": 0.85})
    assert g["front_lr"] == {"split": "58/42", "psa": 9, "psa_tolerance": "60/40", "bgs": 8, "bgs_tolerance": "60/40"}
    assert g["back_lr"]["psa"] == 9 and g["back_lr"]["psa_tolerance"] == "90/10" and g["back_lr"]["bgs"] == 7 and g["back_lr"]["bgs_tolerance"] is None


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)


def test_side_light_photo_adds_surface_look_flags():
    import test_surface as ts
    flat = ts.enc(ts.place(ts.CARD))
    dented = ts.enc(ts.place(ts.raking(ts.CARD, ts.height(dent=(0.6, 0.75))), 2.4))
    s0, plain = api.handle(*form(front=flat), env={})
    h, body = form(front=flat, front_raking=dented)
    s1, rep = api.handle(h, body, env={})
    assert s0 == s1 == 200, rep
    scan = rep["surface_scan"][0]
    assert scan["side"] == "Front" and scan["status"] == "measured" and scan["ai"] is False
    assert [(f["kind"], f["where"], f["source"]) for f in scan["findings"]] == [("dent or dimple", "bottom centre", "measured")]
    assert scan["overlay"].startswith("data:image/jpeg")
    assert any("dent or dimple, bottom centre" in l for l in rep["ceiling"]["look"])
    assert {k: rep["ceiling"][k] for k in ("psa", "bgs", "tag")} == {k: plain["ceiling"][k] for k in ("psa", "bgs", "tag")}  # never lowers


def test_claude_second_look_is_merged():
    import test_surface as ts
    flat = ts.enc(ts.place(ts.CARD))
    dented = ts.enc(ts.place(ts.raking(ts.CARD, ts.height(dent=(0.6, 0.75))), 2.4))
    orig = api.ask_surface
    api.ask_surface = lambda key, a, b: [{"kind": "dent", "where": "bottom right", "confidence": "clear"},
                                         {"kind": "scratch", "where": "top left", "confidence": "clear"},
                                         {"kind": "stain", "where": "centre", "confidence": "possible"}]
    try:
        h, body = form(front=flat, front_raking=dented)
        _, rep = api.handle(h, body, env={"ANTHROPIC_API_KEY": "k"})
    finally:
        api.ask_surface = orig
    got = [(f["kind"], f["where"], f["source"]) for f in rep["surface_scan"][0]["findings"]]
    assert got == [("dent or dimple", "bottom centre", "both"), ("scratch", "top left", "claude")], got


def test_phone_corners_rescue_a_cluttered_background():
    """A card on a busy table: the outline search gives up, the scanner's corners get it measured."""
    import json as _j, numpy as np, cv2, test_surface as ts
    rng = np.random.default_rng(1)
    bg = rng.integers(40, 200, (2300, 1800, 3), dtype=np.uint8)   # wood-grain-like clutter, nothing like a plain mat
    bg = cv2.GaussianBlur(bg, (0, 0), 3)
    card = ts.CARD.copy(); cv2.rectangle(card, (0, 0), (ts.W - 1, ts.H - 1), (250, 250, 250), 60)  # white border
    x0, y0 = (1800 - ts.W) // 2, (2300 - ts.H) // 2
    bg[y0:y0 + ts.H, x0:x0 + ts.W] = card
    img = cv2.imencode(".jpg", bg, [cv2.IMWRITE_JPEG_QUALITY, 92])[1].tobytes()
    _, plain = api.handle(*form(front=img), env={})
    assert plain["front"] is None, "expected the outline search to fail on clutter"
    quad = [[x0 / 1800, y0 / 2300], [(x0 + ts.W) / 1800, y0 / 2300], [(x0 + ts.W) / 1800, (y0 + ts.H) / 2300], [x0 / 1800, (y0 + ts.H) / 2300]]
    s, rep = api.handle(*form(front=img, front_quad=_j.dumps(quad)), env={})
    assert s == 200 and rep["front"] is not None and rep["front"]["px_per_mm"] > 15, rep.get("cant_judge")
    assert api.corner_hint("[[0,0],[1,0],[1,1]]") is None and api.corner_hint("nope") is None and api.corner_hint('[[0,0],[2,0],[1,1],[0,1]]') is None
