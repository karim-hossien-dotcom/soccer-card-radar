// C1 UAT: snipe board ranking, live matching, score breakdown, form approval, add/edit target, mobile.
// Needs next dev with SNIPE_FIXTURE (make-snipe-fixture.js), DEALS_FIXTURE and ADMIN_TOKEN=uat-secret.
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots/c1';
(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } }); const out = { errors: [] };
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  p.on('pageerror', (e) => out.errors.push(e.message));
  await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const rows = async () => p.$$eval('table[aria-label="Snipe targets"] > tbody > tr[aria-expanded]', (trs) => trs.map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim())));
  out.board = (await rows()).map((r) => `${r[0]} | ${r[1].slice(0, 70)} | ${r[2]} | ${r[3]} | ${r[4]} | ${r[5]} | ${r[6]}`);
  out.basis = await p.textContent('p[class*="basis"]');
  await p.screenshot({ path: `${SHOTS}/board.png`, fullPage: false });
  await p.click('table[aria-label="Snipe targets"] tr[aria-expanded]'); await p.waitForTimeout(300);
  out.detail = (await p.textContent('tr[class*="detail"]')).replace(/\s+/g, ' ').slice(0, 700);
  await p.screenshot({ path: `${SHOTS}/detail.png`, fullPage: false });
  // approve Nico Paz form, check board order is stable and status flips
  await p.evaluate(() => localStorage.setItem('scr.adminToken', 'uat-secret'));
  const paz = p.locator('tr', { hasText: 'Nico Paz' }).locator('button', { hasText: 'Approve' });
  await paz.click(); await p.waitForTimeout(1200);
  out.pazStatus = (await p.locator('tr', { hasText: 'Nico Paz' }).last().innerText()).replace(/\s+/g, ' ').slice(-20);
  await p.locator('h2#form-h').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${SHOTS}/form.png` });
  // add a target for Nico Paz
  await p.click('button:has-text("Add target")'); await p.waitForTimeout(300);
  await p.selectOption('[role=dialog] select', 'nico-paz');
  const fill = async (label, v) => p.locator('[role=dialog] label').filter({ hasText: new RegExp('^' + label.replace(/[()$]/g, '\\$&')) }).locator('input').fill(v);
  await fill('Card', '2023-24 Topps Chrome UCC Nico Paz RC #100'); await fill('eBay search', '2023-24 Topps Chrome Nico Paz RC');
  await fill('Title must contain', 'chrome, paz, rc'); await fill('Title must not contain', 'psa, lot, refractor');
  await fill('Raw comp', '20'); await fill('PSA 9 comp', '45'); await fill('PSA 10 comp', '120');
  await p.screenshot({ path: `${SHOTS}/add.png` });
  await p.click('[role=dialog] button:has-text("Add target")'); await p.waitForTimeout(1500);
  out.afterAdd = (await rows()).map((r) => `${r[1].slice(0, 40)} ${r[2]}`);
  // edit: change Messi base raw comp -> date stamps today, stale flag clears
  await p.locator('tr[aria-expanded]', { hasText: '#12 Lionel Messi (base)' }).click(); await p.waitForTimeout(300);
  await p.click('button:has-text("Edit target")'); await p.waitForTimeout(300);
  await fill('Raw comp', '48');
  out.editHint = await p.locator('[role=dialog]').innerText().then((t) => /dated today/.test(t));
  await p.click('[role=dialog] button:has-text("Save changes")'); await p.waitForTimeout(1500);
  out.messiAfter = (await p.locator('tr[aria-expanded]', { hasText: '#12 Lionel Messi (base)' }).innerText()).replace(/\s+/g, ' ');
  // bad input
  await p.click('button:has-text("Add target")'); await p.waitForTimeout(300);
  await p.click('[role=dialog] button:has-text("Add target")'); await p.waitForTimeout(800);
  out.badAdd = await p.textContent('[role=dialog] [role=status]'); await p.keyboard.press('Escape');
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await m.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' }); await m.waitForTimeout(500);
  out.mobileOverflowX = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await m.screenshot({ path: `${SHOTS}/board_m.png` });
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
