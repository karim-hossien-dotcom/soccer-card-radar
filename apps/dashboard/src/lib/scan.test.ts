import { test } from "node:test";
import assert from "node:assert/strict";
import { runScan, toListing, type EbayItem, type ListingRow } from "./scan.ts";

const action = (id: string, player: string, lane: "rookie" | "steal" | "legacy", searchQueries: string[]) =>
  ({ id, player, lane, searchQueries, signal: "BUY", soldData: null, stats: null, reasoning: "", catalyst: "", timeframe: "", photo: "" }) as never;
const item = (id: string, title: string, price: string, extra: EbayItem = {}): EbayItem =>
  ({ itemId: id, title, price: { value: price, currency: "USD" }, itemWebUrl: `https://ebay.com/itm/${id}`, buyingOptions: ["FIXED_PRICE", "BEST_OFFER"], ...extra });
const keep = (t: string) => !/lot|box/i.test(t);

test("toListing: filters and maps", () => {
  const a = action("a1", "Lamine Yamal", "rookie", []);
  const row = toListing(item("1", "2024 Topps Chrome Lamine Yamal Auto /50", "250"), a, "2026-10-16T00:00:00Z", keep)!;
  assert.equal(row.priceUSD, 250);
  assert.equal(row.lane, "rookie");
  assert.deepEqual([row.rawData.isBIN, row.rawData.acceptsOffers, row.rawData.isAuction], [true, true, false]);
  assert.equal(toListing(item("2", "Yamal hobby box", "100"), a, "", keep), null, "quality gate");
  assert.equal(toListing(item("3", "Lamine Yamal Auto /5", "1500"), a, "", keep), null, "rookie cap $1,000");
  assert.equal(toListing(item("4", "Pedri Auto /25", "100"), a, "", keep), null, "surname missing");
  assert.equal(toListing(item("5", "Lamine Yamal Auto /25", "0"), a, "", keep), null, "no price");
  assert.ok(toListing(item("6", "Messi Auto /5", "4500"), action("l", "Lionel Messi", "legacy", []), "", keep), "legacy cap $5,000");
});

test("runScan: call cap, dedupe within a page, new vs updated counts", async () => {
  const saved: ListingRow[][] = [];
  const known = new Set(["1"]);
  const r = await runScan(
    [action("a1", "Lamine Yamal", "rookie", ["q1", "q2"]), action("a2", "Cole Palmer", "steal", ["q3"])],
    {
      search: async (q) => (q === "q1" ? [item("1", "Lamine Yamal Auto /10", "300"), item("2", "Lamine Yamal Auto /25", "200"), item("2", "Lamine Yamal Auto /25", "200"), item("9", "Yamal lot", "20")] : []),
      save: async (rows) => { saved.push(rows); return rows.filter((x) => !known.has(x.externalId)).length; },
      keep,
    },
    2,
  );
  assert.deepEqual(r, { apiCalls: 2, queries: 3, imported: 1, updated: 1, skipped: 1, capped: true });
  assert.deepEqual(saved.map((b) => b.map((x) => x.externalId)), [["1", "2"]]);
});
