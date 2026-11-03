// J2 + J3 UAT: Vault deep link (/collection?card=<id>) and the "Latest runs" panel at "/", desktop 1280 + 390px.
// Needs: node test/uat/make-j3-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/j3.uat.js
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/J3';
const BASE = 'http://localhost:3100';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const SALAH = 'a51916c1-5f83-510d-8fad-e34f161103d9';
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['1280', { width: 1280, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));

    // J2: deep link opens the drawer; bad id = normal grid; close works.
    let r = await p.goto(`${BASE}/collection?card=${SALAH}`, { waitUntil: 'networkidle' });
    ok(r.status() === 200, `${name}: /collection?card=<id> 200`);
    const d = p.locator('[role=dialog]');
    ok((await d.count()) === 1 && /CAMO PRIZM/.test(await d.getAttribute('aria-label')), `${name}: J2 deep link opens the Salah Camo drawer`);
    await p.screenshot({ path: `${SHOTS}/vault-deeplink-${name}.png` });
    await p.click('[role=dialog] button[aria-label=Close]');
    ok((await p.locator('[role=dialog]').count()) === 0, `${name}: J2 drawer closes`);
    await p.goto(`${BASE}/collection?card=not-a-card`, { waitUntil: 'networkidle' });
    ok((await p.locator('[role=dialog]').count()) === 0 && (await p.locator('section[aria-label="Cards"] > button').count()) > 10, `${name}: J2 unknown id shows the normal grid`);

    // J3: panel at "/"
    r = await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    ok(r.status() === 200 && new URL(p.url()).pathname === '/', `${name}: "/" is a page (no redirect to /snipe)`);
    const prices = p.locator('article[aria-label=Prices]'), players = p.locator('article[aria-label=Players]'), photos = p.locator('article[aria-label=Photos]');
    const pt = await prices.innerText();
    ok(/^Complete$/m.test(pt) && !/OLDER RUN/.test(pt), `${name}: Prices shows newest run, Complete`);
    ok(/Ran Sun, Nov 8, 2026, 7:43 PM EST/.test(pt), `${name}: run time in ET, absolute`);
    ok(/3 values, 1 card added, 1 cost, 1 estimate; 1 to photograph/.test(pt), `${name}: counts per kind`);
    ok(/Report: audits\/2026-11-08-prices\.md/.test(pt) && (await prices.locator('a[href*="claude.ai"]').count()) === 0, `${name}: reportPath as text`);
    ok(!(await prices.locator('details').evaluate((e) => e.open)), `${name}: changes collapsed by default`);
    ok(/Take photo/.test(pt) && /\(back\): no PSA\/SGC\/Beckett scan/.test(pt), `${name}: Take photo list shown`);
    const plt = await players.innerText();
    ok(/Incomplete: 2 open/.test(plt) && /FBref blocked/.test(plt) && !/Take photo/.test(plt), `${name}: Players incomplete, 2 open, no photo list`);
    ok(/No run logged yet/.test(await photos.innerText()), `${name}: Photos "No run logged yet"`);
    ok((await p.locator('main button, main form, main input').count()) === 0, `${name}: no buttons/forms on the panel`);
    ok(await noOverflow(p), `${name}: no horizontal scroll (collapsed)`);
    await p.screenshot({ path: `${SHOTS}/home-collapsed-${name}.png`, fullPage: true });
    await prices.locator('summary').click();
    const changes = await prices.locator('details').innerText();
    ok(/\$800\.00 → \$845\.00/.test(changes) && /ebay_sold/.test(changes), `${name}: value row shows old -> new with source`);
    ok(/— → \$0\.00/.test(changes) && /pack_pull_assumed/.test(changes), `${name}: cost row shows old -> new with source`);
    ok(await noOverflow(p), `${name}: no horizontal scroll (expanded)`);
    await p.screenshot({ path: `${SHOTS}/home-expanded-${name}.png`, fullPage: true });
    await prices.locator('details a', { hasText: 'CAMO PRIZM' }).click();
    await p.waitForURL(/\/collection\?card=/); await p.waitForLoadState('networkidle');
    ok(/CAMO PRIZM/.test((await p.locator('[role=dialog]').getAttribute('aria-label')) ?? ''), `${name}: clicking a change opens that Vault drawer`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await p.close();
  }
  // Smoke: other tabs still 200
  const p = await b.newPage();
  for (const path of ['/snipe', '/dips', '/collection', '/grading']) {
    const r = await p.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    ok(r.status() === 200, `smoke ${path} 200`);
  }
  await b.close();
})();
