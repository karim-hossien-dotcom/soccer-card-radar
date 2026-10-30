// C5 UAT: fee-aware max bid on the Snipe board and the Vault drawer, desktop + 390px.
// Needs: node test/uat/make-snipe-fixture.js $F; SNIPE_FIXTURE=$F COLLECTION_FIXTURE=<copy of test/fixtures/collection.json>
// DEALS_FIXTURE=test/fixtures/deals.test.json next dev --port 3100
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots/c5';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
(async () => {
  require('fs').mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['desktop', { width: 1280, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' });
    await p.click('summary:has-text("How scoring and max bid work")');
    const note = await p.locator('li', { hasText: 'Max bid' }).first().innerText();
    ok(/13% selling fees/.test(note) && /÷ 2/.test(note) && /80% of the raw price/.test(note), `${name}: board note explains fees, multiple, raw cap`);
    // fixture Ronaldo #161 base: raw 25 -> 80% cap = $20
    const ron = p.locator('tr[aria-expanded]', { hasText: '#161 Cristiano Ronaldo (base)' });
    ok((await ron.innerText()).includes('$20'), `${name}: #161 base max bid $20 (80% of raw 25)`);
    await p.screenshot({ path: `${SHOTS}/snipe-${name}.png` });

    await p.goto('http://localhost:3100/collection', { waitUntil: 'networkidle' });
    await p.click('section[aria-label="Cards"] > button[aria-label*="Kobbie Mainoo 19/49"]');
    const drawer = await p.locator('[role=dialog]').innerText();
    ok(/Snipe max bid for another copy: \$[\d,.]+ \(expected value if graded, after selling and grading fees/.test(drawer), `${name}: Vault drawer shows max bid and explains it`);
    await p.locator('[role=dialog] p', { hasText: 'Snipe max bid' }).scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/vault-${name}.png` });
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await p.close();
  }
  await b.close();
})();
