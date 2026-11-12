// V3a UAT (Karim 2026-11-12): the sales behind each Vault value, in the card drawer's "Price records", 1280 + 390px.
// Needs: node test/uat/make-v3-fixture.js $F; COLLECTION_FIXTURE=$F AUTH_PASSWORD= next dev --port 3100;
// then COLLECTION_FIXTURE=$F node test/uat/v3.uat.js (same path: the "Update comps" step restores the file afterwards).
// SYNTHETIC fixture only (repo is public; screenshots include the drawer and sale titles).
// Idempotent: the last step POSTs one "Update comps" row into the fixture file and puts the file back byte for byte.
// Hand totals (display only, must not move): value 40 + 300 + 25 + 35 + 60 = $460, cost 20 + 150 + 10 + 15 + 30 = $225.
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/V3';
const BASE = 'http://localhost:3100';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const tile = (p, player) => p.locator('section[aria-label="Cards"] > [data-tile] > button', { hasText: player });
const dlg = (p) => p.locator('[role=dialog]');
// "Price records" table = the table right after the h3.
const records = (p) => dlg(p).locator('h3:has-text("Price records") + table');
const rows = async (p) => (await records(p).locator('tr').allInnerTexts()).map(norm);
const AMBER = 'no evidence — old value';
const ESTIMATE = 'no exact sale — estimate';

