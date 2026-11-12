// PC3 UAT: "Open items (N)" in the Radar home "Latest runs" panel: oldest first, age in days, closed items dropped,
// card items link to the Vault drawer; desktop 1280 + 390px.
// Needs: node test/uat/make-pc3-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/pc3.uat.js
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/PC3';
const BASE = 'http://localhost:3100';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['1280', { width: 1280, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const r = await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    ok(r.status() === 200, `${name}: "/" 200`);
    ok((await p.locator('section[aria-label="Latest runs"] > article[aria-label="Open items"]').count()) === 1, `${name}: Open items is inside the existing Latest runs panel`);
    const box = p.locator('article[aria-label="Open items"]');
    const t = await box.innerText();
    ok(/^Open items \(3\)$/m.test(t), `${name}: heading "Open items (3)"`);
    ok(!/CLOSED must not show/.test(t), `${name}: closed item dropped`);
    const items = await box.locator('li').allInnerTexts();
    ok(items.length === 3 && /oldest/.test(items[0]) && /card item/.test(items[1]) && /new item today/.test(items[2]), `${name}: oldest first`);
    ok(/\(Players, 14 days\): made-up reason A/.test(items[0]), `${name}: age 14 days + job + reason`);
    ok(/\(Prices, 3 days\)/.test(items[1]) && /\(Prices, 0 days\)/.test(items[2]), `${name}: ages 3 days, 0 days`);
    ok((await box.locator('a').count()) === 1, `${name}: only the card item is a link`);
    ok(/Complete/.test(await p.locator('article[aria-label=Prices]').innerText()), `${name}: job panels still there`);
    ok((await p.locator('main button, main form, main input').count()) === 0, `${name}: no buttons/forms (read-only)`);
    ok(await noOverflow(p), `${name}: no horizontal scroll`);
    await p.screenshot({ path: `${SHOTS}/home-open-items-${name}.png`, fullPage: true });
    await box.locator('a').click();
    await p.waitForURL(/\/collection\?card=/); await p.waitForLoadState('networkidle');
    ok(/CAMO PRIZM/.test((await p.locator('[role=dialog]').getAttribute('aria-label')) ?? ''), `${name}: card item opens that Vault drawer`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await p.close();
  }
  await b.close();
})();
