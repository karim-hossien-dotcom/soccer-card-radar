import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWonList, plan, itemIdOf, cardFromTitle, type BidRow } from "./won.ts";

const tx = (item: string, line: string, title: string, price: string, created: string, type = "Chinese") =>
  `<OrderTransaction><Transaction><CreatedDate>${created}</CreatedDate><Item><ItemID>${item}</ItemID><ListingDetails><EndTime>${created}</EndTime></ListingDetails><ListingType>${type}</ListingType><Title>${title}</Title></Item><TotalTransactionPrice currencyID="USD">${price}</TotalTransactionPrice><OrderLineItemID>${line}</OrderLineItemID></Transaction></OrderTransaction>`;
const xml = `<GetMyeBayBuyingResponse><WonList><OrderTransactionArray>${tx("940031318039", "940031318039-1", "KYLIAN MBAPP&#201; 2022-23 TOPPS STADIUM CLUB CHROME /199", "12.5", "2026-10-29T02:14:17.000Z")}<OrderTransaction><Order><TransactionArray>${tx("111111111111", "111111111111-2", "2014 Panini Prizm World Cup Ronaldo #161 PSA 9", "84.0", "2026-10-30T01:00:00.000Z", "FixedPriceItem").replace(/<\/?OrderTransaction>/g, "")}</TransactionArray></Order></OrderTransaction></OrderTransactionArray></WonList></GetMyeBayBuyingResponse>`;

test("parseWonList: single and multi-item orders, price, auction flag", () => {
  const w = parseWonList(xml);
  assert.equal(w.length, 2);
  assert.deepEqual([w[0].itemId, w[0].price, w[0].auction, w[0].lineItemId], ["940031318039", 12.5, true, "940031318039-1"]);
  assert.deepEqual([w[1].itemId, w[1].price, w[1].auction], ["111111111111", 84, false]);
  assert.equal(parseWonList("<WonList></WonList>").length, 0);
});

test("plan: won/lost for approved bids, new cards from cutoff, re-runs idempotent", () => {
  const wins = parseWonList(xml);
  const bids: BidRow[] = [
    { externalId: "v1|940031318039|0", targetId: "t1", status: "approved", maxBid: 20, endsAt: "2026-10-29T02:14:00Z" },
    { externalId: "v1|222222222222|0", targetId: "t2", status: "approved", maxBid: 30, endsAt: "2026-10-29T00:00:00Z" },
    { externalId: "v1|333333333333|0", targetId: "t3", status: "approved", maxBid: 30, endsAt: "2026-10-30T23:00:00Z" }, // still running
    { externalId: "v1|444444444444|0", targetId: null, status: "skipped", maxBid: 0, endsAt: "2026-10-28T00:00:00Z" },
  ];
  const now = new Date("2026-10-30T12:00:00Z");
  const p = plan(wins, bids, new Set(), "2026-10-29", now);
  assert.deepEqual(p.bids, [
    { externalId: "v1|940031318039|0", status: "won", wonPrice: 12.5 },
    { externalId: "v1|222222222222|0", status: "lost", wonPrice: null },
  ]);
  assert.deepEqual(p.cards.map((c) => [c.tx.itemId, c.targetId]), [["940031318039", "t1"], ["111111111111", null]]);
  assert.equal(plan(wins, bids, new Set(["940031318039-1", "111111111111-2"]), "2026-10-29", now).cards.length, 0, "already logged");
  assert.equal(plan(wins, bids, new Set(), "2026-10-31", now).cards.length, 0, "before cutoff");
  assert.equal(plan(wins, [{ ...bids[1], endsAt: "2026-10-30T10:00:00Z" }], new Set(), "2026-10-29", now).bids.length, 0, "ended 2h ago: not lost yet");
});

test("itemIdOf and cardFromTitle", () => {
  assert.equal(itemIdOf("v1|940031318039|0"), "940031318039");
  assert.deepEqual(cardFromTitle("2014 Panini Prizm World Cup Ronaldo #161 PSA 9 Mint"), { status: "graded", grader: "PSA", grade: "9", year: "2014", printRun: null });
  assert.deepEqual(cardFromTitle("KYLIAN MBAPPE 2022-23 TOPPS STADIUM CLUB CHROME NIGHT VISION /199"), { status: "raw", grader: null, grade: null, year: "2022-23", printRun: 199 });
  assert.equal(cardFromTitle("Arda Guler Red Choice 71/85").printRun, 85);
  assert.equal(cardFromTitle("2023/24 Topps Chrome Yamal #64").printRun, null, "season is not a print run");
});
