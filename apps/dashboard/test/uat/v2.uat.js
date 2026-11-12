// V2 UAT (Karim 2026-11-12): Vault "Show" drops Sealed and gets "Basketball (N)"; header says "N cards".
// Needs: node test/uat/make-v2-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/v2.uat.js
// SYNTHETIC fixture only (repo is public).
// Hand totals at Now: All = 40 + 210 + 100 + 60 + 300 = $710, cost 20 + 150 + 130 + 35 + 200 = $535.
//                     Basketball = 60 + 300 = $360, cost $235.
// V2b (Karim 2026-11-12): top bar follows the filter, or the ticked cards in the filter.
//   Basketball, tick Hoops One + Two: 2 selected $360 / $235 / +$125. Raw: Hoops One only $60 / $35 / +$25, "+1 outside";
//   Raw at PSA 10: Hoops One $500 / $35 / +$465. Clear: back to "Value now" $710 / $535.
//   Review: labels keep Price as ("1 selected · Value if PSA 10"); At PSA at PSA 10 (both ticks hidden) -> Charlie $900 / $130.
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
// CountUp sets its number in an effect after render: read until two reads 100 ms apart agree.
const hero = async (p) => {
  let prev = JSON.stringify(await heroOnce(p));
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(100); const cur = JSON.stringify(await heroOnce(p)); if (cur === prev) return JSON.parse(cur); prev = cur; }
  return JSON.parse(prev);
};
const heroOnce = async (p) => {
  const k = p.locator('[aria-label="Collection totals"] [class*="heroKpis"] > div');
  const out = k.nth(0).locator('[class*="selOut"]');
  return {
    label: norm(await k.nth(0).locator('span').first().innerText()),
    value: norm(await k.nth(0).locator('b').innerText()), cost: norm(await k.nth(1).locator('b').innerText()),
    gain: norm(await k.nth(2).locator('b').innerText()), inView: norm(await k.nth(3).locator('b').innerText()),
    outside: (await out.count()) ? norm(await out.innerText()) : '',
  };
};
const tick = (p, player) => p.locator('section[aria-label="Cards"] > [data-tile]', { hasText: player }).locator('input[type=checkbox]').check();
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

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

    // V2b: filter -> tick -> switch filter -> clear.
    await setSeg(p, 'Show', 'Basketball');
    h = await hero(p);
    ok(h.label === 'Value now' && h.value === '$360', `${name}: V2b none ticked -> filter totals (${JSON.stringify(h)})`);
    await tick(p, 'Test Hoops One');
    h = await hero(p);
    ok(h.label === '1 selected · Value now · clear' && h.value === '$60' && h.cost === '$35' && h.gain === '+$25' && !h.outside, `${name}: V2b 1 ticked in view (${JSON.stringify(h)})`);
    await tick(p, 'Test Hoops Two');
    h = await hero(p);
    ok(h.label === '2 selected · Value now · clear' && h.value === '$360' && h.cost === '$235' && h.gain === '+$125' && h.inView === '2', `${name}: V2b 2 ticked (${JSON.stringify(h)})`);
    ok((await p.locator('[aria-label="Selected cards"]').count()) === 0, `${name}: V2b no separate selection line`);
    await setSeg(p, 'Show', 'Raw');
    h = await hero(p);
    ok(h.label === '1 selected · Value now · clear' && h.value === '$60' && h.cost === '$35' && h.outside === '+1 selected outside this filter', `${name}: V2b Raw counts only the ticked card in view, notes the hidden one (${JSON.stringify(h)})`);
    await setSeg(p, 'Price as', 'PSA 10');
    h = await hero(p);
    ok(h.label === '1 selected · Value if PSA 10 · clear' && h.value === '$500' && h.gain === '+$465', `${name}: V2b selection at PSA 10 (${JSON.stringify(h)})`);
    ok(await noOverflow(p), `${name}: V2b no horizontal scroll with the outside note`);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${SHOTS}/vault-v2b-outside-${name}.png` });
    // Review (V2b): every tick hidden (At PSA = Test Charlie only) -> filter totals at PSA 10, not $0; note and clear stay.
    await setSeg(p, 'Show', 'At PSA');
    h = await hero(p);
    ok(h.label === 'Value if PSA 10 · clear' && h.value === '$900' && h.cost === '$130' && h.gain === '+$770' && h.outside === '+2 selected outside this filter', `${name}: V2b every tick hidden -> filter totals, ticks noted (${JSON.stringify(h)})`);
    await setSeg(p, 'Show', 'Raw');
    await setSeg(p, 'Price as', 'Now');
    await setSeg(p, 'Show', 'Basketball');
    h = await hero(p);
    ok(h.value === '$360' && !h.outside, `${name}: V2b switching back counts both ticks again (${JSON.stringify(h)})`);
    await setSeg(p, 'Show', 'All');
    h = await hero(p);
    ok(h.label === '2 selected · Value now · clear' && h.value === '$360' && h.cost === '$235' && h.inView === '5', `${name}: V2b All: ticks narrow the filter (${JSON.stringify(h)})`);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${SHOTS}/vault-v2b-selected-${name}.png` });
    await p.locator('[aria-label="Collection totals"] button', { hasText: /^clear$/ }).click();
    h = await hero(p);
    ok(h.label === 'Value now' && h.value === '$710' && h.cost === '$535' && !h.outside, `${name}: V2b clear -> filter totals (${JSON.stringify(h)})`);
    ok((await p.locator('section[aria-label="Cards"] input[type=checkbox]:checked').count()) === 0, `${name}: V2b clear unticks every card`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await ctx.close();
  }
  await b.close();
})();
