// TB2 UAT: estimate range/confidence/method in the Vault value tile and drawer "Value now" row, 1280 + 390px.
// Needs: node test/uat/make-tb2-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/tb2.uat.js
// SYNTHETIC fixture only: never run this against test/fixtures/collection.json (screenshots include the drawer).
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/TB2';
const BASE = 'http://localhost:3100';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const tile = (p, player) => p.locator('section[aria-label="Cards"] > button', { hasText: player });
const val = (p, player) => tile(p, player).locator('[class*="val"]').first();
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['1280', { width: 1280, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const r = await p.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    ok(r.status() === 200, `${name}: /collection 200`);
    ok(/SYNTHETIC/.test(await p.locator('section[aria-label="Cards"]').innerText()), `${name}: synthetic fixture loaded`);

    // Tile, scenario Now
    ok((await val(p, 'Test Striker').innerText()).replace(/\s+/g, ' ').trim() === '$77 est. 2/5', `${name}: thin_blend tile "$77 est. 2/5"`);
    ok((await val(p, 'Test Keeper').innerText()).replace(/\s+/g, ' ').trim() === '$55 est.', `${name}: hand-applied estimate tile "$55 est."`);
    ok((await val(p, 'Test Winger').innerText()).trim() === '$150' && (await val(p, 'Test Winger').locator('small').count()) === 0, `${name}: sale-comp tile unchanged "$150"`);
    ok((await val(p, 'Test Fullback').innerText()).trim() === '$40', `${name}: raw sale-comp tile unchanged "$40"`);
    for (const pl of ['Test Striker', 'Test Keeper']) {
      const h = await val(p, pl).evaluate((e) => { const lh = parseFloat(getComputedStyle(e).lineHeight); return e.getBoundingClientRect().height / (isNaN(lh) ? parseFloat(getComputedStyle(e).fontSize) * 1.2 : lh); });
      ok(h <= 2.05, `${name}: ${pl} value cell <= 2 lines (${h.toFixed(2)})`);
    }
    ok(await noOverflow(p), `${name}: no horizontal scroll`);
    await p.locator('section[aria-label="Cards"]').screenshot({ path: `${SHOTS}/tiles-${name}.png` });

    // Scenario PSA 9: band-multiple est. unchanged; estimate tag is "now" only
    await p.locator('[role=group][aria-label="Price as"] button', { hasText: 'PSA 9' }).click();
    ok((await val(p, 'Test Fullback').innerText()).replace(/\s+/g, ' ').trim() === '$60 est.', `${name}: PSA 9 band-multiple est. unchanged ($40 x 1.5)`);
    ok(!/\/5/.test(await val(p, 'Test Striker').innerText()), `${name}: PSA 9 scenario: no confidence tag on graded estimate`);
    await p.locator('[role=group][aria-label="Price as"] button', { hasText: 'Now' }).click();

    // Drawer
    const rowText = async () => (await p.locator('[role=dialog] tr', { hasText: 'Value now' }).innerText()).replace(/\s+/g, ' ').trim();
    await tile(p, 'Test Striker').click();
    ok(await rowText() === 'Value now $76.74 · $47–$120 · thin_blend · 2/5', `${name}: drawer thin_blend row`);
    ok(await noOverflow(p), `${name}: drawer no horizontal scroll`);
    await p.locator('[role=dialog]').screenshot({ path: `${SHOTS}/drawer-range-${name}.png` });
    await p.click('[role=dialog] button[aria-label=Close]');
    await tile(p, 'Test Keeper').click();
    ok(await rowText() === 'Value now $55.00 · est. · thin_blend', `${name}: drawer hand-applied row`);
    await p.locator('[role=dialog]').screenshot({ path: `${SHOTS}/drawer-no-range-${name}.png` });
    await p.click('[role=dialog] button[aria-label=Close]');
    await tile(p, 'Test Winger').click();
    ok(await rowText() === 'Value now $150.00', `${name}: drawer sale-comp row unchanged`);
    await p.locator('[role=dialog]').screenshot({ path: `${SHOTS}/drawer-sale-${name}.png` });
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await p.close();
  }
  await b.close();
})();
