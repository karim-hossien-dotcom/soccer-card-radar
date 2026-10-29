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
        return "cant_judge", "Can't judge: card outline not found in the photo"
    cent = (report.get("centering") or {}).get("front_lr")
    cent_s = f" (centering {cent})" if cent else ""
    if ceil.get("psa") is not None and ceil["psa"] < 10:
        why = (ceil.get("why") or [""])[0]
        return "ceiling", f"At best PSA {ceil['psa']:g}: {why}" if why else f"At best PSA {ceil['psa']:g}{cent_s}"
    return "no_issue", f"No visible issue{cent_s}"


def fetch(url):
    r = urllib.request.Request(big(url), headers={"User-Agent": "Mozilla/5.0 card-radar-screen"})
    with urllib.request.urlopen(r, timeout=15) as res:
        return res.read(9 * 1024 * 1024)


def ask_gate(key, img, mtype):
    body = {"model": MODEL, "max_tokens": 1024, "messages": [{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": mtype, "data": base64.b64encode(img).decode()}},
        {"type": "text", "text": GATE_PROMPT}]}]}
    r = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode(), headers={
        "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(r, timeout=30) as res:
        d = json.loads(res.read())
    text = next(b["text"] for b in d["content"] if b.get("type") == "text")
    return json.loads(text[text.index("{"): text.rindex("}") + 1])


