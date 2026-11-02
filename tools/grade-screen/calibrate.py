"""G9c calibration harness: run the condition screen over Karim's own PSA cert-page scans and print, per check, how the
cap it would set agrees with the grade PSA gave. Read-only: prints a table, writes nothing, switches nothing on.

    python3 calibrate.py <scans folder> <grades csv>

grades csv: header `cert,psa_grade`, one row per slab. Scans: <cert>.jpg / .jpeg / .png / .webp in the folder (front), and
optionally <cert>-back.<ext>. Keep them in tools/grade-screen/calibration/ (git-ignored: the repo is public). See
CALIBRATION.md for how to collect them and the pass bar for switching a check on.

Cert scans show the card inside a slab, so the sleeve/holder guard is bypassed and the outline is the card-shaped one
inside the slab (condition.nested_card). Slab plastic can itself add false edge specks: read poor agreement as "collect raw
photos of the same cards", not as proof the check is wrong.
"""
import csv, os, sys
import cv2
import numpy as np
import condition as cond

EXTS = (".jpg", ".jpeg", ".png", ".webp")
CHECKS = ("centering",) + tuple(cond.CALIBRATED)


def find(folder, stem):
    return next((os.path.join(folder, stem + e) for e in EXTS if os.path.exists(os.path.join(folder, stem + e))), None)


def hint(path):
    """The card inside the slab, as the phone-scanner style corners condition.py takes (fractions of the photo)."""
    img = cv2.imread(path)
    q = None if img is None else cond.nested_card(img)
    if q is None:
        return None
    return (q / np.float32([img.shape[1], img.shape[0]])).tolist()


def predict(front, back=None):
    """{check: PSA cap it would set (None = no cap), ...} or None when the front could not be measured."""
    hints = {"front": hint(front), "back": hint(back) if back else None}
    rep, cent = cond.assess_with_centering(front, back, hints=hints, holder_guard=False)
    f = rep["front"]
    if not f or f.get("outline_error"):
        return None
    caps = [cond.centering_grades(w, back=k.startswith("back"))[0] for k, w in cent.items()]
    out = {"centering": min([c for c in caps if c < 10], default=None)}
    out.update(rep["ceiling"].get("would_cap") or {})
    return out


def run(folder, grades_csv):
    """(per-card rows, per-check summary rows)."""
    cards = []
    with open(grades_csv, newline="") as fh:
        for row in csv.DictReader(fh):
            cert, grade = (row.get("cert") or "").strip(), (row.get("psa_grade") or "").strip()
            front = find(folder, cert) if cert else None
            if not front or not grade:
                cards.append({"cert": cert, "psa": float(grade) if grade else None, "pred": None, "note": "no scan" if not front else "no grade"})
                continue
            pred = predict(front, find(folder, cert + "-back"))
            cards.append({"cert": cert, "psa": float(grade), "pred": pred, "note": None if pred else "front not measured"})
    summary = []
    for check in CHECKS:
        judged = [c for c in cards if c["pred"]]
        capped = [c for c in judged if c["pred"].get(check) is not None]
        false = [c for c in capped if c["pred"][check] < c["psa"]]  # said "at best N", PSA gave more: a false cap
        summary.append({"check": check, "judged": len(judged), "capped": len(capped), "false_caps": len(false),
                        "held": len(capped) - len(false), "on": check == "centering" or cond.CALIBRATED[check]})
    return cards, summary


def table(cards, summary):
    lines = ["cert        PSA   " + "  ".join(f"{c:>17}" for c in CHECKS) + "  note"]
    for c in cards:
        p = c["pred"] or {}
        cells = "  ".join(f"{('-' if p.get(k) is None else f'{p[k]:g}'):>17}" for k in CHECKS)
        psa = "?" if c["psa"] is None else f"{c['psa']:g}"
        lines.append(f"{c['cert'][:10]:<10}  {psa:>4}  {cells}  {c['note'] or ''}".rstrip())
    lines += ["", "check                judged  capped  held  false_caps  in use"]
    for s in summary:
        lines.append(f"{s['check']:<20} {s['judged']:>6}  {s['capped']:>6}  {s['held']:>4}  {s['false_caps']:>10}  {'on' if s['on'] else 'off (look only)'}")
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    print(table(*run(sys.argv[1], sys.argv[2])))
