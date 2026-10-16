// S1 UAT: freshness stamp and masthead Scan button. Arg: tag (fresh|stale). Needs next dev with DEALS_FIXTURE.
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots/s1';
const tag = process.argv[2] || 'fresh';
(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const out = { errors: [] };
  p.on('pageerror', (e) => out.errors.push(e.message));
  for (const [name, path] of [['snipe', '/snipe'], ['dips', '/dips']]) {
    await p.goto('http://localhost:3100' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
    out[name] = (await p.textContent('main')).match(/eBay listings[^.]*\.( Deals[^.]*\.| Sold prices as of [A-Za-z]+ \d+\.)?/)?.[0];
    await p.screenshot({ path: `${SHOTS}/${tag}_${name}.png` });
  }
  await p.click('button:has-text("Scan eBay")'); await p.waitForTimeout(300);
  out.scanNoToken = await p.textContent('[role=status]');
  await p.evaluate(() => localStorage.setItem('scr.adminToken', 'wrong'));
  await p.click('button:has-text("Scan eBay")'); await p.waitForTimeout(1500);
  out.scanWrongToken = await p.textContent('[role=status]');
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
