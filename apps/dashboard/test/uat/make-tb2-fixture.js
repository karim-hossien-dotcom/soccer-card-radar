// TB2 UAT fixture. FULLY SYNTHETIC: made-up players, items, costs and values (does not read test/fixtures/collection.json,
// which holds live costs). Safe to screenshot.
// Cards: (1) thin_blend estimate with range + confidence (TB1 case A' numbers), (2) hand-applied estimate without range,
// (3) normal sale-comp card, (4) raw sale-comp card (band-multiple est. in PSA 9/10 scenarios).
// Usage: node test/uat/make-tb2-fixture.js /path/tb2.json   then   COLLECTION_FIXTURE=/path/tb2.json next dev --port 3100
const fs = require('fs');
const out = process.argv[2];
if (!out) { console.error('usage: make-tb2-fixture.js <out.json>'); process.exit(2); }
const today = new Date().toISOString().slice(0, 10);
const id = (n) => `00000000-0000-4000-8000-00000000000${n}`;
const card = (n, o) => ({ id: id(n), qty: 1, cert: null, submissionId: null, dateAdded: '2026-10-01', imagePath: null, notes: null, grader: null, grade: null, ...o });
const data = {
  cards: [
    card(1, { status: 'graded', grader: 'PSA', grade: '8', cert: '00000001', player: 'Test Striker', item: 'SYNTHETIC 2014 TEST SET #1 TEST STRIKER' }),
    card(2, { status: 'raw', player: 'Test Keeper', item: 'SYNTHETIC 2018 TEST CHROME #2 TEST KEEPER' }),
    card(3, { status: 'graded', grader: 'PSA', grade: '10', cert: '00000003', player: 'Test Winger', item: 'SYNTHETIC 2017 TEST CHROME #3 TEST WINGER' }),
    card(4, { status: 'raw', player: 'Test Fullback', item: 'SYNTHETIC 2018 TEST CUP #4 TEST FULLBACK' }),
  ],
  comps: [
    { cardId: id(1), grade: 'PSA 8', price: 76.74, method: 'thin_blend', source: 'estimate', asOf: today, low: 47.38, high: 120, confidence: 2 },
    { cardId: id(2), grade: 'raw', price: 55, method: 'thin_blend', source: 'estimate', asOf: today }, // no range fields at all
    { cardId: id(3), grade: 'PSA 10', price: 150, method: 'median', source: 'cardladder_manual', asOf: today },
    { cardId: id(4), grade: 'raw', price: 40, method: 'median', source: 'ebay_sold', asOf: today },
  ],
  ledger: [
    { cardId: id(1), kind: 'purchase', amount: 30, occurredOn: '2026-10-01', source: 'synthetic' },
    { cardId: id(2), kind: 'purchase', amount: 20, occurredOn: '2026-10-01', source: 'synthetic' },
    { cardId: id(3), kind: 'purchase', amount: 90, occurredOn: '2026-10-01', source: 'synthetic' },
    { cardId: id(4), kind: 'purchase', amount: 10, occurredOn: '2026-10-01', source: 'synthetic' },
  ],
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
