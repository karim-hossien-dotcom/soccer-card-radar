"""D2 spike: photo gate. Asks a Claude vision model whether a listing photo shows a single raw card, flat
and straight-on with all four edges visible. Only those go on to the centering check. Scored against
hand labels (labels-ebay-*.json). Needs ANTHROPIC_API_KEY in apps/dashboard/.env.local.

    python3 photo_gate.py [model]      # default claude-haiku-5-5
"""
import base64, json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from centering import assess

HERE = os.path.dirname(os.path.abspath(__file__))
env = dict(l.strip().split("=", 1) for l in open(os.path.join(HERE, "../../apps/dashboard/.env.local")) if "=" in l and not l.startswith("#"))
KEY = env.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
MODEL = sys.argv[1] if len(sys.argv) > 1 else "claude-haiku-5-5"

PROMPT = """You check eBay trading-card listing photos before a centering measurement.
Classify the photo. Answer with JSON only:
{"type": "raw" | "slab" | "holder" | "multi" | "other",
 "straight_on": true/false,       // camera roughly square to the card, little perspective
 "all_edges_visible": true/false, // all four card edges inside the photo and not hidden by a case
 "fills_frame": true/false,       // card is at least about a third of the photo
 "visible_flaws": [],             // only flaws you can clearly see: "corner", "edge", "surface", "print line"
 "reason": "<10 words"}
type: raw = bare card (a thin penny sleeve is fine); slab = graded case with a label (PSA, BGS, SGC, CGC...);
holder = toploader, magnetic one-touch or other rigid case without a grade label; multi = more than one card
or item is the subject; other = anything else."""


def ask(path):
    img = base64.b64encode(open(path, "rb").read()).decode()
    body = {"model": MODEL, "max_tokens": 200, "messages": [{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img}},
        {"type": "text", "text": PROMPT}]}]}
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode(), headers={
        "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    text = d["content"][0]["text"]
    out = json.loads(text[text.index("{"): text.rindex("}") + 1])
    return out, d["usage"]


def usable(g):
    return g["type"] == "raw" and g["straight_on"] and g["all_edges_visible"] and g["fills_frame"]


def main():
    if not KEY:
        sys.exit("ANTHROPIC_API_KEY missing in apps/dashboard/.env.local")
    labels = json.load(open(os.path.join(HERE, "labels-ebay-2026-10-20.json")))
    tin = tout = 0
    tp = fp = fn = tn = 0
    rows = []
    for l in labels:
        p = os.path.join(HERE, f'photos/ebay/{l["n"]:03d}.jpg')
        g, u = ask(p)
        tin += u["input_tokens"]; tout += u["output_tokens"]
        ok = usable(g)
        tp += ok and l["usable"]; fp += ok and not l["usable"]; fn += (not ok) and l["usable"]; tn += (not ok) and not l["usable"]
        c = assess(p) if ok else None
        rows.append({**l, "gate": g, "gate_usable": ok, "centering": c and {k: c.get(k) for k in ("result", "lr")}})
        print(f'#{l["n"]:<3} label={l["label"]:8} model={g["type"]:7} usable={str(ok):5} {"" if not c else c["result"]+" "+str(c.get("lr",""))}  flaws={g.get("visible_flaws")}')
        time.sleep(0.3)
    json.dump(rows, open(os.path.join(HERE, f"gate-results-{MODEL}.json"), "w"), indent=1)
    n = len(labels)
    print(f"\n{MODEL}: accuracy {(tp+tn)/n:.0%}; usable precision {tp/max(tp+fp,1):.0%} ({fp} bad photos let through); recall {tp/max(tp+fn,1):.0%}")
    print(f"tokens: {tin} in / {tout} out over {n} photos ({tin//n} in per photo)")


if __name__ == "__main__":
    main()