async function open(p, player) {
  await tile(p, player).click();
  await dlg(p).waitFor();
  await p.waitForFunction(() => !/loading sales…/.test(document.querySelector('[role=dialog]')?.textContent ?? ''), null, { timeout: 10000 });
}
const close = (p) => p.click('[role=dialog] button[aria-label=Close]');
const drawerFits = (p) => dlg(p).evaluate((d) => d.scrollWidth <= d.clientWidth + 1);
// --amber (#b45309), not --loss (#c2412d, the red-orange warn).
const AMBER_RGB = 'rgb(180, 83, 9)';
const isAmber = (loc) => loc.evaluate((e, want) => getComputedStyle(e).color === want, AMBER_RGB);
// Drawer screenshot with "Price records" scrolled to the bottom of the drawer's view (the drawer scrolls itself).
const shot = async (p, opts) => {
  await dlg(p).evaluate((d) => {
    const h = [...d.querySelectorAll('h3')].find((x) => x.textContent === 'Price records');
    d.scrollTop = Math.max(0, h.offsetTop + h.offsetHeight + h.nextElementSibling.offsetHeight + 40 - d.clientHeight);
  });
  await dlg(p).screenshot(opts);
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const FIXTURE = process.env.COLLECTION_FIXTURE;
  const before = FIXTURE && fs.existsSync(FIXTURE) ? fs.readFileSync(FIXTURE) : null;
  ok(before !== null, 'COLLECTION_FIXTURE set to the fixture the server reads');
  if (before === null) { await b.close(); return; }
  for (const [name, viewport] of [['1280', { width: 1280, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const r = await p.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    ok(r.status() === 200, `${name}: /collection 200`);
    ok(/SYNTHETIC/.test(await p.locator('section[aria-label="Cards"]').innerText()), `${name}: synthetic fixture loaded`);
    await p.waitForTimeout(800); // CountUp settles
    const k = p.locator('[aria-label="Collection totals"] [class*="heroKpis"] > div');
    ok(norm(await k.nth(0).locator('b').innerText()) === '$460' && norm(await k.nth(1).locator('b').innerText()) === '$225', `${name}: totals unchanged ($460 / $225)`);

    // (a) kept + rejected
    await open(p, 'Test Evidence');
    let rs = await rows(p);
    ok(rs[0].startsWith('raw $40.00 median'), `${name}: (a) value row (${rs[0]})`);
    ok(rs[1].startsWith('n=4 · Aug 20 – Nov 9 · eBay, Card Ladder'), `${name}: (a) evidence line (${rs[1]})`);
    ok(/2 rejected: 1 Karim's own sale\/buy, 1 other parallel/.test(rs[1]), `${name}: (a) rejected counts`);
    const det = records(p).locator('details');
    ok(norm(await det.locator('summary').innerText()) === '4 sales', `${name}: (a) "4 sales" expander`);
    ok(!(await det.evaluate((d) => d.open)), `${name}: (a) list collapsed by default`);
    await det.locator('summary').click();
    const items = (await det.locator('li').allInnerTexts()).map(norm);
    ok(items.length === 4, `${name}: (a) 4 kept sales listed (${items.length})`);
    ok(items[0].startsWith('2026-11-09 $42.00') && items[3].startsWith('2026-08-20 $38.00'), `${name}: (a) newest first`);
    ok(!items.some((t) => /GOLD PARALLEL|OWNER BUY/.test(t)), `${name}: (a) rejected sales not in the kept list`);
    const links = await det.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    ok(links.length === 2 && links.every((h) => h.startsWith('https://example.com/')), `${name}: (a) title links (${links.join(', ')})`);
    ok(/Card Ladder$/.test(items[0]) && /eBay$/.test(items[3]), `${name}: (a) source per sale`);
    ok(await drawerFits(p) && await noOverflow(p), `${name}: (a) drawer not widened`);
    await shot(p, { path: `${SHOTS}/drawer-evidence-${name}.png` });
    await close(p);

    // (b) only rejected -> amber
    await open(p, 'Test Rejected');
    rs = await rows(p);
    const amberB = records(p).locator('[data-evidence=none]');
    ok(rs[1].startsWith(AMBER) && (await amberB.count()) === 1 && await isAmber(amberB), `${name}: (b) only-rejected comp amber (${rs[1]})`);
    ok(/2 rejected: 1 auto\/relic, 1 other grade\/grader/.test(rs[1]), `${name}: (b) rejected counts shown`);
    ok((await records(p).locator('details').count()) === 0, `${name}: (b) no kept list`);
    await shot(p, { path: `${SHOTS}/drawer-only-rejected-${name}.png` });
    await close(p);

    // (c) workbook_import, no sales -> amber
    await open(p, 'Test Workbook');
    rs = await rows(p);
    ok(rs[0].startsWith('raw $25.00 workbook value') && rs[1] === AMBER, `${name}: (c) workbook comp amber (${rs.join(' | ')})`);
    ok(await isAmber(records(p).locator('[data-evidence=none]')), `${name}: (c) amber colour`);
    await shot(p, { path: `${SHOTS}/drawer-no-sales-${name}.png` });
    await close(p);

    // (d) several grades + an older comp
    await open(p, 'Test Grades');
    rs = await rows(p);
    const at = (re) => rs.findIndex((t) => re.test(t));
    const iRaw = at(/^raw \$35\.00/), iOld = at(/^raw \$30\.00/), i9 = at(/^PSA 9 \$120\.00/), i10 = at(/^PSA 10 \$250\.00/);
    ok(rs[iRaw + 1].startsWith('n=2 · Oct 20 – Nov 9 · eBay, PSA APR'), `${name}: (d) newest raw evidence (${rs[iRaw + 1]})`);
    ok(rs[i9 + 1].startsWith('n=1 · Nov 1 · Card Ladder') && /4 rejected: 1 lot, 1 older than 90 days, 1 other card, 1 unclear title\/photo/.test(rs[i9 + 1]), `${name}: (d) PSA 9 evidence + card/lot/unclear/age (${rs[i9 + 1]})`);
    ok(rs[i10 + 1] === ESTIMATE && await isAmber(records(p).locator('[data-evidence=none]')), `${name}: (d) PSA 10 estimate amber "${ESTIMATE}"`);
    ok(iOld >= 0 && (iOld + 1 === rs.length || /^(raw|PSA)/.test(rs[iOld + 1])), `${name}: (d) older raw comp has no evidence line`);
    ok(!rs.some((t) => /OLD COMP SALE/.test(t)) && (await records(p).locator('[data-evidence]').count()) === 3, `${name}: (d) 3 evidence lines (one per grade)`);
    const dd = records(p).locator('tr', { hasText: 'n=2' }).locator('details');
    await dd.locator('summary').click();
    ok(await drawerFits(p) && await noOverflow(p), `${name}: (d) long title wraps, drawer not widened`);
    await shot(p, { path: `${SHOTS}/drawer-grades-${name}.png` });
    await close(p);

    // (e) owner value -> amber
    await open(p, 'Test Owner');
    rs = await rows(p);
    ok(rs[0].startsWith('raw $60.00 owner value') && rs[1] === AMBER, `${name}: (e) owner value amber`);
    await close(p);

    // Fetch error -> muted "sales not loaded" (not amber); values unchanged.
    await p.route('**/api/comps?cardId=*', (route) => route.fulfill({ status: 500, body: '{}' }));
    await open(p, 'Test Evidence');
    rs = await rows(p);
    ok(rs[1] === 'sales not loaded' && (await records(p).locator('[data-evidence]').count()) === 0, `${name}: fetch error -> "sales not loaded"`);
    ok(norm(await dlg(p).locator('tr', { hasText: 'Value now' }).innerText()) === 'Value now $40.00', `${name}: value unchanged on error`);
    await p.unroute('**/api/comps?cardId=*');
    await close(p);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await ctx.close();
  }

  // API: bad cardId -> 400; other sites -> 403.
  const ctx = await b.newContext();
  const req = ctx.request;
  ok((await req.get(`${BASE}/api/comps?cardId=nope`, { headers: { Origin: BASE } })).status() === 400, 'api: bad cardId 400');
  ok((await req.get(`${BASE}/api/comps?cardId=00000000-0000-4000-8000-000000000301`, { headers: { Origin: 'https://evil.example.com' } })).status() === 403, 'api: other site 403');

  await ctx.close();

  // Same amber in a dark-scheme browser (the app has one palette; the flag must not change colour).
  const dark = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const pd = await dark.newPage();
  await pd.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
  await open(pd, 'Test Workbook');
  ok(await isAmber(records(pd).locator('[data-evidence=none]')), `dark scheme: amber flag is ${AMBER_RGB}`);
  await dark.close();

  // AC 4: a comp saved through "Update comps" has no sales -> amber. Writes the fixture; restored in finally.
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const post = await ctx2.request.post(`${BASE}/api/comps`, { headers: { Origin: BASE }, data: { rows: [{ cardId: '00000000-0000-4000-8000-000000000301', grade: 'PSA 8', price: 70, sampleSize: 3, asOf: today }] } });
    ok(post.ok(), 'Update comps: PSA 8 row saved to the fixture');
    const p = await ctx2.newPage();
    await p.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    await open(p, 'Test Evidence');
    const rs = await rows(p);
    const i8 = rs.findIndex((t) => /^PSA 8 \$70\.00/.test(t));
    ok(i8 >= 0 && rs[i8 + 1] === AMBER, `Update comps row amber (${rs[i8 + 1]})`);
  } finally {
    fs.writeFileSync(FIXTURE, before);
    await ctx2.close();
  }
  ok(fs.readFileSync(FIXTURE).equals(before), 'fixture file restored (UAT is idempotent)');
  await b.close();
})();
