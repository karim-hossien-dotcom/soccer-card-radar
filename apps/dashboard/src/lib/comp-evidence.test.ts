import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compEvidence, evidenceLine, rejectedLine, dateRange, safeUrl, isMissingTable, REASON_LABEL, NO_EVIDENCE, NO_EXACT_SALE, type CompSaleRow,
} from "./comp-evidence.ts";

// Synthetic sales only (public repo): made-up titles, prices and example.com links.
const sale = (o: Partial<CompSaleRow>): CompSaleRow => ({
  compId: 1, date: "2026-11-01", price: 10, title: "SYNTHETIC CARD", source: "ebay", url: null, kept: true, rejectReason: null, ...o,
});
const comp = { id: 1, source: "ebay_sold" };

test("zero sales -> kind none with the amber text", () => {
  assert.deepEqual(compEvidence(comp, []), { kind: "none", text: NO_EVIDENCE, rejected: [] });
  assert.equal(NO_EVIDENCE, "no evidence — old value");
  // Another comp's sales do not count.
  assert.equal(compEvidence(comp, [sale({ compId: 2 })]).kind, "none");
  // A comp without an id (old fixture, pre-migration read) has no sales.
  assert.equal(compEvidence({ source: "workbook_import" }, [sale({})]).kind, "none");
});

test("only rejected sales -> kind none, same text, rejected counted", () => {
  const e = compEvidence(comp, [
    sale({ kept: false, rejectReason: "grade", price: 50 }),
    sale({ kept: false, rejectReason: "auto", price: 90, date: "2026-11-02" }),
  ]);
  assert.equal(e.kind, "none");
  assert.equal(e.kind === "none" && e.text, NO_EVIDENCE);
  assert.equal(rejectedLine(e.rejected), "2 rejected: 1 auto/relic, 1 other grade/grader");
});

test("estimate with no exact sale -> 'no exact sale — estimate'", () => {
  const e = compEvidence({ id: 1, source: "estimate" }, []);
  assert.equal(e.kind === "none" && e.text, NO_EXACT_SALE);
  assert.equal(NO_EXACT_SALE, "no exact sale — estimate");
});

test("kept + rejected -> n, range, sources, newest-first list and reason counts", () => {
  const rows = [
    sale({ date: "2026-09-02", price: 40, title: "A", source: "ebay", url: "https://example.com/a" }),
    sale({ date: "2026-11-09", price: 44, title: "B", source: "cardladder" }),
    sale({ date: "2026-08-20", price: 38, title: "C", source: "ebay" }),
    sale({ date: "2026-10-15", price: 41, title: "D", source: "ebay" }),
    sale({ date: "2026-11-10", price: 200, title: "PARALLEL", kept: false, rejectReason: "parallel" }),
    sale({ date: "2026-07-01", price: 5, title: "OLD", kept: false, rejectReason: "parallel" }),
    sale({ date: "2026-11-05", price: 39, title: "MINE", kept: false, rejectReason: "own" }),
  ];
  const e = compEvidence(comp, rows);
  assert.equal(e.kind, "sales");
  if (e.kind !== "sales") return;
  assert.equal(e.n, 4);
  assert.equal(e.from, "2026-08-20");
  assert.equal(e.to, "2026-11-09");
  assert.deepEqual(e.sources, ["ebay", "cardladder"]); // most kept sales first
  assert.deepEqual(e.kept.map((k) => k.title), ["B", "D", "A", "C"]);
  assert.ok(!e.kept.some((k) => /PARALLEL|OLD|MINE/.test(k.title)), "rejected never in the kept list");
  assert.deepEqual(e.rejected.map((r) => [r.reason, r.count]), [["parallel", 2], ["own", 1]]);
  assert.equal(evidenceLine(e), "n=4 · Aug 20 – Nov 9 · eBay, Card Ladder");
  assert.equal(rejectedLine(e.rejected), "3 rejected: 2 other parallel, 1 Karim's own sale/buy");
});

test("a kept flag with a reason is not trusted as kept (rejected never inflates n)", () => {
  const e = compEvidence(comp, [sale({}), sale({ kept: true, rejectReason: "lot", title: "LOT" })]);
  assert.equal(e.kind === "sales" && e.n, 1);
});

test("every sale-check code has a label", () => {
  assert.deepEqual(Object.keys(REASON_LABEL).sort(), ["age", "auto", "card", "grade", "lot", "own", "parallel", "unclear"]);
  assert.equal(rejectedLine([]), null);
});

test("missing CompSale table is recognised (before the migration), other errors are not", () => {
  assert.ok(isMissingTable({ code: "42P01", message: 'relation "public.CompSale" does not exist' }));
  assert.ok(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.CompSale' in the schema cache" }));
  assert.ok(!isMissingTable({ code: "42501", message: "permission denied for table CompSale" }));
  assert.ok(!isMissingTable(null));
});

test("date range and links", () => {
  assert.equal(dateRange("2026-11-09", "2026-11-09"), "Nov 9");
  assert.equal(dateRange("2025-12-20", "2026-01-09"), "Dec 20 2025 – Jan 9 2026");
  assert.equal(safeUrl("https://example.com/x"), "https://example.com/x");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl(null), null);
});
