// G9c UAT: evidence crops next to look flags in the Grading tab's existing "Check your own photo" result (390px).
// The report is real output of apps/dashboard/api/condition.py on a synthetic card (edge specks + a white corner),
// made by python3 here; /api/condition is answered with it (next dev does not run the Python function). No real scans.
// Run against fixtures: COLLECTION_FIXTURE=test/fixtures/collection.json next dev --port 3100; then node test/uat/g9c.uat.js
// Screenshots go to $SHOTS (default /tmp/uat/shots). CHROMIUM=<path> uses an installed browser build.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const TOOLS = path.join(__dirname, '..', '..', '..', '..', 'tools', 'grade-screen');
const PY = `
import json, sys, test_api as ta, test_condition as t
p = t.fake(chips=8, corner_white=True)
st, r = ta.api.handle(*ta.form(front=open(p, "rb").read()), env={})
assert st == 200, r
print(json.dumps({"photo": p, "report": r}, default=float))
`;

(async () => {
  const { photo, report } = JSON.parse(execFileSync('python3', ['-c', PY], { cwd: TOOLS, maxBuffer: 64 * 1024 * 1024 }).toString());
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const errors = [];
  const checks = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', (e) => errors.push(`pageerror ${e.message}`));
  await p.route('**/api/condition', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(report) }));
  await p.goto('http://localhost:3100/grading', { waitUntil: 'networkidle' });
  await p.click('summary:has-text("Check your own photo instead")');
  await p.setInputFiles('input[type=file] >> nth=0', photo);
  await p.click('button:has-text("Run check")');
  await p.waitForSelector('h3:has-text("Look flags")');
  const look = p.locator('h3:has-text("Look flags") + p + ul');
  checks.lookLines = await look.locator('li').count();
  checks.lookCrops = await look.locator('li img[src^="data:image/jpeg"]').count();
  checks.firstLine = (await look.locator('li').first().textContent()).trim();
  checks.cropBeforeText = await look.locator('li').first().evaluate((li) => li.firstElementChild?.tagName === 'IMG');
  checks.cropAlt = await look.locator('li img').first().getAttribute('alt');
  checks.headline = (await p.textContent('p[data-capped]')).trim();
  checks.newControls = await p.$$eval('button', (bs) => bs.map((x) => x.textContent.trim()).filter((t) => /crop|evidence|zoom/i.test(t)));
  checks.overflowX = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await look.scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollBy(0, -120));
  await p.screenshot({ path: `${SHOTS}/g9c-look-crops-390.png` });
  await b.close();

  const pass = {
    'every look line has a crop': checks.lookLines >= 2 && checks.lookCrops === checks.lookLines,
    'crop sits next to (before) its flag text': checks.cropBeforeText,
    'crop has alt text': /close-up/.test(checks.cropAlt || ''),
    'chipping is a look flag, not a ceiling': /chipping/.test(checks.firstLine) && /not calibrated/.test(checks.firstLine),
    'headline is not "no visible issue"': /^No ceiling from what was measured/.test(checks.headline),
    'no new control': checks.newControls.length === 0,
    'no horizontal overflow at 390px': !checks.overflowX,
    'no page errors': errors.length === 0,
  };
  for (const [k, v] of Object.entries(pass)) console.log(`${v ? 'pass' : 'FAIL'} ${k}`);
  console.log(JSON.stringify({ checks, errors }, null, 1));
  process.exit(Object.values(pass).every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
