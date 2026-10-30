"""POST /api/condition: run the D3 photo condition check (tools/grade-screen/condition.py) on uploaded photos.

Vercel Python function next to the Next.js app. Reject filter only: it can lower the grade ceiling, it never
promises a grade. Open to the app's own pages (same-site Origin check); no login. Also grades a photo by URL
(JSON {"imageUrl"}): an eBay listing photo or a Vault photo, screened by the photo gate first when ANTHROPIC_API_KEY is set.

Body: multipart/form-data with `front` (required), `back` (optional) image files (jpg, png or webp, 8 MB each)
and `holder` ("1" when the card is in a sleeve, toploader, magnetic case or slab). Optional `front_raking` /
`back_raking`: the same side under low side light, for the surface check (dents, creases, scratches): look flags
only, they never lower the ceiling. Optional `front_quad` / `back_quad` / `*_raking_quad`: the card's corners as found
by the phone scanner, JSON [[x, y] x 4] in fractions of the photo; used instead of searching for the outline.
The vendored copy of the check lives in api/_grade_screen (kept identical by tools/grade-screen/sync_vercel.py).
"""
import http.cookies, json, os, sys, urllib.parse
from email.parser import BytesParser
from email.policy import HTTP
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_grade_screen"))
import condition as cond  # noqa: E402
import surface as surf  # noqa: E402
from session import COOKIE, logged_in  # noqa: E402
from gate import ask_gate, ask_surface, combine_surface, fetch, media_type, summarize, usable  # noqa: E402

MAX_IMAGE = 8 * 1024 * 1024
MAX_BODY = 4 * MAX_IMAGE + 64 * 1024


def image_kind(b):
    if b[:3] == b"\xff\xd8\xff": return "jpg"
    if b[:8] == b"\x89PNG\r\n\x1a\n": return "png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP": return "webp"
    return None


def split(worse):
    return f"{round(worse * 100)}/{round((1 - worse) * 100)}"


def centering_grades(cent):
    """Per side: the split, and the best PSA / BGS grade whose written tolerance it meets (plus that tolerance)."""
    out = {}
    for key, worse in cent.items():
        back = key.startswith("back")
        p, b = cond.centering_grades(worse, back=back)
        psa_lim = next((f if not back else bk for g, f, bk in cond.PSA_CENT if g == p), None)
        bgs_lim = next((f if not back else bk for g, f, bk in cond.BGS_CENT if g == b), None)
        out[key] = {"split": split(worse), "psa": p, "psa_tolerance": split(psa_lim) if psa_lim else None,
                    "bgs": b, "bgs_tolerance": split(bgs_lim) if bgs_lim else None}
    return out


def parse_form(content_type, body):
    """multipart/form-data -> {name: bytes}. Returns None when the body is not multipart."""
    if not content_type.lower().startswith("multipart/form-data"):
        return None
    msg = BytesParser(policy=HTTP).parsebytes(b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + body)
    if not msg.is_multipart():
        return None
    fields = {}
    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if name:
            fields[name] = part.get_payload(decode=True) or b""
    return fields


ALLOWED_IMAGE_HOSTS = ("i.ebayimg.com",)


def same_site(headers):
    """No login on this site, so the check is open to the app's own pages only: the browser's Origin (or Referer)
    must be this host. Stops other sites and casual scripts from running it; not a substitute for a login."""
    host = (headers.get("x-forwarded-host") or headers.get("host") or "").lower()
    src = headers.get("origin") or headers.get("referer") or ""
    try:
        return bool(host) and urllib.parse.urlparse(src).netloc.lower() == host
    except ValueError:
        return False


