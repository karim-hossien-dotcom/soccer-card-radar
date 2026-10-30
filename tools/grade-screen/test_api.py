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
    for f in ("condition.py", "centering.py"):
        assert open(os.path.join(HERE, f), "rb").read() == open(os.path.join(API, "_grade_screen", f), "rb").read(), f"run sync_vercel.py: {f} drifted"


def test_same_site_only():
    h, body = form(front=png())
    assert api.handle(h, body, env=ENV)[0] == 200
    assert api.handle({**h, "origin": "https://evil.example"}, body, env=ENV)[0] == 403
    assert api.handle({k: v for k, v in h.items() if k != "origin"}, body, env=ENV)[0] == 403
    assert api.handle({k: v for k, v in h.items() if k != "origin"} | {"referer": "https://cards.test/grading"}, body, env=ENV)[0] == 200


def test_grade_by_url():
    site = {"content-type": "application/json", "host": "cards.test", "origin": "https://cards.test"}
    chip = png(chips=8)
    seen = []
    orig = api.fetch, api.ask_gate
    api.fetch = lambda url: (seen.append(url), chip)[1]
    try:
        api.ask_gate = lambda key, img, mt: {"type": "raw", "straight_on": True, "all_edges_visible": True, "fills_frame": True}
        st, r = api.handle(site, b'{"imageUrl": "/cards/abc.webp"}', env={"ANTHROPIC_API_KEY": "k"})
        assert st == 200 and r["measured"] and r["verdict"] == "ceiling" and r["summary"].startswith("At best PSA 8"), r
        assert seen[-1] == "https://cards.test/cards/abc.webp"
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
    cg = r["centering_grades"]["front_lr"]
    assert cg["split"] == r["centering"]["front_lr"] and cg["psa"] == 10 and cg["psa_tolerance"] == "55/45"
    assert any(x["point"] == "top/bottom centering" for x in r["cant_judge"])


def test_holder_flag_means_no_ceiling():
    h, body = form(front=png(chips=8), holder="1")
    status, r = api.handle(h, body, env=ENV)
    assert status == 200 and r["holder"] is True and r["ceiling"]["psa"] is None and r["front"]["edges"] == []


def test_centering_grades_tolerances():
    g = api.centering_grades({"front_lr": 0.58, "back_lr": 0.85})
    assert g["front_lr"] == {"split": "58/42", "psa": 9, "psa_tolerance": "60/40", "bgs": 8, "bgs_tolerance": "60/40"}
    assert g["back_lr"]["psa"] == 9 and g["back_lr"]["psa_tolerance"] == "90/10" and g["back_lr"]["bgs"] == 7 and g["back_lr"]["bgs_tolerance"] is None


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)
