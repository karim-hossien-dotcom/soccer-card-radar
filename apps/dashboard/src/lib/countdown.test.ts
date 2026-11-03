import { test } from "node:test";
import assert from "node:assert/strict";
import { agoShort, endsIn } from "./countdown.ts";

const now = Date.parse("2026-11-03T12:00:00Z");

test("endsIn: minutes, hours+minutes, days; empty without an end time", () => {
  assert.equal(endsIn(null, now), "");
  assert.equal(endsIn("2026-11-03T12:45:00Z", now), "45m");
  assert.equal(endsIn("2026-11-03T14:05:00Z", now), "2h 5m");
  assert.equal(endsIn("2026-11-05T12:00:00Z", now), "2d");
});

test("agoShort: just now, hours, days; zone-less timestamps read as UTC", () => {
  assert.equal(agoShort("2026-11-03T11:30:00Z", now), "just now");
  assert.equal(agoShort("2026-11-03T07:00:00", now), "5h ago");
  assert.equal(agoShort("2026-11-03T07:00:00+00:00", now), "5h ago");
  assert.equal(agoShort("2026-10-31T12:00:00Z", now), "3d ago");
});

test("same now gives the same text (server render and first client render agree)", () => {
  const iso = "2026-11-03T12:00:59.999Z";
  assert.equal(endsIn(iso, now), endsIn(iso, now));
  // Only the explicit now moves the text: a minute later on the client is a different, later render.
  assert.notEqual(endsIn("2026-11-03T13:00:00Z", now), endsIn("2026-11-03T13:00:00Z", now + 60_000));
});
