import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOrders, plan, itemIdOf, cardFromTitle, playerFromTitle, nyDate, isCard, type BidRow } from "./won.ts";

const tx = (item: string, title: string, price: string, ship: string | null, tax: string, created: string) =>
  `<Transaction><CreatedDate>${created}</CreatedDate><Item><ItemID>${item}</ItemID><Title>${title}</Title></Item><TransactionPrice currencyID="USD">${price}</TransactionPrice>${ship ? `<ActualShippingCost currencyID="USD">${ship}</ActualShippingCost>` : ""}<Taxes><TotalTaxAmount currencyID="USD">${tax}</TotalTaxAmount></Taxes><OrderLineItemID>${item}-1</OrderLineItemID></Transaction>`;
const order = (id: string, status: string, ...t: string[]) =>
  `<Order><OrderID>${id}</OrderID><OrderStatus>${status}</OrderStatus><Total currencyID="USD">999</Total><TransactionArray>${t.join("")}</TransactionArray></Order>`;
const xml = `<GetOrdersResponse><OrderArray>${[
  order("11-1", "Completed",
    tx("377546050664", "2026 Panini Prizm World Cup Zizo Red Rookie RC #/50", "5.0", "4.99", "0.75", "2026-10-11T00:04:11.000Z"),
    tx("377555226435", "2018 Panini Donruss Kylian Mbappe Optic Purple Velocity RC #/125 PSA 8", "113.61", "0.5", "8.56", "2026-10-14T03:30:04.000Z")),
  order("117442448497-1", "Cancelled", tx("117442448497", "Erling Haaland The Grail", "320.0", null, "0.0", "2026-10-03T19:17:56.000Z")),
  order("940031318039-1", "Active", tx("940031318039", "KYLIAN MBAPP&#201; 2022-23 TOPPS STADIUM CLUB CHROME /199", "12.5", null, "0.0", "2026-10-29T02:14:17.000Z")),
  order("18-1", "Completed", tx("137306790742", "2019-20 Panini Chronicles Soccer Hanger Cello Box", "90.0", "11.7", "7.63", "2026-10-30T03:00:10.000Z")),
  order("21-1", "Completed", tx("366732479138", "2026 Panini World Cup Prizm Arda Guler Red Choice 71/85", "15.5", "8.0", "1.76", "2026-10-24T02:02:32.000Z")),
].join("")}</OrderArray></GetOrdersResponse>`;

test("parseOrders: landed cost per line, paid/cancelled, Total tag not confused with TotalTaxAmount", () => {
  const o = parseOrders(xml);
  assert.equal(o.length, 6);
  assert.deepEqual(o.map((l) => l.cost), [10.74, 122.67, 320, 12.5, 109.33, 25.26]);
  assert.deepEqual(o.map((l) => [l.paid, l.cancelled]), [[true, false], [true, false], [false, true], [false, false], [true, false], [true, false]]);
  assert.equal(o[3].title, "KYLIAN MBAPPÉ 2022-23 TOPPS STADIUM CLUB CHROME /199");
  assert.equal(o[0].orderId, "11-1");
});

test("plan: existing Vault rows matched by cost+date, older unmatched to review, cancelled/unpaid skipped, bids won/lost", () => {
  const lines = parseOrders(xml);
  const existing = [{ amount: 10.74, occurredOn: "2026-10-13" }, { amount: 122.67, occurredOn: "2026-10-13" }];
  const bids: BidRow[] = [
    { externalId: "v1|940031318039|0", targetId: "t1", status: "approved", maxBid: 20, endsAt: "2026-10-29T02:14:00Z" },
    { externalId: "v1|117442448497|0", targetId: "t2", status: "approved", maxBid: 30, endsAt: "2026-10-03T19:00:00Z" },
    { externalId: "v1|333333333333|0", targetId: "t3", status: "approved", maxBid: 30, endsAt: "2026-10-30T23:00:00Z" },
  ];
  const now = new Date("2026-10-30T12:00:00Z");
  const p = plan(lines, bids, new Set(), existing, "2026-10-29", now);
  assert.equal(p.matched.length, 2, "Zizo and Mbappe Optic already in the Vault");
  assert.deepEqual(p.review.map((l) => l.itemId), ["366732479138"], "Guler: paid, older than cutoff, not in Vault");
  assert.deepEqual(p.cards.map((c) => c.line.itemId), ["137306790742"], "paid after cutoff; unpaid Mbappe waits");
  assert.deepEqual(p.bids, [
    { externalId: "v1|940031318039|0", status: "won", wonPrice: 12.5 },
    { externalId: "v1|117442448497|0", status: "lost", wonPrice: null },
  ], "cancelled order is not a win");
  assert.equal(plan(lines, bids, new Set(["137306790742-1", "366732479138-1"]), existing, "2026-10-29", now).cards.length + plan(lines, bids, new Set(["137306790742-1", "366732479138-1"]), existing, "2026-10-29", now).review.length, 0, "re-runs idempotent");
  assert.equal(plan(lines, [], new Set(), [{ amount: 10.74, occurredOn: "2026-10-01" }], "2026-10-29", now).matched.length, 0, "same cost, 9 days apart: not a match");
});

test("player, sealed, dates", () => {
  const known = ["Kylian Mbappe", "Cristiano Ronaldo", "Ronaldo (R9)", "Arda Guler", "Kudus / Simons", "Sealed box", "Vinicius Jr", "Mohamed Salah"];
  assert.equal(playerFromTitle("KYLIAN MBAPPÉ 2022-23 TOPPS STADIUM CLUB", known), "Kylian Mbappe");
  assert.equal(playerFromTitle("ARDA GÜLER 2023-24 TOPPS CHROME", known), "Arda Guler");
  assert.equal(playerFromTitle("2022 TOPPS UCL #47 CRISTIANO RONALDO", known), "Cristiano Ronaldo");
  assert.equal(playerFromTitle("2020 Topps Finest Ronaldo Footwork", known), "Cristiano Ronaldo", "unique surname");
  assert.equal(playerFromTitle("Prizm Salah Scorers Club", known), "Mohamed Salah");
  assert.equal(playerFromTitle("91283473 Savio 2022 Topps Finest PSA 10", known), null);
  assert.equal(cardFromTitle("2019-20 Panini Chronicles Soccer Hanger Cello Box").status, "sealed");
  assert.equal(nyDate("2026-10-29T02:14:17.000Z"), "2026-10-28");
  assert.equal(itemIdOf("v1|940031318039|0"), "940031318039");
  assert.equal(isCard("OEM Sony PlayStation PS1 PS One Controller Gray"), false);
  assert.equal(isCard("Seiko Lassale Men's Vintage Quartz Gold Octagon Watch Mosaic Dial"), false);
  assert.equal(isCard("2019-20 Panini Chronicles Soccer Hanger Cello Sealed Fat Pack"), true);
  assert.deepEqual(cardFromTitle("2014 Panini Prizm World Cup Ronaldo #161 PSA 9 Mint"), { status: "graded", grader: "PSA", grade: "9", year: "2014", printRun: null });
  assert.equal(cardFromTitle("Arda Guler Red Choice 71/85").printRun, 85);
  assert.equal(cardFromTitle("2023/24 Topps Chrome Yamal #64").printRun, null, "season is not a print run");
});
