"""Run the centering check on live eBay listings for the snipe targets and store the result on
Listing.rawData.gradeScreen, which the snipe board shows. Read-only towards eBay: downloads photos, never bids.

    python3 screen_listings.py            # listings seen in the last 24h, not yet screened
    python3 screen_listings.py --all      # re-screen everything seen in the last 24h
"""
import json, os, re, sys, tempfile, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
sys.path.insert(0, os.path.dirname(__file__))
from centering import assess

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
env = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, "apps/dashboard/.env.local")) if "=" in l and not l.startswith("#"))
BASE, KEY = env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1", env["SUPABASE_SERVICE_ROLE_KEY"]
HDR = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}


def api(path, method="GET", body=None):
    req = urllib.request.Request(BASE + path, method=method, headers=HDR, data=None if body is None else json.dumps(body).encode())
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or "null")


GRADED = re.compile(r"\b(PSA|BGS|SGC|CGC|CSG|HGA|TAG|ACE|Beckett)\b|\bGEM\s*(MINT|MT)\b|/DNA", re.I)


def big(url):  # eBay serves the same photo at larger sizes: s-l225 -> s-l1600
    return re.sub(r"/s-l\d+\.", "/s-l1600.", url)


def main(rescreen):
    targets = sorted({t["actionId"] for t in api("/SnipeTarget?select=actionId&active=eq.true")})
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    q = f'/Listing?select=id,title,imageUrl,rawData&soldAt=is.null&lastSeenAt=gte.{urllib.parse.quote(since)}&actionId=in.({",".join(targets)})'
    rows = [r for r in api(q) if r["imageUrl"] and (rescreen or not (r["rawData"] or {}).get("gradeScreen"))]
    counts = {}
    with tempfile.TemporaryDirectory() as d:
        for r in rows:
            p = os.path.join(d, "x.jpg")
            if GRADED.search(r["title"]):  # slab photos measure the case, not the card; the screen is for raw buys
                res = {"result": "graded", "why": "already graded"}
            else:
              try:
                urllib.request.urlretrieve(big(r["imageUrl"]), p)
                res = assess(p)
              except Exception as e:  # one bad photo should not stop the run
                res = {"result": "cant_measure", "why": f"download failed: {e.__class__.__name__}"}
            screen = {k: res[k] for k in ("result", "lr", "why") if k in res} | {"at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
            api(f'/Listing?id=eq.{r["id"]}', "PATCH", {"rawData": {**(r["rawData"] or {}), "gradeScreen": screen}})
            counts[screen["result"]] = counts.get(screen["result"], 0) + 1
            print(f'{screen["result"]:17} {screen.get("lr",""):6} {r["title"][:80]}')
    print(f"screened {len(rows)}: {counts}")


if __name__ == "__main__":
    main("--all" in sys.argv)
