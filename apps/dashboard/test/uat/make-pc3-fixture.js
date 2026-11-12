// PC3 UAT fixture: the J3 fixture (jobRuns) plus an `openItems` key (the OpenItem rows the "/" panel reads).
// firstSeen is relative to now so ages are stable: 14, 3 and 0 days open, plus one closed item that must not show.
// Titles and reasons are made up; no prices.
// Usage: node test/uat/make-pc3-fixture.js /tmp/pc3.json   then   COLLECTION_FIXTURE=/tmp/pc3.json next dev --port 3100
const fs = require('fs');
const { execFileSync } = require('child_process');
const out = process.argv[2];
if (!out) { console.error('usage: make-pc3-fixture.js <out.json>'); process.exit(2); }
execFileSync(process.execPath, [__dirname + '/make-j3-fixture.js', out]);
const data = JSON.parse(fs.readFileSync(out, 'utf8'));
const DAY = 86400000, now = Date.now(), ago = (d, h = 1) => new Date(now - d * DAY - h * 3600000).toISOString();
const SALAH = 'a51916c1-5f83-510d-8fad-e34f161103d9';
const it = (id, job, cardId, title, reason, days, closed) => ({
  id, job, cardId, title, reason, firstSeen: ago(days), lastSeen: ago(0, 0.5),
  closedAt: closed ? ago(0, 0.2) : null, closedHow: closed ? 'fixture: resolved' : null,
});
data.openItems = [
  it('oi-new', 'prices', null, 'FIXTURE new item today', 'made-up reason C', 0),
  it('oi-closed', 'prices', null, 'FIXTURE CLOSED must not show', '', 30, true),
  it('oi-old', 'players', null, 'FIXTURE oldest item', 'made-up reason A', 14),
  it('oi-card', 'prices', SALAH, 'FIXTURE card item', 'made-up reason B', 3),
];
fs.writeFileSync(out, JSON.stringify(data));
console.log('wrote', out);
