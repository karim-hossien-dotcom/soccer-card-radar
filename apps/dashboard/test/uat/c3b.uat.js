// C3b UAT: Gixen hand-off on an approved bid (copy item # / max, Open Gixen, Add reminder). Links only, no bids.
// Needs: node test/uat/make-snipe-fixture.js $F; run with SNIPE_FIXTURE=$F set too. Dev: SNIPE_FIXTURE=$F DEALS_FIXTURE=test/fixtures/deals.test.json ADMIN_TOKEN=uat-secret next dev --port 3100
const { chromium } = require('playwright');
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const OUT = process.env.SHOT_DIR || '/tmp';
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.setItem('scr.adminToken', 'uat-secret')); await p.reload({ waitUntil: 'networkidle' });
  // Ronaldo #161 base: live auction $31, item v1|110000000001|0, ends in ~5h
  await p.click('text=2014 Panini Prizm World Cup #161 Cristiano Ronaldo (base)');
  const li = () => p.locator('li:has-text("Cristiano Ronaldo Portugal"):has(button:has-text("Approve"))');
  ok((await li().textContent()).includes('over your max'), '$31 is over the engine max before approval');
  await li().locator('input').fill('40'); await li().locator('button:has-text("Approve")').click(); await p.waitForTimeout(3000);
  const line = p.locator('li:has-text("Approved, max $40")');
  ok(await line.count() === 1, 'approved line shown');
  ok((await line.textContent()).includes('Enter it in Gixen or bid by hand.'), 'existing line kept');
  ok((await line.textContent()).includes('Item # 110000000001'), 'item # stripped from v1|…|0');
  ok(!(await line.textContent()).includes('over your max'), 'approved $40 max: $31 is not "over your max"');
  // copy: exactly the item # / max, and no network request
  const reqs = []; p.on('request', (r) => reqs.push(r.url()));
  await line.locator('button[aria-label="Copy item number"]').click();
  ok(await p.evaluate(() => navigator.clipboard.readText()) === '110000000001', 'copy item # -> clipboard');
  ok((await line.locator('button[aria-label="Copy item number"]').textContent()) === 'Copied', 'copy feedback');
  await line.locator('button[aria-label="Copy max bid"]').click();
  ok(await p.evaluate(() => navigator.clipboard.readText()) === '40', 'copy max -> clipboard');
  ok(reqs.length === 0, 'copy makes no network calls ' + reqs.join(' '));
  // links
  const gixen = line.locator('a:has-text("Open Gixen")');
  ok(await gixen.getAttribute('href') === 'https://www.gixen.com/main/home_1.php' && await gixen.getAttribute('target') === '_blank' && (await gixen.getAttribute('rel')).includes('noopener'), 'Open Gixen link, new tab, noopener');
  const href = await line.locator('a:has-text("Add reminder")').getAttribute('href');
  const q = new URL(href).searchParams;
  ok(href.startsWith('https://calendar.google.com/calendar/render?') && q.get('action') === 'TEMPLATE', 'reminder is a Calendar template');
  ok(q.get('text') === 'Snipe: 2014 Panini Prizm World Cup #161 Cristiano Ronaldo (base) max $40', 'reminder title');
  const [s, e] = q.get('dates').split('/');
  const t = (x) => Date.UTC(+x.slice(0, 4), +x.slice(4, 6) - 1, +x.slice(6, 8), +x.slice(9, 11), +x.slice(11, 13), +x.slice(13, 15));
  ok(/^\d{8}T\d{6}Z$/.test(s) && /^\d{8}T\d{6}Z$/.test(e) && t(e) - t(s) === 15 * 60e3 && Math.abs(t(e) - Date.now() - 5 * 3600e3) < 10 * 60e3, 'reminder dates endsAt-15m..endsAt UTC');
  ok(q.get('details') === 'https://www.ebay.com/itm/110000000001\neBay item # 110000000001\nMax $40', 'reminder details');
  ok(await p.locator('a[href*="gixen.com"]').count() === 1, 'one Gixen link only (no duplicate control)');
  await p.screenshot({ path: OUT + '/c3b-desktop.png', fullPage: false });
  // 390px
  await p.setViewportSize({ width: 390, height: 844 }); await p.reload({ waitUntil: 'networkidle' });
  await p.click('text=2014 Panini Prizm World Cup #161 Cristiano Ronaldo (base)');
  await p.locator('li:has-text("Approved, max $40")').scrollIntoViewIfNeeded();
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal scroll at 390px');
  await p.screenshot({ path: OUT + '/c3b-390.png', fullPage: false });
  // clean up the fixture decision
  await p.locator('li:has-text("Approved, max $40") button:has-text("Undo")').click(); await p.waitForTimeout(3000);
  ok(!JSON.parse(require('fs').readFileSync(process.env.SNIPE_FIXTURE)).bids.some((x) => x.status === 'approved'), 'undo clears the approved bid');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
})();