def image_from_url(url, host, cookie=None):
    """Fetch a photo by URL: an eBay listing photo, or one of the app's own Vault photos (/cards/...).
    Vault photos are behind the site lock, so the caller's session cookie goes with that request (same host only)."""
    u = urllib.parse.urlparse(url)
    if u.scheme == "" and u.path.startswith("/cards/") and ".." not in u.path:
        jar = http.cookies.SimpleCookie()
        try:
            jar.load(cookie or "")
        except http.cookies.CookieError:
            pass
        own = f"{COOKIE}={jar[COOKIE].value}" if COOKIE in jar else None
        return fetch(f"https://{host}{u.path}", cookie=own)
    if u.scheme == "https" and u.netloc.lower() in ALLOWED_IMAGE_HOSTS:
        return fetch(url)
    raise ValueError("Only eBay listing photos and Vault photos can be graded by URL")


def handle(headers, body, env=os.environ):
    """Pure request -> (status, json dict). headers: case-insensitive mapping (or plain dict with lowercase keys)."""
    if not same_site(headers):
        return 403, {"error": "Run the check from the Card Radar site"}
    if not logged_in(headers, env):
        return 401, {"error": "Log in first"}
    if len(body) > MAX_BODY:
        return 413, {"error": "Photos too large: 8 MB each at most"}
    ctype = headers.get("content-type") or ""  # keep case: the multipart boundary is case-sensitive
    gate = None
    if ctype.lower().startswith("application/json"):
        try:
            req = json.loads(body or b"{}")
            url = str(req.get("imageUrl") or "")
            front = image_from_url(url, headers.get("x-forwarded-host") or headers.get("host"), headers.get("cookie"))
        except ValueError as e:
            return 400, {"error": str(e)}
        except Exception as e:
            return 502, {"error": f"Could not download the photo: {type(e).__name__}"}
        back, holder = b"", False
        raking = {"front": b"", "back": b""}
        extra_lights = {}
        hints = {}
        if not media_type(front):
            return 415, {"error": "That photo is not a jpg, png or webp"}
        key = env.get("ANTHROPIC_API_KEY")
        if key:
            try:
                gate = ask_gate(key, front, media_type(front))
            except Exception as e:
                return 502, {"error": f"Photo screen failed: {type(e).__name__}"}
    else:
        fields = parse_form(ctype, body)
        if fields is None:
            return 400, {"error": "Send the photos as multipart/form-data"}
        front, back = fields.get("front") or b"", fields.get("back") or b""
        raking = {s: fields.get(f"{s}_raking") or b"" for s in ("front", "back")}  # light from the left (or the only one)
        extra_lights = {(s, l): fields.get(f"{s}_raking_{l}") or b"" for s in ("front", "back") for l in ("top", "right", "bottom")}
        hints = {k: corner_hint(fields.get(f"{k}_quad")) for k in ("front", "back", "front_raking", "back_raking")}
        hints.update({f"{s}_raking_{l}": corner_hint(fields.get(f"{s}_raking_{l}_quad")) for (s, l) in extra_lights})
        if not front:
            return 400, {"error": "Add a front photo"}
        if (fields.get("only") or b"").strip() == b"centering":  # repeatability shot: borders only
            if len(front) > MAX_IMAGE or image_kind(front) is None:
                return 415, {"error": "Front photo must be a jpg, png or webp under 8 MB"}
            try:
                return 200, {"borders": cond.centering_only(front, hints.get("front"))}
            except Exception as e:
                return 422, {"error": f"Could not analyse the photo: {type(e).__name__}"}
        for label, data in (("Front", front), ("Back", back), ("Front side-light", raking["front"]), ("Back side-light", raking["back"]),
                            *((f"{s.capitalize()} {l} light", d) for (s, l), d in extra_lights.items())):
            if not data:
                continue
            if len(data) > MAX_IMAGE:
                return 413, {"error": f"{label} photo is over 8 MB"}
            if image_kind(data) is None:
                return 415, {"error": f"{label} photo must be a jpg, png or webp"}
        holder = (fields.get("holder") or b"").strip().lower() in (b"1", b"true", b"on", b"yes")
    if gate is not None and not usable(gate):
        verdict, summary = summarize(gate, None)
        return 200, {"gate": gate, "verdict": verdict, "summary": summary, "measured": False}
    try:
        straight = {}
        report, cent = cond.assess_with_centering(front, back or None, holder=holder, hints=hints, straight=straight)
    except Exception as e:  # a corrupt image that decodes partway, etc.
        return 422, {"error": f"Could not analyse the photo: {type(e).__name__}"}
    report["centering_grades"] = centering_grades(cent)
    for side in ("front", "back"):  # straightened card for the confirm-the-lines screen
        rep, img = report.get(side), straight.get(side, {}).get("img")
        if rep and img is not None:
            rep["borders"]["image"] = jpeg_data_url(img)
    report["holder"] = holder
    report["gate"] = gate
    report["verdict"], report["summary"] = summarize(gate, report)
    report["measured"] = True
    if not holder and (raking["front"] or raking["back"] or any(extra_lights.values())):
        report["surface_scan"] = surface_scan(front, back, raking, env.get("ANTHROPIC_API_KEY"), hints, extra_lights)
        for s in report["surface_scan"]:
            for f in s["findings"]:
                src = {"both": "measured and seen by Claude", "measured": "measured", "claude": "seen by Claude"}[f["source"]]
                lit = f" under {', '.join(f['lights'])} light" if f.get("lights") else ""
                report["ceiling"]["look"].append(f"{s['side']}: {f['kind']}, {f['where']} ({src}{lit})")
    return 200, report


