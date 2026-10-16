// A4 UAT. Run against `next dev` with COLLECTION_FIXTURE=<copy of fixture with aged comps + pops> ADMIN_TOKEN=uat-secret.
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots';
const RAPH = '025d7e43'; // aged raw card in the A4 fixture
(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}); const out = { errors: [] };
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  // Sandbox has no Google Fonts access; a failed stylesheet rejects router.refresh() with a bare Event.
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  p.on('pageerror', (e) => out.errors.push(`${e.message} (after: ${out.step ?? 'load'})`));
  const kpis = () => p.$$eval('section[aria-label="Collection totals"] b', (e) => e.map((x) => x.textContent));
  await p.goto('http://localhost:3100/collection', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  out.kpisBefore = await kpis();
  out.step = 'banner'; out.banner = (await p.textContent('[aria-label="Comps"] span')).trim();
  await p.click('button:has-text("Stale (")'); await p.waitForTimeout(300);
  out.staleTiles = await p.$$eval('main button', (e) => e.length);
  await p.screenshot({ path: `${SHOTS}/a4_stale.png` });
  // drawer: PSA pop row on a graded card
  await p.click('button:has-text("All")'); await p.fill('input[type=search]', 'Haaland'); await p.waitForTimeout(300);
  const tiles = await p.$$('main button'); let pop = null;
  for (const t of tiles) { await t.click(); await p.waitForTimeout(200); const tx = await p.textContent('[role=dialog]'); const m = tx.match(/PSA pop.{0,60}/); if (m) { pop = m[0]; await p.screenshot({ path: `${SHOTS}/a4_pop.png` }); break; } await p.keyboard.press('Escape'); }
  out.step = 'popRow'; out.popRow = pop; await p.keyboard.press('Escape'); await p.fill('input[type=search]', '');
  // comps panel
  await p.click('button:has-text("Update comps")'); await p.waitForTimeout(300);
  await p.fill('textarea', `${RAPH}, raw, 12.50, 3\n${RAPH}, psa10, 80\nnope1234, raw, 5\n${RAPH}, mint, 5`);
  await p.waitForTimeout(300);
  out.step = 'preview'; out.preview = (await p.textContent('[role=dialog]')).match(/\d+ ready[^.]*\./)[0];
  out.errorsListed = await p.$$eval('[role=dialog] ul li', (e) => e.map((x) => x.textContent.slice(0, 40)));
  await p.fill('input[type=password]', 'wrong'); await p.click('button:has-text("Save 2 comps")'); await p.waitForTimeout(800);
  out.step = 'wrongToken'; out.wrongToken = await p.textContent('[role=status]');
  await p.click('button:has-text("Refresh PSA pop")'); await p.waitForTimeout(800);
  out.step = 'psaNoToken'; out.psaNoToken = await p.textContent('[role=status]');
  await p.screenshot({ path: `${SHOTS}/a4_panel.png` });
  await p.fill('input[type=password]', 'uat-secret');
  await p.fill('textarea', `${RAPH}, raw, 12.50, 3\n${RAPH}, psa10, 80`);
  await p.click('button:has-text("Save 2 comps")'); await p.waitForTimeout(2500);
  out.step = 'saved'; out.saved = await p.textContent('[role=status]');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  out.bannerAfter = (await p.textContent('[aria-label="Comps"] span')).trim();
  out.kpisAfter = await kpis();
  await p.fill('input[type=search]', 'MANGA #8 RAPHINHA'); await p.waitForTimeout(300);
  await p.click('main button'); await p.waitForTimeout(300);
  out.step = 'raphDrawer'; out.raphDrawer = (await p.textContent('[role=dialog]')).replace(/\s+/g, ' ').match(/Value now.{0,120}/)[0];
  await p.screenshot({ path: `${SHOTS}/a4_after.png` });
  out.tokenRemembered = await p.evaluate(() => localStorage.getItem('scr.adminToken'));
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto('http://localhost:3100/collection', { waitUntil: 'networkidle' }); await m.waitForTimeout(600);
  await m.click('button:has-text("Update comps")'); await m.waitForTimeout(300);
  out.mobileOverflowX = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await m.screenshot({ path: `${SHOTS}/a4_panel_m.png` });
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
