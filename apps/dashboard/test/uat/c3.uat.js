// C3 UAT: approve queue + budget on the snipe board (fixture budget $100).
// Needs: node test/uat/make-snipe-fixture.js $F; SNIPE_FIXTURE=$F ADMIN_TOKEN=uat-secret next dev --port 3100
const { chromium } = require('playwright');
const fs = require('fs');
const F = process.env.SNIPE_FIXTURE;
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.setItem('scr.adminToken', 'uat-secret')); await p.reload({ waitUntil: 'networkidle' });
  ok((await p.textContent('body')).includes('Budget $100 left of $100'), 'budget line shows full $100');
  // open the Ronaldo #161 base row (live auction $31)
  await p.click('text=2014 Panini Prizm World Cup #161 Cristiano Ronaldo (base)');
  const bid = p.locator('li:has-text("auction") >> nth=0');
  ok(await bid.locator('button:has-text("Approve")').count() === 1, 'auction row has Approve');
  // over budget is refused by the server
  await bid.locator('input').fill('150'); await bid.locator('button:has-text("Approve")').click(); await p.waitForTimeout(800);
  ok((await bid.textContent()).includes('Only $100.00 left'), 'approve over budget refused with message');
  await bid.locator('input').fill('40'); await bid.locator('button:has-text("Approve")').click(); await p.waitForTimeout(1500);
  ok((await p.textContent('body')).includes('Budget $60 left of $100'), 'approved $40 -> $60 left');
  ok((await p.textContent('body')).includes('Approved, max $40'), 'decision shown on the listing');
  ok(JSON.parse(fs.readFileSync(F)).bids.some((x) => x.status === 'approved' && x.maxBid === 40), 'decision stored');
  await p.locator('li:has-text("Approved, max $40") button:has-text("Undo")').click(); await p.waitForTimeout(1500);
  ok((await p.textContent('body')).includes('Budget $100 left of $100'), 'undo frees the budget');
  // skip
  await p.locator('li:has-text("auction") >> nth=0').locator('button:has-text("Skip")').click(); await p.waitForTimeout(1500);
  ok((await p.textContent('body')).includes('Skipped.'), 'skip recorded');
  // API guards
  const r1 = await p.request.post('http://localhost:3100/api/snipe/bids', { data: { action: 'approve', externalId: 'v1|uat1|0', maxBid: 10 } });
  ok(r1.status() === 401, 'no token -> 401');
  const r2 = await p.request.post('http://localhost:3100/api/snipe/bids', { headers: { 'x-admin-token': 'uat-secret' }, data: { action: 'approve', externalId: 'v1|uat1|0', maxBid: 10, endsAt: '2020-01-01T00:00:00Z' } });
  ok(r2.status() === 400 && (await r2.json()).error.includes('already ended'), 'ended auction refused');
  // 390px
  await p.setViewportSize({ width: 390, height: 844 }); await p.reload({ waitUntil: 'networkidle' });
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal scroll at 390px');
  await p.screenshot({ path: process.env.SHOT || '/tmp/c3.png', fullPage: false });
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
