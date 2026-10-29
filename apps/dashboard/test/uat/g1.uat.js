// G1 UAT: Grading tab + Vault "Snipe another copy" link. Run against fixtures:
// COLLECTION_FIXTURE=/tmp/uat/collection.json SNIPE_FIXTURE=/tmp/uat/snipe.json next dev --port 3100
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = { errors: [], checks: {} };
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  p.on('pageerror', (e) => out.errors.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts|favicon|404/.test(m.text())) out.errors.push('console ' + m.text().slice(0, 150)); });
  await p.goto('http://localhost:3100/grading', { waitUntil: 'networkidle' });
  out.checks.navTabs = await p.$$eval('nav[aria-label=Sections] a', (e) => e.map((x) => x.textContent + (x.getAttribute('aria-current') ? '*' : '')));
  out.checks.subs = await p.$$eval('details summary', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 140)));
  out.checks.backKpis = (await p.textContent('#back-h + div')).replace(/\s+/g, ' ');
  out.checks.backRows = await p.$$eval('table[aria-label="Graded and back"] tbody tr', (e) => e.length);
  out.checks.candidates = await p.$$eval('table[aria-label="Worth grading"] tbody tr', (e) => e.slice(0, 3).map((x) => x.innerText.replace(/\s+/g, ' ').slice(0, 120)));
  await p.screenshot({ path: '/tmp/uat/shots/grading.png', fullPage: false });
  await p.click('details summary'); await p.waitForTimeout(300);
  out.checks.firstSubRows = await p.$$eval('details[open] tbody tr', (e) => e.length);
  await p.screenshot({ path: '/tmp/uat/shots/grading-open.png' });
  await p.screenshot({ path: '/tmp/uat/shots/grading-full.png', fullPage: true });
  // Vault -> Snipe (new target)
  await p.goto('http://localhost:3100/collection', { waitUntil: 'networkidle' });
  await p.click('[aria-label="Show"] button:has-text("Raw")'); await p.selectOption('select[aria-label="Sort"]', 'value'); await p.waitForTimeout(300);
  await p.click('main section[aria-label=Cards] button'); await p.waitForTimeout(300);
  const link = await p.$('[role=dialog] a:has-text("Snipe another copy")');
  out.checks.vaultLink = link ? await link.getAttribute('href') : 'MISSING';
  await p.screenshot({ path: '/tmp/uat/shots/vault-link.png' });
  await link.click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500);
  out.checks.snipeUrlAfter = p.url();
  const dlg = await p.$('[role=dialog][aria-label="Add target"]');
  out.checks.addPanelOpen = !!dlg;
  if (dlg) out.checks.prefilled = await p.$$eval('[role=dialog] input:not([type=checkbox]), [role=dialog] select', (e) => e.slice(0, 9).map((x) => x.value));
  out.checks.notice = await p.$eval('p.notice', (x) => x.textContent).catch(() => null);
  await p.screenshot({ path: '/tmp/uat/shots/snipe-prefill.png' });
  // existing target: opens the row instead
  await p.goto('http://localhost:3100/snipe?add=' + encodeURIComponent('2014 Panini Prizm World Cup #161 Cristiano Ronaldo (base)') + '&player=Cristiano%20Ronaldo', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  out.checks.existingOpen = await p.$$eval('tr[aria-expanded=true]', (e) => e.map((x) => x.id));
  out.checks.existingNotice = await p.$eval('p.notice', (x) => x.textContent).catch(() => null);
  out.checks.existingNoPanel = !(await p.$('[role=dialog]'));
  await p.screenshot({ path: '/tmp/uat/shots/snipe-existing.png' });
  // plain Add target still opens empty
  await p.goto('http://localhost:3100/snipe', { waitUntil: 'networkidle' });
  await p.click('button:has-text("Add target")'); await p.waitForTimeout(300);
  out.checks.plainAddCardEmpty = await p.$eval('[role=dialog] input[type=text]', (x) => x.value === '');
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  m.on('pageerror', (e) => out.errors.push('m ' + e.message));
  await m.goto('http://localhost:3100/grading', { waitUntil: 'networkidle' });
  out.checks.mobileOverflowX = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await m.screenshot({ path: '/tmp/uat/shots/grading-mobile.png' });
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
