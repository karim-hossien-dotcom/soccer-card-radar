// V1 UAT (rework per Karim 2026-11-11): tiny select checkbox on every Vault tile; checked cards add up in the totals area.
// Needs: node test/uat/make-v1-fixture.js $F; COLLECTION_FIXTURE=$F next dev --port 3100; then node test/uat/v1.uat.js
// SYNTHETIC fixture only: never run this against test/fixtures/collection.json (screenshots include tiles and totals).
// Hand totals for Echo (at PSA 100 / 900 / 130 cost), Alpha (raw 40 / 300 / 20), Delta (raw lot 25 / psa10 null / 10):
//   Now:    value 165, cost 160, gain +5
//   PSA 10: value 300 + 900 + 25 (Delta falls back to value now, as its tile does) = 1225, cost 160, gain +1065
const fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || 'docs/backlog/uat/V1';
const BASE = 'http://localhost:3100';
const KEY = 'vault.selection.v1';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const tile = (p, player) => p.locator('section[aria-label="Cards"] > [data-tile]', { hasText: player });
const box = (p, player) => tile(p, player).locator('input[type=checkbox]');
const val = (p, player) => tile(p, player).locator('[class*="val"]').first();
const sum = (p) => p.locator('[aria-label="Collection totals"] [aria-label="Selected cards"]');
const sumText = async (p) => ((await sum(p).count()) ? norm(await sum(p).innerText()) : '');
const hero = async (p) => {
  const k = p.locator('[aria-label="Collection totals"] [class*="heroKpis"] > div');
  return { value: norm(await k.nth(0).locator('b').innerText()), cost: norm(await k.nth(1).locator('b').innerText()), gain: norm(await k.nth(2).locator('b').innerText()) };
};
const setSeg = (p, group, t) => p.locator(`[role=group][aria-label="${group}"] button`, { hasText: new RegExp(`^${t}`) }).click();
const hydrationWatch = (p) => {
  const hyd = [];
  const re = /hydrat|did not match|server-rendered|server rendered/i;
  p.on('console', (m) => { if (m.type() === 'error' && re.test(m.text())) hyd.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => { if (re.test(String(e))) hyd.push(String(e).slice(0, 160)); });
  return hyd;
};
const SEL10 = '3 selected · Value $1,225 · Cost $160 · Gain +$1,065 · clear';
const SELNOW = '3 selected · Value $165 · Cost $160 · Gain +$5 · clear';

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['1280', { width: 1280, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const hyd = hydrationWatch(p);
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const r = await p.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    ok(r.status() === 200, `${name}: /collection 200`);
    ok(/SYNTHETIC/.test(await p.locator('section[aria-label="Cards"]').innerText()), `${name}: synthetic fixture loaded`);

    // Every tile has exactly one checkbox, none nested in the open button; the old grade chip is gone.
    const counts = await p.evaluate(() => {
      const tiles = [...document.querySelectorAll('section[aria-label="Cards"] > [data-tile]')];
      return {
        tiles: tiles.length,
        withBox: tiles.filter((t) => t.querySelectorAll(':scope > label > input[type=checkbox]').length === 1).length,
        nested: document.querySelectorAll('section[aria-label="Cards"] button :is(button, select, input, textarea, a, [tabindex])').length,
        selects: document.querySelectorAll('section[aria-label="Cards"] select').length,
        oldKey: localStorage.getItem('vault.gradeOverrides.v1'),
      };
    });
    ok(counts.tiles === 6 && counts.withBox === 6, `${name}: every tile (raw, at PSA, graded) has a checkbox (${counts.withBox}/${counts.tiles})`);
    ok(counts.nested === 0 && counts.selects === 0, `${name}: no control inside a tile button, no grade chip (${counts.nested}, ${counts.selects})`);
    ok((await sumText(p)) === '', `${name}: no selection -> no summary`);
    ok(await noOverflow(p), `${name}: no horizontal scroll (no selection)`);
    await p.screenshot({ path: `${SHOTS}/vault-none-${name}.png`, fullPage: true });

    // Checkbox geometry: tap area >= 32px, box visually small, in the tile's top corner, clear of the item text.
    const geo = await tile(p, 'Test Alpha').evaluate((t) => {
      const lab = t.querySelector(':scope > label').getBoundingClientRect();
      const inp = t.querySelector('input[type=checkbox]').getBoundingClientRect();
      const tr = t.getBoundingClientRect();
      const set = t.querySelector('[class*="labelSet"]').getBoundingClientRect();
      return { w: lab.width, h: lab.height, bw: inp.width, dx: inp.left - tr.left, dy: inp.top - tr.top, clear: set.left >= lab.right - 0.5 };
    });
    ok(geo.w >= 32 && geo.h >= 32, `${name}: tap area ${geo.w.toFixed(0)}x${geo.h.toFixed(0)} >= 32`);
    ok(geo.bw <= 18 && geo.dx < 24 && geo.dy < 24, `${name}: box ${geo.bw.toFixed(0)}px in the top-left corner`);
    ok(geo.clear, `${name}: checkbox does not cover the item text`);

    // Filter At PSA, tick Echo; clicking the box never opens the drawer.
    await setSeg(p, 'Show', 'At PSA');
    await tile(p, 'Test Echo').locator(':scope > label').click();
    ok((await p.locator('[role=dialog]').count()) === 0, `${name}: checkbox click does not open the drawer`);
    ok(await box(p, 'Test Echo').isChecked(), `${name}: Echo checked`);
    ok((await sumText(p)).startsWith('1 selected · Value $100'), `${name}: 1 selected at Now: "${await sumText(p)}"`);
    // Filter Raw, tick Alpha and Delta (selection survives the filter change).
    await setSeg(p, 'Show', 'Raw');
    await box(p, 'Test Alpha').check();
    await box(p, 'Test Delta').check();
    ok((await sumText(p)) === SELNOW, `${name}: 3 selected at Now by hand: "${await sumText(p)}"`);
    // Price as PSA 10.
    await setSeg(p, 'Price as', 'PSA 10');
    ok((await sumText(p)) === SEL10, `${name}: 3 selected at PSA 10 by hand: "${await sumText(p)}"`);
    ok(norm(await val(p, 'Test Delta').innerText()) === '$25', `${name}: Delta tile falls back to $25 at PSA 10 (summary uses the same)`);
    // Sort and filter changes keep it.
    await p.selectOption('select[aria-label="Sort"]', 'name');
    await setSeg(p, 'Show', 'Graded');
    ok((await sumText(p)) === SEL10, `${name}: selection kept across sort and filter (cards hidden still count)`);
    await setSeg(p, 'Show', 'All');
    ok(await box(p, 'Test Echo').isChecked() && await box(p, 'Test Alpha').isChecked() && !(await box(p, 'Test Bravo').isChecked()), `${name}: checkboxes reflect the selection in All`);
    const h = await hero(p);
    ok(h.value === '$2,135' && h.cost === '$360', `${name}: Vault totals unchanged by selection (${JSON.stringify(h)})`);
    // Untick and tick again.
    await box(p, 'Test Alpha').uncheck();
    ok((await sumText(p)).startsWith('2 selected · Value $925'), `${name}: untick Alpha -> 2 selected $925`);
    await box(p, 'Test Alpha').check();
    ok(await noOverflow(p), `${name}: no horizontal scroll (3 selected)`);
    await p.selectOption('select[aria-label="Sort"]', 'value');
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${SHOTS}/vault-selected-psa10-${name}.png`, fullPage: true });

    // Reload keeps the selection (sessionStorage); Price as resets to Now.
    await p.reload({ waitUntil: 'networkidle' });
    ok((await sumText(p)) === SELNOW, `${name}: selection persists after reload`);
    // Keyboard: Space on the focused checkbox toggles it without opening the drawer.
    await box(p, 'Test Bravo').focus();
    await p.keyboard.press('Space');
    ok((await sumText(p)).startsWith('4 selected') && (await p.locator('[role=dialog]').count()) === 0, `${name}: keyboard Space toggles, no drawer`);
    // The open button still opens the drawer.
    await tile(p, 'Test Foxtrot').locator(':scope > button').click();
    ok((await p.locator('[role=dialog]').count()) === 1, `${name}: tile button opens the drawer`);
    await p.click('[role=dialog] button[aria-label=Close]');
    // clear
    await sum(p).locator('button', { hasText: 'clear' }).click();
    ok((await sumText(p)) === '' && !(await box(p, 'Test Echo').isChecked()), `${name}: clear removes the summary and unticks`);
    ok(await p.evaluate((k) => sessionStorage.getItem(k), KEY) === null, `${name}: clear removes the storage key`);
    await p.reload({ waitUntil: 'networkidle' });
    ok((await sumText(p)) === '', `${name}: still cleared after reload`);
    // Sealed tile has a checkbox too.
    await setSeg(p, 'Show', 'Sealed');
    await box(p, 'Test Golf').check();
    ok((await sumText(p)).startsWith('1 selected · Value $95 · Cost $80'), `${name}: sealed card selectable ($95 / $80)`);
    await sum(p).locator('button', { hasText: 'clear' }).click();
    ok(!hyd.length && !errs.length, `${name}: no hydration warning or page error ${hyd.concat(errs).join('; ')}`);
    await ctx.close();

    // Stored selection (valid and corrupt) loads without a hydration warning.
    for (const stored of ['["00000000-0000-4000-8000-000000000101","gone-id"]', 'garbage']) {
      const c2 = await b.newContext({ viewport });
      await c2.addInitScript(([k, v]) => { if (!window.name) { sessionStorage.setItem(k, v); window.name = 'seeded'; } }, [KEY, stored]);
      const p2 = await c2.newPage();
      const h2 = hydrationWatch(p2);
      const e2 = []; p2.on('pageerror', (e) => e2.push(String(e)));
      await p2.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
      const want = stored === 'garbage' ? '' : '1 selected · Value $40 · Cost $20 · Gain +$20 · clear';
      ok((await sumText(p2)) === want, `${name}: stored ${stored.slice(0, 12)}… -> "${want}"`);
      ok(!h2.length && !e2.length, `${name}: no hydration warning or error (stored ${stored.slice(0, 12)}…) ${h2.concat(e2).join('; ')}`);
      await c2.close();
    }

    // sessionStorage throws: selection works for the page, gone after reload.
    const c3 = await b.newContext({ viewport, reducedMotion: 'reduce' });
    await c3.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }); });
    const p3 = await c3.newPage();
    const e3 = []; p3.on('pageerror', (e) => e3.push(String(e)));
    await p3.goto(`${BASE}/collection`, { waitUntil: 'networkidle' });
    await box(p3, 'Test Alpha').check();
    await setSeg(p3, 'Price as', 'PSA 10');
    ok((await sumText(p3)).startsWith('1 selected · Value $300'), `${name}: storage throws: selection works`);
    await sum(p3).locator('button', { hasText: 'clear' }).click();
    ok((await sumText(p3)) === '', `${name}: storage throws: clear works`);
    await box(p3, 'Test Alpha').check();
    await p3.reload({ waitUntil: 'networkidle' });
    ok((await sumText(p3)) === '', `${name}: storage throws: selection gone after reload`);
    ok(!e3.length, `${name}: storage throws: no page errors ${e3.join('; ')}`);
    await c3.close();
  }
  await b.close();
})();
