// Builds the A4 UAT fixture from collection.json: ages all comps of 5 raw cards (stale) and adds PSA pop for 2 graded cards.
// Usage: node test/uat/make-a4-fixture.js /tmp/a4-fixture.json  (then start next dev with COLLECTION_FIXTURE pointing at it)
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(__dirname + '/../fixtures/collection.json', 'utf8'));
const aged = new Set(d.cards.filter((c) => c.status === 'raw').slice(0, 5).map((c) => c.id));
for (const c of d.comps) if (aged.has(c.cardId)) c.asOf = '2026-09-01';
const psa = d.cards.filter((c) => c.status === 'graded' && c.grader === 'PSA').slice(0, 2);
d.pops = [
  { cardId: psa[0].id, asOf: '2026-10-15', total: 812, gem10: 203, pop9: 390, gemRate: 0.2531 },
  { cardId: psa[1].id, asOf: '2026-10-15', total: 95, gem10: 12, pop9: 40, gemRate: 0.1263 },
];
fs.writeFileSync(process.argv[2], JSON.stringify(d));
