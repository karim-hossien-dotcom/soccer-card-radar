// C5 UAT: fee-aware max bid on the Snipe board and the Vault drawer, desktop + 390px.
// Needs: node test/uat/make-snipe-fixture.js $F; SNIPE_FIXTURE=$F COLLECTION_FIXTURE=$C (a copy of test/fixtures/collection.json)
// DEALS_FIXTURE=test/fixtures/deals.test.json next dev --port 3100; then SNIPE_FIXTURE=$F COLLECTION_FIXTURE=$C node test/uat/c5.uat.js
// Expected values are computed by hand from the fixtures with the C5 rule (defaults: 13% sell fee, ÷ 2, 80% raw cap, $32.99 grading).
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots/c5';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const row = (p, card) => p.locator('tr[aria-expanded]', { hasText: card });
const maxCell = async (p, card) => (await row(p, card).locator('td.num').allInnerTexts()).join(' | ');
const drawer = async (p, label) => {
  await p.goto('http://localhost:3100/collection', { waitUntil: 'networkidle' });
  const tile = p.locator(`section[aria-label="Cards"] > button[aria-label*="${label}"]`);
  ok((await tile.count()) === 1, `tile "${label}" is unique`);
  await tile.click();
  return p.locator('[role=dialog]');
};
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['desktop', { width: 1280, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' });
    await p.screenshot({ path: `${SHOTS}/snipe-${name}.png`, fullPage: true });
    await p.click('summary:has-text("How scoring and max bid work")');
    const note = await p.locator('li', { hasText: 'Max bid' }).first().innerText();
    ok(/13% selling fees/.test(note) && /\$32\.99 grading fee/.test(note) && /÷ 2/.test(note) && /80% of the raw price/.test(note), `${name}: board note explains fees, multiple, raw cap`);
    // bid = (EV after fees - grading fee) / multiple: the multiple applies to the bid, not to bid + grading fee
    ok(/grading fee plus 2× your bid/.test(note) && !/all-in cost/.test(note), `${name}: board note states what the multiple applies to`);
    ok(!/PSA 9 at 2×|PSA 10 at 4×/.test(await p.locator('body').innerText()), `${name}: no workbook max-bid wording on the board`);
    await p.locator('li', { hasText: 'Max bid' }).first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/snipe-note-${name}.png` });
    // Raw cap binds: #161 base raw 25 -> $20; #12 base raw 42 -> $33.60.
    ok((await row(p, '#161 Cristiano Ronaldo (base)').innerText()).includes('$20'), `${name}: #161 base max bid $20 (80% of raw 25)`);
    ok((await row(p, '#12 Lionel Messi (base)').innerText()).includes('$33.60'), `${name}: #12 base max bid $33.60 (80% of raw 42)`);
    // Formula binds: Haaland EV 232.40 -> (202.19 - 32.99) / 2 = 84.60; Yamal Refractor EV 631 -> 257.99 (board rounds >= $100 to "$258").
    ok((await row(p, '#74 Erling Haaland').innerText()).includes('$84.60'), `${name}: Haaland #74 max bid $84.60 (formula)`);
    ok((await row(p, 'Lamine Yamal Refractor').innerText()).includes('$258'), `${name}: Yamal Refractor max bid $258 (formula 257.99)`);
    ok(await noOverflow(p), `${name}: board has no horizontal overflow`);

    // Vault: Mainoo 19/49 (at PSA): PSA 10 618, PSA 9 206, raw sale 529 -> EV 385.30 -> 151.11.
    let d = await drawer(p, 'Kobbie Mainoo 19/49');
    let text = await d.innerText();
    ok(/Snipe max bid for another copy: \$151\.11 \(expected value if graded, after selling and grading fees/.test(text), `${name}: Vault Mainoo 19/49 max bid $151.11 with explanation`);
    await p.locator('[role=dialog] p', { hasText: 'Snipe max bid' }).scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/vault-${name}.png` });
    // Raw fallback: no raw sale, value now 209; PSA 9 178, PSA 10 550 -> EV 261.70 -> 97.34 (cap 167.20).
    d = await drawer(p, 'Black Lazer Auto Green /99');
    ok((await d.innerText()).includes('Snipe max bid for another copy: $97.34'), `${name}: Vault Bellingham Black Lazer Green /99 max bid $97.34 (raw falls back to value now)`);
    // No PSA 9 sale -> no max bid (never a guess from band multiples).
    d = await drawer(p, 'MANGA #8 RAPHINHA');
    text = await d.innerText();
    ok(!/Snipe max bid for another copy/.test(text) && /Snipe another copy/.test(text), `${name}: Vault Raphinha Manga #8 (no PSA 9 sale) shows no max bid, link stays`);
    await p.locator('[role=dialog] p', { hasText: 'Snipe another copy' }).scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/vault-no-max-${name}.png` });
    ok(await noOverflow(p), `${name}: Vault has no horizontal overflow`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await p.close();
  }

  // Assumption keys override defaults on both pages (fixtures are re-read per request).
  const SF = process.env.SNIPE_FIXTURE, CF = process.env.COLLECTION_FIXTURE;
  if (SF && CF) {
    const extra = [{ key: 'snipe_sell_fee', value: 0.1 }, { key: 'snipe_target_multiple', value: 3 }, { key: 'snipe_raw_cap', value: 0.5 }];
    const s0 = fs.readFileSync(SF, 'utf8'), c0 = fs.readFileSync(CF, 'utf8');
    try {
      const s = JSON.parse(s0); s.assumptions.push(...extra); fs.writeFileSync(SF, JSON.stringify(s));
      const c = JSON.parse(c0); c.assumptions.push(...extra); fs.writeFileSync(CF, JSON.stringify(c));
      const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
      await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' });
      await p.click('summary:has-text("How scoring and max bid work")');
      const note = await p.locator('li', { hasText: 'Max bid' }).first().innerText();
      ok(/10% selling fees/.test(note) && /÷ 3/.test(note) && /50% of the raw price/.test(note), 'override: board note shows 10%, ÷ 3, 50%');
      ok((await row(p, '#161 Cristiano Ronaldo (base)').innerText()).includes('$12.50'), 'override: #161 base $12.50 (50% of raw 25)');
      ok((await row(p, '#74 Erling Haaland').innerText()).includes('$58.72'), 'override: Haaland $58.72 ((232.40 x 0.9 - 32.99) / 3)');
      await p.screenshot({ path: `${SHOTS}/snipe-override-desktop.png` });
      // Mainoo: (385.30 x 0.9 - 32.99) / 3 = 104.59; cap 264.50
      const d = await drawer(p, 'Kobbie Mainoo 19/49');
      ok((await d.innerText()).includes('Snipe max bid for another copy: $104.59'), 'override: Vault Mainoo 19/49 $104.59');
      await p.close();
    } finally { fs.writeFileSync(SF, s0); fs.writeFileSync(CF, c0); }
  }
  await b.close();
})();