def jpeg_data_url(img, quality=88):
    import base64, cv2
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode() if ok else None


def corner_hint(raw):
    """`front_quad` etc.: JSON [[x, y] x 4], fractions of the photo, from the phone scanner. None if absent or malformed."""
    if not raw:
        return None
    try:
        q = json.loads(raw)
        return q if isinstance(q, list) and len(q) == 4 and all(isinstance(p, list) and len(p) == 2 and all(0 <= float(v) <= 1 for v in p) for p in q) else None
    except (ValueError, TypeError):
        return None


def surface_scan(front, back, raking, key, hints=None, extra_lights=None):
    """Per side with side-light photos (up to 4 directions): measured findings (surface.py), Claude's second look on
    the first lit photo when a key is set, merged."""
    out, hints, extra_lights = [], hints or {}, extra_lights or {}
    for side, flat in (("front", front), ("back", back)):
        lights = [(l, src, hints.get(k)) for l, src, k in (("left", raking.get(side), f"{side}_raking"),
                  *((l, extra_lights.get((side, l)), f"{side}_raking_{l}") for l in ("top", "right", "bottom"))) if src]
        if not lights or not flat:
            continue
        try:
            res = surf.analyse_lights(flat, lights, hints.get(side))
        except Exception as e:
            res = {"status": "cant_judge", "why": f"surface check failed: {type(e).__name__}", "findings": [], "overlay": None, "lights": []}
        rk, rk_hint = lights[0][1], lights[0][2]
        ai, ai_err = [], None
        if key and res["status"] == "measured":
            try:
                ai = ask_surface(key, surf.straight_jpeg(flat, hint=hints.get(side)), surf.straight_jpeg(rk, hint=rk_hint))
            except Exception as e:
                ai_err = f"Claude second look failed: {type(e).__name__}"
        out.append({"side": side.capitalize(), "status": res["status"], "why": res.get("why") or ai_err,
                    "findings": combine_surface(res["findings"], ai) if res["status"] == "measured" else [],
                    "overlay": res.get("overlay"), "lights": res.get("lights", []), "ai": bool(key) and ai_err is None and res["status"] == "measured"})
    return out


class handler(BaseHTTPRequestHandler):
    def _send(self, status, data):
        out = json.dumps(data, default=float).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def do_POST(self):
        n = int(self.headers.get("content-length") or 0)
        if n > MAX_BODY:
            return self._send(413, {"error": "Photos too large: 8 MB each at most"})
        self._send(*handle(self.headers, self.rfile.read(n) if n else b""))

    def do_GET(self):
        self._send(405, {"error": "POST photos to this endpoint"})
