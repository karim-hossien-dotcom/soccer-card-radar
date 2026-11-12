// V1 UAT: per-card grade override chip on Vault tiles and the drawer, 1280 + 390px.
// Needs: node test/uat/make-v1-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/v1.uat.js
// SYNTHETIC fixture only: never run this against test/fixtures/collection.json (screenshots include tiles and the drawer).
// Hand totals ("All" view, sealed excluded), global PSA 9:
//   Alpha 120/20, Bravo 150/35, Charlie 90/15, Delta lot 25/10 (no PSA 9 -> falls back to value now), Echo at PSA 250/130,
//   Foxtrot PSA 9 slab 210/150 -> value 845, cost 360, gain +485.
//   Alpha -> PSA 10 (300), Delta -> PSA 10 (no comp): value 1000, cost 360, gain +650 (Delta's cost counts, no value/gain).
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/V1';
const BASE = 'http://localhost:3100';
const KEY = 'vault.gradeOverrides.v1';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const tile = (p, player) => p.locator('section[aria-label="Cards"] > [data-tile]', { hasText: player });
const chip = (p, player) => tile(p, player).locator('select');
const val = (p, player) => tile(p, player).locator('[class*="val"]').first();
const gainCell = (p, player) => tile(p, player).locator('[class*="nums"] > span').nth(1);
const hero = async (p) => {
  const k = p.locator('[aria-label="Collection totals"] [class*="heroKpis"] > div');
  return { label: norm(await k.nth(0).locator('span').first().innerText()), value: norm(await k.nth(0).locator('b').innerText()), cost: norm(await k.nth(1).locator('b').innerText()), gain: norm(await k.nth(2).locator('b').innerText()) };
};
const firstTile = (p) => p.locator('section[aria-label="Cards"] > [data-tile] > button').first().getAttribute('aria-label');
const setGlobal = (p, t) => p.locator('[role=group][aria-label="Price as"] button', { hasText: new RegExp(`^${t}$`) }).click();
const hydrationWatch = (p) => {
  const hyd = [];
  const re = /hydrat|did not match|server-rendered|server rendered/i;
  p.on('console', (m) => { if (m.type() === 'error' && re.test(m.text())) hyd.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => { if (re.test(String(e))) hyd.push(String(e).slice(0, 160)); });
  return hyd;
};
const gridShot = async (p, path) => {
  await p.evaluate(() => window.scrollTo(0, 0));
  const box = await p.locator('section[aria-label="Cards"]').evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }; });
  await p.screenshot({ path, fullPage: true, clip: box });
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
    await p.evaluate((k) => localStorage.removeItem(k), KEY);

    // Chip only on raw and at-PSA cards (sealed is not in "All"; checked under Sealed below).
    for (const pl of ['Test Alpha', 'Test Bravo', 'Test Charlie', 'Test Delta', 'Test Echo']) ok((await chip(p, pl).count()) === 1, `${name}: ${pl} has a chip`);
    ok((await chip(p, 'Test Foxtrot').count()) === 0, `${name}: graded card has no chip`);
    // AC8: no interactive element nested in the tile button.
    const nested = await p.evaluate(() => document.querySelectorAll('section[aria-label="Cards"] button :is(button, select, input, textarea, a, [tabindex])').length);
    ok(nested === 0, `${name}: no interactive element inside a tile button (${nested})`);

    // 1. Global PSA 9, plain totals.
    await setGlobal(p, 'PSA 9');
    let h = await hero(p);
    ok(h.label === 'Value if PSA 9' && h.value === '$845' && h.cost === '$360' && h.gain === '+$485', `${name}: plain PSA 9 totals ${JSON.stringify(h)}`);
    ok(await firstTile(p) === 'Test Echo, SYNTHETIC 2014 TEST SET #5 TEST ECHO', `${name}: PSA 9 sort: Echo first`);
    ok(norm(await chip(p, 'Test Alpha').locator('option:checked').innerText()) === 'Follow (PSA 9)', `${name}: chip shows Follow (PSA 9)`);

    // 2. Override Alpha -> 10 and Delta (psa10 null) -> 10. Drawer must not open.
    await chip(p, 'Test Alpha').selectOption('10');
    ok((await p.locator('[role=dialog]').count()) === 0, `${name}: chip change does not open the drawer`);
    ok(norm(await val(p, 'Test Alpha').innerText()) === '$300' && norm(await gainCell(p, 'Test Alpha').innerText()) === '+$280', `${name}: Alpha tile $300 / +$280`);
    ok(await firstTile(p) === 'Test Alpha, SYNTHETIC 2014 TEST CUP #1 TEST ALPHA', `${name}: Alpha moves to first by value`);
    ok(/chipOn/.test(await chip(p, 'Test Alpha').getAttribute('class')) && !/chipOn/.test(await chip(p, 'Test Bravo').getAttribute('class')), `${name}: overridden chip marked, following chip not`);
    await chip(p, 'Test Delta').selectOption('10');
    ok(norm(await val(p, 'Test Delta').innerText()) === 'no comp' && norm(await gainCell(p, 'Test Delta').innerText()) === '—', `${name}: Delta tile "no comp" / "—"`);
    h = await hero(p);
    ok(h.label === 'Value if PSA 9 · 2 overridden · reset · 1 no comp', `${name}: hero label "${h.label}"`);
    ok(h.value === '$1,000' && h.cost === '$360' && h.gain === '+$650', `${name}: hero by hand $1,000 / $360 / +$650 ${JSON.stringify(h)}`);

    // AC7 layout.
    ok(await noOverflow(p), `${name}: no horizontal scroll`);
    const geo = await tile(p, 'Test Alpha').evaluate((t) => {
      const sel = t.querySelector('select').getBoundingClientRect();
      const shot = t.querySelector('[class*="shot"]').getBoundingClientRect();
      const label = t.querySelector('[class*="label"]').getBoundingClientRect();
      const v = t.querySelector('[class*="val"]');
      const lh = parseFloat(getComputedStyle(v).lineHeight);
      const lines = v.getBoundingClientRect().height / (isNaN(lh) ? parseFloat(getComputedStyle(v).fontSize) * 1.2 : lh);
      const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return { h: sel.height, lines, coversPhoto: overlap(sel, shot), coversLabel: overlap(sel, label), inTile: sel.right <= t.getBoundingClientRect().right + 0.5 };
    });
    ok(geo.h >= 32, `${name}: chip tap target ${geo.h.toFixed(1)}px >= 32`);
    ok(geo.lines <= 2.05, `${name}: value line <= 2 lines (${geo.lines.toFixed(2)})`);
    ok(!geo.coversPhoto && !geo.coversLabel && geo.inTile, `${name}: chip clear of photo and grade label, inside the tile`);
    await gridShot(p, `${SHOTS}/tiles-overrides-${name}.png`);
    await p.locator('[aria-label="Collection totals"]').screenshot({ path: `${SHOTS}/hero-${name}.png` });

    // 4 (AC4). Drawer chip and tile chip in sync both ways.
    await tile(p, 'Test Bravo').locator('button').click();
    const dchip = p.locator('[role=dialog] select');
    ok((await dchip.count()) === 1 && norm(await dchip.locator('option:checked').innerText()) === 'Follow (PSA 9)', `${name}: drawer chip present, follows PSA 9`);
    await dchip.selectOption('8');
    await p.locator('[role=dialog]').screenshot({ path: `${SHOTS}/drawer-chip-${name}.png` });
    await p.click('[role=dialog] button[aria-label=Close]');
    ok(await chip(p, 'Test Bravo').inputValue() === '8' && norm(await val(p, 'Test Bravo').innerText()) === '$90', `${name}: drawer -> tile sync (Bravo PSA 8 $90)`);
    await chip(p, 'Test Bravo').selectOption('');
    await tile(p, 'Test Echo').locator('button').click();
    ok((await p.locator('[role=dialog] select').inputValue()) === '', `${name}: Echo drawer follows`);
    await p.click('[role=dialog] button[aria-label=Close]');
    await chip(p, 'Test Echo').selectOption('now');
    await tile(p, 'Test Echo').locator('button').click();
    ok((await p.locator('[role=dialog] select').inputValue()) === 'now', `${name}: tile -> drawer sync (Echo Now)`);
    await p.click('[role=dialog] button[aria-label=Close]');
    await chip(p, 'Test Echo').selectOption('');
    await tile(p, 'Test Foxtrot').locator('button').click();
    ok((await p.locator('[role=dialog] select').count()) === 0, `${name}: graded drawer has no chip`);
    await p.click('[role=dialog] button[aria-label=Close]');

    // 3. Reload keeps overrides (global resets to Now; the hero counts the 2 overrides there too).
    await p.reload({ waitUntil: 'networkidle' });
    ok(await chip(p, 'Test Alpha').inputValue() === '10' && await chip(p, 'Test Delta').inputValue() === '10', `${name}: overrides persist after reload`);
    await setGlobal(p, 'PSA 9');
    h = await hero(p);
    ok(h.value === '$1,000' && /2 overridden/.test(h.label), `${name}: after reload hero $1,000, 2 overridden`);

    // 4. Reset -> plain PSA 9 totals, and stays cleared after a reload.
    await p.locator('[aria-label="Collection totals"] button', { hasText: 'reset' }).click();
    h = await hero(p);
    ok(h.label === 'Value if PSA 9' && h.value === '$845' && h.gain === '+$485', `${name}: reset -> plain PSA 9 totals`);
    ok(await p.evaluate((k) => localStorage.getItem(k), KEY) === null, `${name}: reset clears the storage key`);
    await p.reload({ waitUntil: 'networkidle' });
    ok(await chip(p, 'Test Alpha').inputValue() === '', `${name}: still cleared after reload`);

    // Sealed: no chip.
    await p.locator('[role=group][aria-label="Show"] button', { hasText: 'Sealed' }).click();
    ok((await tile(p, 'Test Golf').count()) === 1 && (await chip(p, 'Test Golf').count()) === 0, `${name}: sealed card has no chip`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await ctx.close();

    // 6 (AC6). No hydration warning with overrides already in storage (and a corrupt value is tolerated).
    for (const stored of ['{"00000000-0000-4000-8000-000000000101":"10"}', 'garbage']) {
      const c2 = await b.newContext({ viewport });
      await c2.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, stored]);
      const p2 = await c2.newPage();
      const hyd = hydrationWatch(p2);
      const e2 = []; p2.on('pageerror', (e) => e2.push(String(e)));
      await p2.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
      const want = stored === 'garbage' ? '' : '10';
      ok(await chip(p2, 'Test Alpha').inputValue() === want, `${name}: stored ${stored.slice(0, 12)}… -> Alpha chip "${want}"`);
      ok(!hyd.length && !e2.length, `${name}: no hydration warning or error (stored ${stored.slice(0, 12)}…) ${hyd.concat(e2).join('; ')}`);
      await c2.close();
    }

    // 5 (AC5). localStorage throws: page loads, overrides work for the session, gone after reload.
    const c3 = await b.newContext({ viewport, reducedMotion: 'reduce' });
    await c3.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }); });
    const p3 = await c3.newPage();
    const e3 = []; p3.on('pageerror', (e) => e3.push(String(e)));
    await p3.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    await setGlobal(p3, 'PSA 9');
    await chip(p3, 'Test Alpha').selectOption('10');
    // 845 - Alpha PSA 9 120 + Alpha PSA 10 300 = 1025
    ok(norm(await val(p3, 'Test Alpha').innerText()) === '$300' && (await hero(p3)).value === '$1,025', `${name}: storage throws: override works ($1,025)`);
    await p3.locator('[aria-label="Collection totals"] button', { hasText: 'reset' }).click();
    ok((await hero(p3)).value === '$845', `${name}: storage throws: reset works`);
    await chip(p3, 'Test Alpha').selectOption('10');
    await p3.reload({ waitUntil: 'networkidle' });
    ok(await chip(p3, 'Test Alpha').inputValue() === '', `${name}: storage throws: override gone after reload (session only)`);
    ok(!e3.length, `${name}: storage throws: no page errors ${e3.join('; ')}`);
    await c3.close();
  }
  await b.close();
})();
