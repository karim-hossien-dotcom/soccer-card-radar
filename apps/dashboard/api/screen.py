"""GET /api/screen: grade-screen the photos of live eBay listings for raw snipe targets (G3).

Runs as a Vercel cron after the daily scan (vercel.json), or by hand with the admin token. Per listing photo:
  1. photo gate (Claude vision; the screen does nothing until ANTHROPIC_API_KEY is set): is this one raw card, flat, straight-on,
     all four edges visible, filling the frame? If not, the verdict is "cant_judge" and no measurement runs.
  2. the D3 condition check (api/_grade_screen/condition.py): centering, edge chips, corner whitening.
Results go to the ListingScreen table, keyed by (externalId, imageUrl), so a photo is screened once.
A reject filter only: it can warn that a listing caps below PSA 10; it never promises a grade.
Read-only towards eBay: downloads the listing photo, never bids.
"""
import base64, hmac, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "_grade_screen"))
import condition as cond  # noqa: E402

BATCH = 12            # photos per call: keeps one call well inside the 60 s function limit
BUDGET_S = 45         # stop starting new photos after this many seconds
FRESH_H = 48          # same freshness window as the snipe board
MODEL = "claude-haiku-5-5"
GRADED = re.compile(r"\b(PSA|BGS|SGC|CGC|CSG|HGA|TAG|ACE|Beckett)\b|\bGEM\s*(MINT|MT)\b|/DNA", re.I)

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


class Supa:
    def __init__(self, env):
        self.base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1"
        key = env["SUPABASE_SERVICE_ROLE_KEY"]
        self.hdr = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}

    def req(self, path, method="GET", body=None, extra=None):
        r = urllib.request.Request(self.base + path, method=method, headers={**self.hdr, **(extra or {})},
                                   data=None if body is None else json.dumps(body, default=float).encode())
        with urllib.request.urlopen(r, timeout=20) as res:
            raw = res.read()
            return json.loads(raw) if raw else None


