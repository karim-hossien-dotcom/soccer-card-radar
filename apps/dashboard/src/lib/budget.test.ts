import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetLeft, cycle, refuse, type Bid } from "./budget.ts";

const b = (externalId: string, status: Bid["status"], maxBid: number, createdAt: string, wonPrice: number | null = null): Bid => ({ externalId, status, maxBid, createdAt, wonPrice });

test("cycle: 14-day windows from the anchor", () => {
  assert.equal(cycle(new Date("2026-10-26T00:00:00Z")).start.toISOString().slice(0, 10), "2026-10-26");
  assert.equal(cycle(new Date("2026-11-08T23:59:00Z")).start.toISOString().slice(0, 10), "2026-10-26");
  assert.equal(cycle(new Date("2026-11-09T00:00:00Z")).start.toISOString().slice(0, 10), "2026-11-09");
});

test("budgetLeft: approved at max, won at price paid, skipped/cancelled/lost free, old cycle ignored", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  const bids = [
    b("1", "approved", 60, "2026-10-27T10:00:00Z"),
    b("2", "won", 55, "2026-10-28T10:00:00Z", 41.5),
    b("3", "skipped", 99, "2026-10-28T10:00:00Z"),
    b("4", "cancelled", 80, "2026-10-28T10:00:00Z"),
    b("5", "lost", 70, "2026-10-29T10:00:00Z"),
    b("6", "approved", 200, "2026-10-20T10:00:00Z"), // previous cycle
  ];
  const r = budgetLeft(bids, 500, now);
  assert.deepEqual(r, { budget: 500, committed: 101.5, left: 398.5, start: "2026-10-26", end: "2026-11-08" });
  assert.equal(budgetLeft(bids, 500, now, "1").left, 458.5, "re-approving a listing frees its old max first");
});

test("refuse: over budget, ended, zero", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  assert.equal(refuse(50, "2026-10-31T00:00:00Z", 60, now), null);
  assert.match(refuse(61, "2026-10-31T00:00:00Z", 60, now)!, /Only \$60.00 left/);
  assert.match(refuse(50, "2026-10-30T11:00:00Z", 60, now)!, /already ended/);
  assert.match(refuse(0, null, 60, now)!, /more than \$0/);
});
