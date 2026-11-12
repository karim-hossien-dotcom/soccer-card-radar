// V3a UAT fixture. FULLY SYNTHETIC: made-up players, items, costs, values, sale titles; links are example.com only.
// Safe to screenshot (public repo). Cards (ticket test plan):
//   (a) Test Evidence   raw, raw comp: 3 kept eBay + 1 kept Card Ladder, 2 rejected (parallel, own)
//   (b) Test Rejected   PSA 10, comp with only rejected sales (grade, auto) -> amber
//   (c) Test Workbook   raw, workbook_import comp, no sales -> amber
//   (d) Test Grades     raw, comps at raw (newest + an older one with sales), PSA 9 (kept + card/lot/unclear/age
//                       rejected), PSA 10 thin_blend estimate with no sale -> amber "no exact sale — estimate"
//   (e) Test Owner      raw, owner_set comp, no sales -> amber
// Every sale-check code (card, parallel, auto, grade, lot, own, unclear, age) appears at least once.
// Usage: node test/uat/make-v3-fixture.js /path/v3.json   then   COLLECTION_FIXTURE=/path/v3.json next dev --port 3100
const fs = require('fs');
const out = process.argv[2];
if (!out) { console.error('usage: make-v3-fixture.js <out.json>'); process.exit(2); }
const id = (n) => `00000000-0000-4000-8000-0000000003${String(n).padStart(2, '0')}`;
const card = (n, o) => ({ id: id(n), qty: 1, cert: null, submissionId: null, dateAdded: '2026-10-01', imagePath: null, notes: null, grader: null, grade: null, sport: 'soccer', ...o });
const comp = (cid, n, grade, price, asOf, o = {}) => ({ id: cid, cardId: id(n), grade, price, method: 'median', source: 'ebay_sold', asOf, ...o });
const kept = (compId, date, price, title, source = 'ebay', url = null) => ({ compId, date, price, title, source, url, kept: true, rejectReason: null });
const rej = (compId, date, price, title, rejectReason, source = 'ebay') => ({ compId, date, price, title, source, url: null, kept: false, rejectReason });
const buy = (n, amount) => ({ cardId: id(n), kind: 'purchase', amount, occurredOn: '2026-10-01', source: 'synthetic' });
const LONG = 'SYNTHETIC 2018 TEST CHROME #7 TEST GRADES BASE CARD NM-MT CENTERED SHARP CORNERS CLEAN BACK FRESH FROM PACK NO CREASES ' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const data = {
  cards: [
    card(1, { status: 'raw', player: 'Test Evidence', item: 'SYNTHETIC 2014 TEST CUP #1 TEST EVIDENCE' }),
    card(2, { status: 'graded', grader: 'PSA', grade: '10', cert: '00000302', player: 'Test Rejected', item: 'SYNTHETIC 2018 TEST CUP #2 TEST REJECTED' }),
    card(3, { status: 'raw', player: 'Test Workbook', item: 'SYNTHETIC 2017 TEST CHROME #3 TEST WORKBOOK' }),
    card(4, { status: 'raw', player: 'Test Grades', item: 'SYNTHETIC 2018 TEST CHROME #4 TEST GRADES' }),
    card(5, { status: 'raw', player: 'Test Owner', item: 'SYNTHETIC 2019 TEST SET #5 TEST OWNER' }),
  ],
  comps: [
    comp(301, 1, 'raw', 40, '2026-11-10'),
    comp(311, 2, 'PSA 10', 300, '2026-11-10'),
    comp(321, 3, 'raw', 25, '2026-11-01', { method: 'value_used', source: 'workbook_import' }),
    comp(340, 4, 'raw', 30, '2026-10-01'),
    comp(341, 4, 'raw', 35, '2026-11-09'),
    comp(342, 4, 'PSA 9', 120, '2026-11-09'),
    comp(343, 4, 'PSA 10', 250, '2026-11-09', { method: 'thin_blend', source: 'estimate', low: 180, high: 320, confidence: 2 }),
    comp(351, 5, 'raw', 60, '2026-11-08', { method: 'value_used', source: 'owner_set' }),
  ],
  compSales: [
    // (a) raw comp 301: n=4, Aug 20 – Nov 9, eBay + Card Ladder; 2 rejected.
    kept(301, '2026-08-20', 38, 'SYNTHETIC 2014 TEST CUP #1 TEST EVIDENCE RAW', 'ebay', 'https://example.com/sale/a1'),
    kept(301, '2026-09-15', 40, 'SYNTHETIC TEST CUP TEST EVIDENCE #1 BASE', 'ebay', 'https://example.com/sale/a2'),
    kept(301, '2026-10-30', 41, 'SYNTHETIC #1 TEST EVIDENCE 2014 CUP', 'ebay'),
    kept(301, '2026-11-09', 42, 'SYNTHETIC 2014 TEST CUP TEST EVIDENCE', 'cardladder'),
    rej(301, '2026-11-05', 400, 'SYNTHETIC 2014 TEST CUP #1 TEST EVIDENCE GOLD PARALLEL', 'parallel'),
    rej(301, '2026-11-02', 39, 'SYNTHETIC 2014 TEST CUP #1 TEST EVIDENCE (OWNER BUY)', 'own'),
    // (b) PSA 10 comp 311: only rejected -> amber.
    rej(311, '2026-11-01', 150, 'SYNTHETIC TEST REJECTED PSA 9', 'grade'),
    rej(311, '2026-11-03', 900, 'SYNTHETIC TEST REJECTED AUTO PSA 10', 'auto'),
    // (d) older raw comp 340: has sales, but it is not the comp behind the value -> no evidence line.
    kept(340, '2026-09-01', 29, 'SYNTHETIC OLD COMP SALE ONE', 'ebay'),
    kept(340, '2026-09-20', 31, 'SYNTHETIC OLD COMP SALE TWO', 'ebay'),
    // (d) newest raw comp 341: n=2, one with a very long title (wrap test).
    kept(341, '2026-11-09', 36, LONG, 'ebay', 'https://example.com/sale/d1'),
    kept(341, '2026-10-20', 34, 'SYNTHETIC 2018 TEST CHROME #4 TEST GRADES', 'psa_apr'),
    // (d) PSA 9 comp 342: n=1, rejected card, lot, unclear, age.
    kept(342, '2026-11-01', 120, 'SYNTHETIC TEST GRADES PSA 9', 'cardladder'),
    rej(342, '2026-11-02', 15, 'SYNTHETIC TEST GRADES #99 OTHER CARD PSA 9', 'card'),
    rej(342, '2026-11-03', 300, 'SYNTHETIC LOT OF 3 TEST GRADES PSA 9', 'lot'),
    rej(342, '2026-11-04', 90, 'SYNTHETIC TEST ?? PSA', 'unclear'),
    rej(342, '2026-06-01', 80, 'SYNTHETIC TEST GRADES PSA 9 OLD', 'age'),
  ],
  ledger: [buy(1, 20), buy(2, 150), buy(3, 10), buy(4, 15), buy(5, 30)],
  assumptions: Object.entries({
    fee_to_grade_a_raw_in_hand_card: 25,
    psa_10_psa_9_multiple_no_psa_10_comp: 2, psa_9_psa_10_multiple_no_psa_9_comp: 0.5, psa_8_psa_9_multiple_no_psa_8_comp: 0.6,
    band_rare_25_or_less_ssp_psa10: 4, band_rare_25_or_less_ssp_psa9: 2, band_raw_100_psa10: 3, band_raw_100_psa9: 1.5,
    band_raw_25_100_psa10: 3, band_raw_25_100_psa9: 1.5, band_raw_under_25_psa10: 3, band_raw_under_25_psa9: 1.5,
  }).map(([key, value]) => ({ key, value })),
  snapshots: [],
  pops: [],
};
fs.writeFileSync(out, JSON.stringify(data));
console.log('wrote', out);
