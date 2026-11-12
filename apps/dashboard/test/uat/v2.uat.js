// V2 UAT (Karim 2026-11-12): Vault "Show" drops Sealed and gets "Basketball (N)"; header says "N cards".
// Needs: node test/uat/make-v2-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/v2.uat.js
// SYNTHETIC fixture only (repo is public).
// Hand totals at Now: All = 40 + 210 + 100 + 60 + 300 = $710, cost 20 + 150 + 130 + 35 + 200 = $535.
//                     Basketball = 60 + 300 = $360, cost $235.
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/V2';
const BASE = 'http://localhost:3100';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const tiles = (p) => p.locator('section[aria-label="Cards"] > [data-tile]');
const players = async (p) => (await tiles(p).allInnerTexts()).map(norm);
const showButtons = async (p) => (await p.locator('[role=group][aria-label="Show"] button').allInnerTexts()).map(norm);
const setSeg = (p, group, t) => p.locator(`[role=group][aria-label="${group}"] button`, { hasText: new RegExp(`^${t}`) }).click();
const hero = async (p) => {
  const k = p.locator('[aria-label="Collection totals"] [class*="heroKpis"] > div');
  return { value: norm(await k.nth(0).locator('b').innerText()), cost: norm(await k.nth(1).locator('b').innerText()), inView: norm(await k.nth(3).locator('b').innerText()) };
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['1280', { width: 1280, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const r = await p.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    ok(r.status() === 200, `${name}: /collection 200`);
    ok(/SYNTHETIC/.test(await p.locator('section[aria-label="Cards"]').innerText()), `${name}: synthetic fixture loaded`);

    const head = norm(await p.locator('[aria-label="Collection totals"] p').first().innerText());
    ok(head.startsWith('5 cards.') && !/sealed/i.test(head), `${name}: header "${head}"`);
    const opts = await showButtons(p);
    ok(opts.includes('Basketball (2)'), `${name}: Basketball (2) option (${opts.join(' | ')})`);
    ok(!opts.some((o) => /sealed/i.test(o)), `${name}: no Sealed option`);

    await p.waitForTimeout(800); // CountUp settles
    let h = await hero(p);
    ok((await tiles(p).count()) === 5 && h.value === '$710' && h.cost === '$535', `${name}: All shows every sport (${JSON.stringify(h)})`);
    await p.screenshot({ path: `${SHOTS}/vault-all-${name}.png`, fullPage: true });

    await setSeg(p, 'Show', 'Basketball');
    await p.waitForTimeout(800);
    const bb = await players(p);
    h = await hero(p);
    ok(bb.length === 2 && bb.every((t) => /Test Hoops/.test(t)), `${name}: Basketball shows only basketball cards (${bb.length})`);
    ok(h.value === '$360' && h.cost === '$235' && h.inView === '2', `${name}: Basketball totals (${JSON.stringify(h)})`);
    await p.screenshot({ path: `${SHOTS}/vault-basketball-${name}.png`, fullPage: true });

    await setSeg(p, 'Show', 'Raw');
    const raw = await players(p);
    ok(raw.length === 2 && raw.some((t) => /Test Alpha/.test(t)) && raw.some((t) => /Test Hoops One/.test(t)), `${name}: Raw keeps both sports`);
    await setSeg(p, 'Show', 'Graded');
    ok((await tiles(p).count()) === 2, `${name}: Graded keeps both sports`);
    await setSeg(p, 'Show', 'At PSA');
    ok((await tiles(p).count()) === 1, `${name}: At PSA`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await ctx.close();
  }
  await b.close();
})();
