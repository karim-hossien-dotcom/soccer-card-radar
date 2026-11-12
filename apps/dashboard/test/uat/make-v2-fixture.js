// V2 UAT fixture. FULLY SYNTHETIC: made-up players, items, costs and values. Safe to screenshot.
// Cards: 3 soccer (raw, graded, at PSA) + 2 basketball (raw, graded). No sealed rows (V2 removed them).
// Usage: node test/uat/make-v2-fixture.js /path/v2.json   then   COLLECTION_FIXTURE=/path/v2.json next dev --port 3100
const fs = require('fs');
const out = process.argv[2];
if (!out) { console.error('usage: make-v2-fixture.js <out.json>'); process.exit(2); }
const today = new Date().toISOString().slice(0, 10);
const id = (n) => `00000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`;
const card = (n, o) => ({ id: id(n), qty: 1, cert: null, submissionId: null, dateAdded: '2026-10-01', imagePath: null, notes: null, grader: null, grade: null, sport: 'soccer', ...o });
const comp = (n, grade, price) => ({ cardId: id(n), grade, price, method: 'median', source: 'ebay_sold', asOf: today });
const buy = (n, amount) => ({ cardId: id(n), kind: 'purchase', amount, occurredOn: '2026-10-01', source: 'synthetic' });
const data = {
  cards: [
    card(1, { status: 'raw', player: 'Test Alpha', item: 'SYNTHETIC 2014 TEST CUP #1 TEST ALPHA' }),
    card(2, { status: 'graded', grader: 'PSA', grade: '9', cert: '00000202', player: 'Test Bravo', item: 'SYNTHETIC 2018 TEST CHROME #2 TEST BRAVO' }),
    card(3, { status: 'at_grader', player: 'Test Charlie', item: 'SYNTHETIC 2017 TEST SET #3 TEST CHARLIE', submissionId: 'SYN-0002' }),
    card(4, { status: 'raw', sport: 'basketball', player: 'Test Hoops One', item: 'SYNTHETIC 2019 TEST HOOPS #4 TEST HOOPS ONE' }),
    card(5, { status: 'graded', sport: 'basketball', grader: 'PSA', grade: '10', cert: '00000205', player: 'Test Hoops Two', item: 'SYNTHETIC 2020 TEST HOOPS #5 TEST HOOPS TWO' }),
  ],
  comps: [
    comp(1, 'raw', 40), comp(1, 'PSA 10', 300), comp(1, 'PSA 9', 120), comp(1, 'PSA 8', 70),
    comp(2, 'PSA 9', 210),
    comp(3, 'raw', 100), comp(3, 'PSA 10', 900), comp(3, 'PSA 9', 250), comp(3, 'PSA 8', 140),
    comp(4, 'raw', 60), comp(4, 'PSA 10', 500), comp(4, 'PSA 9', 150), comp(4, 'PSA 8', 90),
    comp(5, 'PSA 10', 300),
  ],
  ledger: [buy(1, 20), buy(2, 150), buy(3, 130), buy(4, 35), buy(5, 200)],
  assumptions: Object.entries({
    fee_to_grade_a_raw_in_hand_card: 25,
    psa_10_psa_9_multiple_no_psa_10_comp: 2, psa_9_psa_10_multiple_no_psa_9_comp: 0.5, psa_8_psa_9_multiple_no_psa_8_comp: 0.6,
    band_rare_25_or_less_ssp_psa10: 4, band_rare_25_or_less_ssp_psa9: 2, band_raw_100_psa10: 3, band_raw_100_psa9: 1.5,
    band_raw_25_100_psa10: 3, band_raw_25_100_psa9: 1.5, band_raw_under_25_psa10: 3, band_raw_under_25_psa9: 1.5,
  }).map(([key, value]) => ({ key, value })),
  snapshots: [],
  pops: [],
};
// Card 1 has no sport field at all: an old fixture / pre-migration row must read as soccer.
delete data.cards[0].sport;
fs.writeFileSync(out, JSON.stringify(data));
console.log('wrote', out);
