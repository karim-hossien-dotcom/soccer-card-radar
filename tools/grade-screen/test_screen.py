"""The listing screen (apps/dashboard/api/screen.py): gate verdicts, summaries, auth, and one run against a fake DB."""
import importlib.util, os
from datetime import datetime, timezone
import test_condition as t

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("api_screen", os.path.join(HERE, "..", "..", "apps", "dashboard", "api", "screen.py"))
scr = importlib.util.module_from_spec(spec); spec.loader.exec_module(scr)

RAW = {"type": "raw", "straight_on": True, "all_edges_visible": True, "fills_frame": True}


def test_gate():
    assert scr.usable(RAW)
    assert scr.summarize({**RAW, "type": "holder"}, None) == ("cant_judge", "Can't judge: card is in a toploader or holder")
    assert scr.summarize({**RAW, "straight_on": False}, None) == ("cant_judge", "Can't judge: photo taken at an angle")
    assert scr.summarize({**RAW, "type": "slab"}, None)[1] == "Can't judge: photo shows a graded slab"


def test_summaries_from_reports():
    chip = open(t.fake(chips=8), "rb").read()
    clean = open(t.fake(), "rb").read()
    v, s = scr.summarize(RAW, scr.cond.assess(chip))
    assert v == "ceiling" and s.startswith("At best PSA 8"), s
    v, s = scr.summarize(None, scr.cond.assess(clean))  # no key: ungated, measured anyway
    assert v == "no_issue" and s.startswith("No visible issue"), s
    assert scr.summarize(RAW, {"front": None, "ceiling": {}})[0] == "cant_judge"


def test_auth():
    env = {"CRON_SECRET": "c", "ADMIN_TOKEN": "a"}
    assert scr.authorized({"authorization": "Bearer c"}, env)
    assert scr.authorized({"x-admin-token": "a"}, env)
    assert not scr.authorized({"authorization": "Bearer x"}, env)
    assert not scr.authorized({}, {})


def test_big_photo_url():
    assert scr.big("https://i.ebayimg.com/images/g/abc/s-l225.jpg") == "https://i.ebayimg.com/images/g/abc/s-l1600.jpg"


class FakeDB:
    def __init__(self):
        self.writes = []

    def req(self, path, method="GET", body=None, extra=None):
        if path.startswith("/SnipeTarget"):
            return [{"actionId": "ronaldo", "mustInclude": ["2014", "ronaldo"]}, {"actionId": "messi", "mustInclude": ["messi", "psa 9"]}]
        if path.startswith("/Listing?"):
            assert "actionId=in.(ronaldo)" in path  # slab targets are not screened
            return [{"externalId": "e1", "title": "2014 Prizm Ronaldo #161", "imageUrl": "https://x/s-l225.jpg"},
                    {"externalId": "e2", "title": "2014 Prizm Ronaldo #161 PSA 9", "imageUrl": "https://x/2.jpg"},
                    {"externalId": "e3", "title": "2014 Prizm Ronaldo #161 raw", "imageUrl": "https://x/3.jpg"},
                    {"externalId": "e4", "title": "2014 Prizm Ronaldo #161", "imageUrl": "https://x/4.jpg", "rawData": {"condition": "Graded"}}]
        if path.startswith("/ListingScreen?select"):
            return [{"externalId": "e3", "imageUrl": "https://x/3.jpg"}]  # already screened
        if method == "POST":
            self.writes += body
            return None
        raise AssertionError(path)


def test_run_screens_only_new_raw_listings():
    db = FakeDB()
    chip = open(t.fake(chips=8), "rb").read()
    orig_supa, orig_fetch = scr.Supa, scr.fetch
    scr.Supa, scr.fetch = (lambda env: db), (lambda url: chip)
    try:
        out = scr.run({}, now=datetime(2026, 10, 29, tzinfo=timezone.utc))
    finally:
        scr.Supa, scr.fetch = orig_supa, orig_fetch
    assert out == {"screened": 1, "left": 0, "gated": False, "verdicts": {"ceiling": 1}}, out
    w = db.writes[0]
    assert w["externalId"] == "e1" and w["verdict"] == "ceiling" and w["gated"] is False and w["summary"].startswith("At best PSA 8")


if __name__ == "__main__":
    for k, f in list(globals().items()):
        if k.startswith("test_"):
            f(); print("ok", k)
