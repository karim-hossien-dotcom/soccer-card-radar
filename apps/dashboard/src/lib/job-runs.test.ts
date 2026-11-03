import { test } from "node:test";
import assert from "node:assert/strict";
import { latestRuns, formatEt, countsLine, summaryBody, type JobRunRow } from "./job-runs.ts";

const row = (o: Partial<JobRunRow>): JobRunRow => ({
  job: "prices", ranAt: "2026-11-09T00:43:00Z", finishedAt: null, status: "complete", openCount: 0,
  summary: "Complete", reportPath: null, changes: [], photoList: [], ...o,
});

test("one entry per job in fixed order; job with no row -> No run logged yet", () => {
  const out = latestRuns([row({ job: "photos" }), row({ job: "prices" })]);
  assert.deepEqual(out.map((p) => p.label), ["Prices", "Players", "Photos"]);
  assert.equal(out[1]!.run, null);
  assert.equal(out[1]!.empty, "No run logged yet");
  assert.ok(out[0]!.run && out[2]!.run);
});

test("newest ranAt wins regardless of input order; unknown jobs ignored", () => {
  const out = latestRuns([
    row({ summary: "old", ranAt: "2026-11-02T00:43:00Z" }),
    row({ summary: "new", ranAt: "2026-11-09T00:43:00Z" }),
    row({ summary: "older", ranAt: "2026-10-26T00:43:00Z" }),
    row({ job: "foo", summary: "nope", ranAt: "2026-12-01T00:00:00Z" }),
  ]);
  assert.equal(out[0]!.run!.summary, "new");
  assert.equal(out.length, 3);
});

test("status line", () => {
  const [p, pl] = latestRuns([row({}), row({ job: "players", status: "incomplete", openCount: 2 })]);
  assert.equal(p!.run!.statusLine, "Complete");
  assert.equal(pl!.run!.statusLine, "Incomplete: 2 open");
});

test("summary's first line is dropped when it repeats the status line, kept when it disagrees", () => {
  const [p, pl] = latestRuns([
    row({ summary: "Complete\n41 cards checked." }),
    row({ job: "players", status: "incomplete", openCount: 2, summary: "Incomplete: 2 items open\n- a\n- b" }),
  ]);
  assert.equal(p!.run!.summary, "41 cards checked.");
  assert.equal(pl!.run!.summary, "- a\n- b");
  assert.equal(latestRuns([row({ summary: "Complete" })])[0]!.run!.summary, "");
  assert.equal(summaryBody("Incomplete: 3 items open\n- a", false, 2), "Incomplete: 3 items open\n- a");
  assert.equal(summaryBody("Incomplete: 1 open\n- a", true, 0), "Incomplete: 1 open\n- a");
  assert.equal(summaryBody("Completed 41 checks", true, 0), "Completed 41 checks");
});

test("counts per kind from changes, plus photoList length", () => {
  const ch = (kind: string, i: number) => ({ kind, cardId: `c${i}`, card: `Card ${i}` });
  const changes = [
    ...Array.from({ length: 12 }, (_, i) => ch("value", i)),
    ...Array.from({ length: 3 }, (_, i) => ch("card_added", i)),
    ...Array.from({ length: 2 }, (_, i) => ch("cost", i)),
    ch("photo", 1),
    ...Array.from({ length: 4 }, (_, i) => ch("estimate", i)),
  ];
  const r = latestRuns([row({ changes, photoList: [{ cardId: "c1", card: "Card 1", side: "back", reason: "no scan" }] })])[0]!.run!;
  assert.equal(r.counts, "12 values, 3 cards added, 2 costs, 1 photo, 4 estimates");
  assert.equal(r.photoList.length, 1);
  assert.equal(r.changes.length, 22);
  assert.equal(countsLine([], 0), "No changes");
});

test("value/cost rows keep from/to/source", () => {
  const r = latestRuns([row({ changes: [{ kind: "value", cardId: "a", card: "A", from: 100, to: 120.5, source: "ebay_sold" }] })])[0]!.run!;
  assert.deepEqual(r.changes[0], { kind: "value", cardId: "a", card: "A", from: 100, to: 120.5, source: "ebay_sold" });
});

test("malformed jsonb: items skipped and counted as unreadable, never throws", () => {
  assert.doesNotThrow(() => latestRuns([row({ changes: "oops" as unknown, photoList: { a: 1 } as unknown })]));
  const a = latestRuns([row({ changes: "oops" as unknown, photoList: null as unknown })])[0]!.run!;
  assert.equal(a.changes.length, 0);
  assert.equal(a.unreadable, 2);
  assert.match(a.counts, /2 unreadable/);
  const b = latestRuns([row({
    changes: [{ kind: "value", card: "no id" }, null, 7, { kind: "bogus", cardId: "x", card: "X" }, { kind: "cost", cardId: "ok", card: "OK", from: 1, to: 2 }],
    photoList: [{ card: "no id", side: "front", reason: "r" }, { cardId: "p", card: "P", side: "top", reason: "r" }, { cardId: "q", card: "Q", side: "front", reason: "no scan" }],
  })])[0]!.run!;
  assert.equal(b.changes.length, 1);
  assert.equal(b.photoList.length, 1);
  assert.equal(b.unreadable, 6);
  assert.equal(b.counts, "1 cost, 6 unreadable");
  // whole row malformed: bad ranAt / missing fields
  assert.doesNotThrow(() => latestRuns([{ job: "prices" } as unknown as JobRunRow, null as unknown as JobRunRow]));
});

test("ET formatting at the DST edge (2026-11-01: 1:30 AM happens twice)", () => {
  assert.equal(formatEt("2026-11-01T05:30:00Z"), "Sun, Nov 1, 2026, 1:30 AM EDT");
  assert.equal(formatEt("2026-11-01T06:30:00Z"), "Sun, Nov 1, 2026, 1:30 AM EST");
  assert.equal(formatEt("2026-11-09T00:43:00Z"), "Sun, Nov 8, 2026, 7:43 PM EST");
  assert.equal(formatEt("not a date"), "unknown time");
  assert.equal(formatEt(null), "unknown time");
});
