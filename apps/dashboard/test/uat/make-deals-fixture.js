// Copies test/fixtures/deals.test.json (150 active listings + 25 sold-stat rows from the May 2026 scans)
// with lastSeenAt moved to now, so the 48h freshness filter keeps them.
// Usage: node test/uat/make-deals-fixture.js /tmp/deals.json  then  DEALS_FIXTURE=/tmp/deals.json next dev
const fs = require('fs');
const d = JSON.parse(fs.readFileSync(__dirname + '/../fixtures/deals.test.json', 'utf8'));
const now = new Date().toISOString();
for (const l of d.listings) l.lastSeenAt = now;
// Auctions in the fixture ended in May: push end dates into the next 2-30 hours so timers render.
d.listings.forEach((l, i) => { if (l.rawData && l.rawData.isAuction) l.rawData.itemEndDate = new Date(Date.now() + (2 + (i % 28)) * 3600e3).toISOString(); });
fs.writeFileSync(process.argv[2], JSON.stringify(d));
