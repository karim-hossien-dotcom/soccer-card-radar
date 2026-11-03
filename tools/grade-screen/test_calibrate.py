"""G9c: calibrate.py on a 2-image synthetic fixture (made here, never committed: real scans stay out of the public repo)."""
import os, shutil, subprocess, sys, tempfile
import calibrate as cal
import test_condition as t


def fixture():
    d = tempfile.mkdtemp()
    shutil.copy(t.fake(chips=8), os.path.join(d, "11111111.png"))   # chipped edge: would cap PSA 8
    shutil.copy(t.fake(), os.path.join(d, "22222222.png"))          # clean
    with open(os.path.join(d, "grades.csv"), "w") as fh:
        fh.write("cert,psa_grade\n11111111,9\n22222222,10\n33333333,8\n")  # 3rd: no scan
    return d


def test_calibrate_prints_per_check_agreement():
    d = fixture()
    cards, summary = cal.run(d, os.path.join(d, "grades.csv"))
    by = {s["check"]: s for s in summary}
    assert [c["cert"] for c in cards] == ["11111111", "22222222", "33333333"] and cards[2]["note"] == "no scan"
    assert by["edges_chipping"] == {"check": "edges_chipping", "judged": 2, "capped": 1, "false_caps": 1, "held": 0, "on": False}, by
    assert by["centering"]["capped"] == 0 and by["centering"]["on"] is True
    here = os.path.dirname(os.path.abspath(cal.__file__))
    text = subprocess.run([sys.executable, os.path.join(here, "calibrate.py"), d, os.path.join(d, "grades.csv")],
                          capture_output=True, text=True, check=True, cwd=here).stdout
    assert "check                judged  capped  held  false_caps  in use" in text, text
    assert "edges_chipping            2       1     0           1  off (look only)" in text, text
    print(text)


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)
