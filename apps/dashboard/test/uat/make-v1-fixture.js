// V1 UAT fixture. FULLY SYNTHETIC: made-up players, items, costs and values (does not read test/fixtures/collection.json,
// which holds live costs). Safe to screenshot.
// Cards: 3 raw with PSA 10/9/8 comps, 1 raw lot with psa10 null (not gradeable), 1 at PSA, 1 graded (sealed card removed in V2).
// Usage: node test/uat/make-v1-fixture.js /path/v1.json   then   COLLECTION_FIXTURE=/path/v1.json next dev --port 3100
const fs = require('fs');
const out = process.argv[2];
if (!out) { console.error('usage: make-v1-fixture.js <out.json>'); process.exit(2); }
const today = new Date().toISOString().slice(0, 10);
const id = (n) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
const card = (n, o) => ({ id: id(n), qty: 1, cert: null, submissionId: null, dateAdded: '2026-10-01', imagePath: null, notes: null, grader: null, grade: null, ...o });
const comp = (n, grade, price) => ({ cardId: id(n), grade, price, method: 'median', source: 'ebay_sold', asOf: today });
const buy = (n, amount) => ({ cardId: id(n), kind: 'purchase', amount, occurredOn: '2026-10-01', source: 'synthetic' });
const data = {
  cards: [
    card(1, { status: 'raw', player: 'Test Alpha', item: 'SYNTHETIC 2014 TEST CUP #1 TEST ALPHA' }),
    card(2, { status: 'raw', player: 'Test Bravo', item: 'SYNTHETIC 2018 TEST CHROME #2 TEST BRAVO' }),
    card(3, { status: 'raw', player: 'Test Charlie', item: 'SYNTHETIC 2017 TEST CHROME #3 TEST CHARLIE' }),
    card(4, { status: 'raw', player: 'Test Delta', item: 'SYNTHETIC 2018 TEST NOW #4 TEST DELTA (Qty 2)' }),
    card(5, { status: 'at_grader', player: 'Test Echo', item: 'SYNTHETIC 2014 TEST SET #5 TEST ECHO', submissionId: 'SYN-0001' }),
    card(6, { status: 'graded', grader: 'PSA', grade: '9', cert: '00000106', player: 'Test Foxtrot', item: 'SYNTHETIC 2017 TEST SET #6 TEST FOXTROT' }),
  ],
  comps: [
    comp(1, 'raw', 40), comp(1, 'PSA 10', 300), comp(1, 'PSA 9', 120), comp(1, 'PSA 8', 70),
    comp(2, 'raw', 60), comp(2, 'PSA 10', 500), comp(2, 'PSA 9', 150), comp(2, 'PSA 8', 90),
    comp(3, 'raw', 30), comp(3, 'PSA 10', 200), comp(3, 'PSA 9', 90), comp(3, 'PSA 8', 55),
    comp(4, 'raw', 25), // lot (Qty 2): value engine gives no PSA 10/9/8 -> psa10 null
    comp(5, 'raw', 100), comp(5, 'PSA 10', 900), comp(5, 'PSA 9', 250), comp(5, 'PSA 8', 140),
    comp(6, 'PSA 9', 210),
  ],
  ledger: [buy(1, 20), buy(2, 35), buy(3, 15), buy(4, 10), buy(5, 130), buy(6, 150)],
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
