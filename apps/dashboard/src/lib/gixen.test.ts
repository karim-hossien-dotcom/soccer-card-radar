import { test } from "node:test";
import assert from "node:assert/strict";
import { ebayItemNumber, maxText, reminderUrl, GIXEN_URL } from "./gixen.ts";

test("ebayItemNumber: strips the Browse v1|…|0 wrapper; plain ids pass through", () => {
  assert.equal(ebayItemNumber("v1|123456789012|0"), "123456789012");
  assert.equal(ebayItemNumber("v1|366732479138|654321"), "366732479138");
  assert.equal(ebayItemNumber("123456789012"), "123456789012");
  assert.equal(ebayItemNumber(" 377546050664 "), "377546050664");
});

test("maxText: whole dollars without cents, otherwise two decimals", () => {
  assert.equal(maxText(40), "40");
  assert.equal(maxText(40.5), "40.50");
});

test("reminderUrl: Google Calendar template, endsAt-15m..endsAt in UTC, title and details", () => {
  const u = reminderUrl({ card: "2014 Prizm WC #161 Ronaldo", maxBid: 40, endsAt: "2026-11-02T01:05:30.000Z", url: "https://www.ebay.com/itm/123456789012", itemNumber: "123456789012" })!;
  assert.ok(u.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE&"));
  const q = new URL(u).searchParams;
  assert.equal(q.get("action"), "TEMPLATE");
  assert.equal(q.get("dates"), "20261102T005030Z/20261102T010530Z");
  assert.equal(q.get("text"), "Snipe: 2014 Prizm WC #161 Ronaldo max $40");
  assert.equal(q.get("details"), "https://www.ebay.com/itm/123456789012\neBay item # 123456789012\nMax $40");
});

test("reminderUrl: offset endsAt is converted to UTC", () => {
  const q = new URL(reminderUrl({ card: "x", maxBid: 1, endsAt: "2026-11-01T20:00:00-05:00", url: "u", itemNumber: "1" })!).searchParams;
  assert.equal(q.get("dates"), "20261102T004500Z/20261102T010000Z");
});

test("reminderUrl: no link without a valid endsAt", () => {
  for (const endsAt of [null, undefined, "", "not a date"]) assert.equal(reminderUrl({ card: "x", maxBid: 1, endsAt, url: "u", itemNumber: "1" }), null);
});

test("Gixen link is the plain home page (no API, no credentials)", () => {
  assert.equal(GIXEN_URL, "https://www.gixen.com/main/home_1.php");
});
