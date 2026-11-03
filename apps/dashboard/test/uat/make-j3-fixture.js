// J3 UAT fixture: a copy of test/fixtures/collection.json plus a `jobRuns` key (the JobRun rows the "/" panel reads).
// One complete prices run (plus an older one that must lose), one incomplete players run with 2 open, no photos run,
// 1 "take photo" item. Values below are synthetic test numbers, not prices.
// Usage: node test/uat/make-j3-fixture.js /tmp/j3.json   then   COLLECTION_FIXTURE=/tmp/j3.json next dev --port 3100
const fs = require('fs');
const out = process.argv[2];
if (!out) { console.error('usage: make-j3-fixture.js <out.json>'); process.exit(2); }
const data = JSON.parse(fs.readFileSync(__dirname + '/../fixtures/collection.json', 'utf8'));
const card = (id) => { const c = data.cards.find((x) => x.id === id); if (!c) throw new Error('fixture card missing ' + id); return { cardId: id, card: c.item }; };
const SALAH = 'a51916c1-5f83-510d-8fad-e34f161103d9', HAALAND = '71923fdc-8c93-58f0-83f6-574c0ed7f0ad',
  MBAPPE = 'f942ad31-5f1f-54ad-88fa-cb6d9bd1f585', CR7 = 'd0b437f8-eaf7-50db-9249-71ea943028bd', CAMA = 'c7933260-efa1-55f9-afd3-ed39a4d3b42b';
data.jobRuns = [
  { job: 'prices', ranAt: '2026-11-02T00:43:00Z', finishedAt: '2026-11-02T01:20:00Z', status: 'complete', openCount: 0,
    summary: 'OLDER RUN: must not show', reportPath: 'audits/2026-11-01-prices.md', changes: [], photoList: [] },
  { job: 'prices', ranAt: '2026-11-09T00:43:00Z', finishedAt: '2026-11-09T01:31:00Z', status: 'complete', openCount: 0,
    summary: 'Complete\n41 Vault cards checked; 3 values moved, 1 card added, 1 cost filled, 1 estimate.',
    reportPath: 'audits/2026-11-08-prices.md',
    changes: [
      { kind: 'value', ...card(SALAH), from: 800, to: 845, source: 'ebay_sold' },
      { kind: 'value', ...card(HAALAND), from: 310, to: 295.5, source: 'cardladder' },
      { kind: 'value', ...card(CR7), from: 150, to: 162, source: 'ebay_sold' },
      { kind: 'card_added', ...card(CAMA), source: 'psa_collection' },
      { kind: 'cost', ...card(MBAPPE), from: null, to: 0, source: 'pack_pull_assumed' },
      { kind: 'estimate', ...card(CAMA), to: 1200, source: 'card-comps estimate' },
    ],
    photoList: [{ ...card(MBAPPE), side: 'back', reason: 'no PSA/SGC/Beckett scan of the back' }] },
  { job: 'players', ranAt: '2026-11-02T18:23:00Z', finishedAt: '2026-11-02T19:02:00Z', status: 'incomplete', openCount: 2,
    summary: 'Incomplete: 2 items open\n- Yamal form: FBref blocked, verifier could not confirm minutes\n- Rookie radar: Card Ladder login expired',
    reportPath: 'research/2026-11-02-players.md', changes: [], photoList: [] },
];
fs.writeFileSync(out, JSON.stringify(data));
console.log('wrote', out);
