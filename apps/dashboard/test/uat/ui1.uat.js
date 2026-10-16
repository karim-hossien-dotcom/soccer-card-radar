// UI-1 visual UAT: every page at desktop + 390px, overflow + page-error checks, key interactions.
// Run against next dev with COLLECTION_FIXTURE and DEALS_FIXTURE (see make-*-fixture.js). Arg: output tag (after|before).
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots/ui1';
const tag = process.argv[2] || 'after';
const ROUTES = [['snipe', '/snipe'], ['dips', '/dips'], ['vault', '/collection']];
(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const out = { errors: [], pages: {} };
  for (const [vw, vh, dev] of [[1280, 900, 'd'], [390, 844, 'm']]) {
    const p = await b.newPage({ viewport: { width: vw, height: vh }, ...(dev === 'm' ? { isMobile: true, hasTouch: true } : {}) });
    p.on('pageerror', (e) => out.errors.push(`${dev} ${e.message}`));
    for (const [name, path] of ROUTES) {
      await p.goto('http://localhost:3100' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      const r = out.pages[`${name}_${dev}`] = {
        overflowX: await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
        h1: await p.$eval('h1', (e) => e.textContent).catch(() => null),
        fonts: await p.evaluate(() => [...new Set([...document.querySelectorAll('h1, td, p, button')].slice(0, 60).map((e) => getComputedStyle(e).fontFamily.split(',')[0]))]),
        caps: await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).textTransform === 'uppercase' && e.textContent.trim()).length),
      };
      await p.screenshot({ path: `${SHOTS}/${tag}_${name}_${dev}.png`, fullPage: dev === 'd' && name !== 'vault' });
      if (false) { // pitch pages retired 2026-10-16
        const tok = await p.$('[aria-expanded]');
        if (tok) { await tok.hover(); await p.waitForTimeout(250); await p.screenshot({ path: `${SHOTS}/${tag}_rookies_tip.png` }); await tok.click(); await p.waitForTimeout(300); r.dealRows = await p.$$eval('section[aria-label$="deals"] tr', (e) => e.length).catch(() => 0); await p.screenshot({ path: `${SHOTS}/${tag}_rookies_deals.png`, fullPage: true }); }
      }
      if (dev === 'd' && name === 'vault') {
        r.kpis = await p.$$eval('section[aria-label="Collection totals"] b', (e) => e.map((x) => x.textContent));
        await p.mouse.wheel(0, 700); await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/${tag}_vault_grid.png` });
        await p.click('section[aria-label="Cards"] button'); await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/${tag}_vault_drawer.png` });
        await p.keyboard.press('Escape');
        await p.click('button:has-text("Update comps")').catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/${tag}_vault_comps.png` }); await p.keyboard.press('Escape');
      }
    }
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
