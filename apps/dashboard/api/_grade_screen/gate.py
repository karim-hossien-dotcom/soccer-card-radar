"""Photo gate (Claude vision) and one-line verdicts, shared by api/screen.py and api/condition.py.
Is this photo one raw card, flat, straight-on, all four edges visible, filling the frame? Only then is it measured."""
import base64, json, re, urllib.request

MODEL = "claude-haiku-5-5"


GATE_PROMPT = """You check eBay trading-card listing photos before a condition measurement.
Classify the photo. Answer with JSON only:
{"type": "raw" | "slab" | "holder" | "multi" | "other",
 "straight_on": true/false,
 "all_edges_visible": true/false,
 "fills_frame": true/false,
 "visible_flaws": [],
 "reason": "<10 words"}
type: raw = bare card (a thin penny sleeve is fine); slab = graded case with a label; holder = toploader, magnetic
one-touch or other rigid case without a grade label; multi = more than one card or item is the subject; other =
anything else. straight_on: camera roughly square to the card. all_edges_visible: all four card edges inside the
photo and not hidden by a case. fills_frame: card is at least about a third of the photo. visible_flaws: only flaws
you can clearly see: "corner", "edge", "surface", "print line"."""


def big(url):  # eBay serves the same photo at larger sizes: s-l225 -> s-l1600
    return re.sub(r"/s-l\d+\.", "/s-l1600.", url)


def media_type(b):
    if b[:3] == b"\xff\xd8\xff": return "image/jpeg"
    if b[:8] == b"\x89PNG\r\n\x1a\n": return "image/png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP": return "image/webp"
    return None


def usable(g):
    return g.get("type") == "raw" and bool(g.get("straight_on")) and bool(g.get("all_edges_visible")) and bool(g.get("fills_frame"))


GATE_WHY = {"slab": "photo shows a graded slab", "holder": "card is in a toploader or holder", "multi": "more than one card in the photo",
            "other": "not a clear card photo"}


def gate_reason(g):
    if g.get("type") != "raw":
        return GATE_WHY.get(g.get("type"), "not a clear card photo")
    if not g.get("all_edges_visible"): return "not all four edges visible"
    if not g.get("straight_on"): return "photo taken at an angle"
    if not g.get("fills_frame"): return "card too small in the photo"
    return "photo not usable"


def summarize(gate, report):
    """(verdict, one-line summary) for the board. verdict: ceiling | no_issue | cant_judge."""
    if gate is not None and not usable(gate):
        return "cant_judge", "Can't judge: " + gate_reason(gate)
    if report is None:
        return "cant_judge", "Can't judge: photo not measured"
    ceil = report.get("ceiling") or {}
    if not report.get("front"):
        why = next((c["why"] for c in report.get("cant_judge") or [] if c.get("point") == "front (all points)"), None)
        return "cant_judge", f"Can't judge: {why}" if why else "Can't judge: card outline not found in the photo"
    cent = (report.get("centering") or {}).get("front_lr")
    cent_s = f" (centering {cent})" if cent else ""
    if ceil.get("psa") is not None and ceil["psa"] < 10:
        why = (ceil.get("why") or [""])[0]
        return "ceiling", f"At best PSA {ceil['psa']:g}: {why}" if why else f"At best PSA {ceil['psa']:g}{cent_s}"
    return "no_issue", f"No visible issue{cent_s}"


def fetch(url, cookie=None):
    """cookie: only for the app's own Vault photos (behind the site lock); never sent to other hosts."""
    h = {"User-Agent": "Mozilla/5.0 card-radar-screen", **({"Cookie": cookie} if cookie else {})}
    r = urllib.request.Request(big(url), headers=h)
    with urllib.request.urlopen(r, timeout=15) as res:
        return res.read(9 * 1024 * 1024)


def _ask(key, images, prompt, max_tokens=1024):
    """One Claude vision call: images = [(bytes, media_type)], returns the JSON object in the reply."""
    content = [{"type": "image", "source": {"type": "base64", "media_type": mt, "data": base64.b64encode(b).decode()}} for b, mt in images]
    body = {"model": MODEL, "max_tokens": max_tokens, "messages": [{"role": "user", "content": content + [{"type": "text", "text": prompt}]}]}
    r = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode(), headers={
        "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(r, timeout=40) as res:
        d = json.loads(res.read())
    text = next(b["text"] for b in d["content"] if b.get("type") == "text")
    return json.loads(text[text.index("{"): text.rindex("}") + 1])


def ask_gate(key, img, mtype):
    return _ask(key, [(img, mtype)], GATE_PROMPT)


AREAS = ("top left", "top centre", "top right", "middle left", "centre", "middle right", "bottom left", "bottom centre", "bottom right")
SURFACE_PROMPT = """Two photos of the same trading card, straightened to the card's edges. Photo 1: lit straight on.
Photo 2: lit from a low side angle (raking light), which makes dents, creases and scratches cast shadows.
List surface defects you can clearly see, mostly from photo 2. Ignore the printed design, foil/refractor pattern,
holographic sparkle and glare. Ignore the outer edges and corners (checked separately). Answer with JSON only:
{"findings": [{"kind": "dent" | "crease" | "scratch" | "print line" | "stain" | "other",
               "where": "top left" | "top centre" | "top right" | "middle left" | "centre" | "middle right" |
                        "bottom left" | "bottom centre" | "bottom right",
               "confidence": "clear" | "possible",
               "note": "<8 words"}]}
Empty list if you see none. Do not guess: only marks you can point to."""


def ask_surface(key, flat_jpg, raking_jpg):
    """Claude's second look at the straightened flat and raking photos. Returns a list of findings (may be empty)."""
    out = _ask(key, [(flat_jpg, "image/jpeg"), (raking_jpg, "image/jpeg")], SURFACE_PROMPT)
    finds = out.get("findings") if isinstance(out, dict) else None
    return [f for f in (finds or []) if isinstance(f, dict) and f.get("where") in AREAS][:8]


_SAME = {"dent or dimple": {"dent"}, "crease": {"crease", "print line", "scratch"}, "scratch or print line": {"scratch", "print line", "crease"}}


def _next_to(a, b):
    """Same or neighbouring area of the 3x3 grid."""
    ra, ca = divmod(AREAS.index(a), 3)
    rb, cb = divmod(AREAS.index(b), 3)
    return abs(ra - rb) <= 1 and abs(ca - cb) <= 1


def combine_surface(measured, ai):
    """One list: measured findings, each marked 'both' when Claude saw the same kind nearby, plus Claude-only ones."""
    used, out = set(), []
    for m in measured:
        hit = next((i for i, a in enumerate(ai) if i not in used and a.get("kind") in _SAME.get(m["kind"], ()) and _next_to(m["where"], a["where"])), None)
        if hit is not None:
            used.add(hit)
        out.append({**m, "source": "both" if hit is not None else "measured"})
    for i, a in enumerate(ai):
        if i not in used and a.get("confidence") == "clear":
            out.append({"kind": a.get("kind"), "where": a["where"], "note": a.get("note"), "source": "claude"})
    return out
