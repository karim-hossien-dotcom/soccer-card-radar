import { test } from "node:test";
import assert from "node:assert/strict";
import { openItems, ageDays, ageLabel, planUpsert, type OpenItemRow } from "./open-items.ts";

// Fixture rows only: made-up titles and ids.
const NOW = new Date("2026-11-12T15:00:00Z");
const row = (o: Partial<OpenItemRow>): OpenItemRow => ({
  id: "i1", job: "prices", cardId: null, title: "Item", reason: "", firstSeen: "2026-11-10T12:00:00Z",
  lastSeen: "2026-11-12T12:00:00Z", closedAt: null, closedHow: null, ...o,
});

test("age in whole days from firstSeen; label singular/plural; never negative", () => {
  assert.equal(ageDays("2026-11-12T14:59:00Z", NOW), 0);
  assert.equal(ageDays("2026-11-11T15:00:00Z", NOW), 1);
  assert.equal(ageDays("2026-11-11T15:00:01Z", NOW), 0);
  assert.equal(ageDays("2026-10-29T15:00:00Z", NOW), 14);
  assert.equal(ageDays("2026-11-13T00:00:00Z", NOW), 0);
  assert.equal(ageLabel(0), "0 days");
  assert.equal(ageLabel(1), "1 day");
  assert.equal(ageLabel(14), "14 days");
});

test("open items oldest first with age; closed items drop off", () => {
  const out = openItems([
    row({ id: "new", title: "New", firstSeen: "2026-11-12T01:00:00Z" }),
    row({ id: "closed", title: "Closed", firstSeen: "2026-10-01T00:00:00Z", closedAt: "2026-11-11T00:00:00Z", closedHow: "comp found" }),
    row({ id: "old", job: "players", title: "Old", firstSeen: "2026-10-29T15:00:00Z", reason: "FBref blocked" }),
    row({ id: "mid", cardId: "c1", title: "Mid", firstSeen: "2026-11-11T10:00:00Z" }),
  ], NOW);
  assert.deepEqual(out.map((i) => i.id), ["old", "mid", "new"]);
  assert.deepEqual(out.map((i) => i.age), ["14 days", "1 day", "0 days"]);
  assert.equal(out[0]!.jobLabel, "Players");
  assert.equal(out[0]!.reason, "FBref blocked");
  assert.equal(out[1]!.cardId, "c1");
});

test("ties broken by job then title; unreadable rows skipped, never throws", () => {
  const t = "2026-11-01T00:00:00Z";
  const out = openItems([
    row({ id: "b", job: "prices", title: "B", firstSeen: t }),
    row({ id: "a", job: "prices", title: "A", firstSeen: t }),
    row({ id: "p", job: "photos", title: "Z", firstSeen: t }),
    row({ id: "bad-date", firstSeen: "nope" }),
    row({ id: "no-title", title: "  " }),
    null as unknown as OpenItemRow,
  ], NOW);
  assert.deepEqual(out.map((i) => i.id), ["p", "a", "b"]);
  assert.doesNotThrow(() => openItems(null, NOW));
  assert.deepEqual(openItems([], NOW), []);
});

test("upsert: new -> insert, still open -> lastSeen, resolved -> closedAt + closedHow", () => {
  const existing = [
    row({ id: "still", cardId: "c1", title: "No graded comps", reason: "old reason" }),
    row({ id: "fixed", cardId: "c2", title: "Missing cost" }),
    row({ id: "quiet", title: "Not mentioned" }),
    row({ id: "other-job", job: "players", cardId: "c1", title: "No graded comps" }),
    row({ id: "was-closed", cardId: "c3", title: "Came back", closedAt: "2026-11-01T00:00:00Z", closedHow: "x" }),
  ];
  const plan = planUpsert(existing, "prices", {
    open: [
      { cardId: "c1", title: "No graded comps", reason: "still none in 90 days" },
      { cardId: null, title: "Card Ladder login expired", reason: "" },
      { cardId: "c3", title: "Came back", reason: "again" },
    ],
    resolved: [{ cardId: "c2", title: "Missing cost", closedHow: "eBay purchase found" }],
  }, NOW);
  const at = NOW.toISOString();
  assert.deepEqual(plan.touch, [{ id: "still", lastSeen: at, reason: "still none in 90 days" }]);
  assert.deepEqual(plan.close, [{ id: "fixed", closedAt: at, closedHow: "eBay purchase found" }]);
  assert.deepEqual(plan.insert.map((i) => [i.cardId, i.title, i.firstSeen, i.lastSeen, i.closedAt]), [
    [null, "Card Ladder login expired", at, at, null],
    ["c3", "Came back", at, at, null],
  ]);
  // "quiet" and the players row are untouched
  const ids = [...plan.touch, ...plan.close].map((x) => x.id);
  assert.ok(!ids.includes("quiet") && !ids.includes("other-job"));
});

test("close needs closedHow and an open row; closed item then drops off the panel", () => {
  const existing = [row({ id: "x", cardId: "c9", title: "T" })];
  assert.deepEqual(planUpsert(existing, "prices", { open: [], resolved: [{ cardId: "c9", title: "T", closedHow: " " }] }, NOW).close, []);
  assert.deepEqual(planUpsert(existing, "prices", { open: [], resolved: [{ cardId: null, title: "T", closedHow: "done" }] }, NOW).close, []);
  const plan = planUpsert(existing, "prices", { open: [{ cardId: "c9", title: "T", reason: "" }], resolved: [{ cardId: "c9", title: "T", closedHow: "done" }] }, NOW);
  assert.deepEqual(plan.close.map((c) => c.id), ["x"]);
  assert.equal(plan.touch.length + plan.insert.length, 0, "resolved wins over open in the same run");
  const after = existing.map((r) => ({ ...r, closedAt: plan.close[0]!.closedAt, closedHow: plan.close[0]!.closedHow }));
  assert.deepEqual(openItems(after, NOW), []);
});