def _norm(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()


def _has(title, term):
    t = _norm(term).strip()
    return not t or re.search(r"(^|[^a-z0-9])" + re.escape(t) + r"($|[^a-z0-9])", title) is not None


_NUMBERED = re.compile(r"(^|[^a-z0-9])(\d{1,4}|#)?\s*/\s*\d{1,4}($|[^a-z0-9])")


def matches(title, must, exclude):
    """Same rule as the board (src/lib/match-title.ts): whole-word terms, accents ignored, "a|b" = either,
    exclude "numbered" = any print-run serial."""
    t = _norm(title)
    def excluded(x):
        if _norm(x).strip() == "numbered":
            return _NUMBERED.search(re.sub(r"\b(19|20)\d\d\s*/\s*\d{2,4}\b", "", t)) is not None
        return _has(t, x)
    return all(any(_has(t, a) for a in (m or "").split("|")) for m in (must or [])) and not any(excluded(x) for x in (exclude or []))


def pending(db, now):
    """Listings to screen: live, fresh, raw-looking titles, for raw snipe targets, photo not screened yet."""
    targets = db.req("/SnipeTarget?select=actionId,mustInclude,exclude&active=eq.true") or []
    # Same rule as the board (isGradedTarget): a target is for a slab when a title term names a grade.
    slab = re.compile(r"^(psa|bgs|sgc|cgc|tag)\b", re.I)
    raw_targets = [t for t in targets if not any(slab.match((m or "").strip()) for m in (t.get("mustInclude") or []))]
    raw_ids = sorted({t["actionId"] for t in raw_targets})
    if not raw_ids:
        return []
    since = (now - timedelta(hours=FRESH_H)).isoformat()
    q = (f'/Listing?select=externalId,title,imageUrl,rawData,actionId&soldAt=is.null&imageUrl=not.is.null'
         f'&lastSeenAt=gte.{urllib.parse.quote(since)}&actionId=in.({",".join(raw_ids)})&order=lastSeenAt.desc&limit=400')
    rows = [r for r in (db.req(q) or []) if r.get("externalId") and not GRADED.search(r["title"] or "")
            and str((r.get("rawData") or {}).get("condition") or "").lower() != "graded"
            and any(t["actionId"] == r.get("actionId") and matches(r["title"], t.get("mustInclude"), t.get("exclude")) for t in raw_targets)]
    if not rows:
        return []
    done = set()
    ids = sorted({r["externalId"] for r in rows})
    for i in range(0, len(ids), 80):
        chunk = ",".join('"' + x.replace('"', "") + '"' for x in ids[i:i + 80])
        for s in db.req(f'/ListingScreen?select=externalId,imageUrl&externalId=in.({urllib.parse.quote(chunk)})') or []:
            done.add((s["externalId"], s["imageUrl"]))
    return [r for r in rows if (r["externalId"], r["imageUrl"]) not in done]


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


def screen_one(row, key):
    img = fetch(row["imageUrl"])
    mtype = media_type(img)
    if not mtype:
        return None, None, "cant_judge", "Can't judge: photo format not supported"
    gate = ask_gate(key, img, mtype) if key else None
    report = None
    if gate is None or usable(gate):
        report, _ = cond.assess_with_centering(img)
    verdict, summary = summarize(gate, report)
    slim = None if report is None else {"centering": report.get("centering"), "ceiling": report.get("ceiling")}
    return gate, slim, verdict, summary


def run(env, now=None, clock=time.monotonic):
    now = now or datetime.now(timezone.utc)
    key = env.get("ANTHROPIC_API_KEY") or None
    if not key:  # without the photo gate, holders and slabs get measured as cards: worse than no screen
        return {"screened": 0, "left": 0, "gated": False, "verdicts": {}, "skipped": "ANTHROPIC_API_KEY is not set"}
    db = Supa(env)
    todo = pending(db, now)
    start, done, counts = clock(), 0, {}
    for row in todo[:BATCH]:
        if clock() - start > BUDGET_S:
            break
        try:
            gate, slim, verdict, summary = screen_one(row, key)
        except Exception as e:  # one bad photo must not stop the run
            gate, slim, verdict, summary = None, None, "error", f"Not screened: {type(e).__name__}"
        db.req("/ListingScreen?on_conflict=externalId,imageUrl", "POST",
               [{"externalId": row["externalId"], "imageUrl": row["imageUrl"], "gated": key is not None, "gate": gate,
                 "verdict": verdict, "summary": summary, "report": slim, "screenedAt": now.isoformat()}],
               {"Prefer": "resolution=merge-duplicates,return=minimal"})
        done += 1
        counts[verdict] = counts.get(verdict, 0) + 1
    return {"screened": done, "left": max(len(todo) - done, 0), "gated": key is not None, "verdicts": counts}


MAX_HOPS = 15  # one call screens BATCH photos; it then starts the next call, up to this many in a row


def chain(headers, hop):
    """Start the next batch as a new function call (fire and forget) so no single call runs past its time limit."""
    host = headers.get("x-forwarded-host") or headers.get("host")
    if not host:
        return "no host"
    fwd = {k: headers.get(k) for k in ("authorization", "x-admin-token") if headers.get(k)}
    try:
        urllib.request.urlopen(urllib.request.Request(f"https://{host}/api/screen?hop={hop}", headers=fwd), timeout=1.5)
    except Exception:
        pass  # the timeout is expected: the next call keeps running on its own
    return f"hop {hop} started"


def authorized(headers, env):
    cron = env.get("CRON_SECRET")
    auth = headers.get("authorization") or ""
    if cron and hmac.compare_digest(auth.encode(), f"Bearer {cron}".encode()):
        return True
    want, got = env.get("ADMIN_TOKEN"), headers.get("x-admin-token") or ""
    return bool(want) and hmac.compare_digest(got.encode(), want.encode())


class handler(BaseHTTPRequestHandler):
    def _send(self, status, data):
        out = json.dumps(data, default=float).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def do_GET(self):
        if not authorized(self.headers, os.environ):
            return self._send(401, {"error": "Not authorized"})
        try:
            out = run(os.environ)
        except Exception as e:
            return self._send(500, {"error": f"{type(e).__name__}: {e}"[:300]})
        hop = int((urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("hop") or ["0"])[0] or 0)
        if out["left"] and out["screened"] and hop < MAX_HOPS:
            out["next"] = chain(self.headers, hop + 1)
        self._send(200, out)

    do_POST = do_GET
