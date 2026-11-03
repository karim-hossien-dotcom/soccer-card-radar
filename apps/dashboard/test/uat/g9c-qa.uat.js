// G9c QA UAT: the Grading tab's existing "Check your own photo" result for the four G9c cases, at 390px and 1280px.
// Each report is real output of apps/dashboard/api/condition.py on a synthetic card from test_condition.py (made by python3
// here); /api/condition is answered with it because next dev does not run the Python function. No real scans.
// Run against fixtures: COLLECTION_FIXTURE=test/fixtures/collection.json next dev --port 3100; then node test/uat/g9c-qa.uat.js
// Screenshots go to $SHOTS (default /tmp/uat/shots). CHROMIUM=<path> uses an installed browser build.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const TOOLS = path.join(__dirname, '..', '..', '..', '..', 'tools', 'grade-screen');
const PY = `
import json, test_api as ta, test_condition as t
def run(p, quad=None):
    parts = {"front": open(p, "rb").read()}
    if quad: parts["front_quad"] = json.dumps(quad)
    st, r = ta.api.handle(*ta.form(**parts), env={})
    assert st == 200, r
    return {"photo": p, "report": r}
bp, bq = t.blended_bottom()
print(json.dumps({
  "crops": run(t.fake(chips=8, corner_white=True)),
  "holder": run(t.sleeved(True)),
  "edge": run(bp, bq),
  "glare": run(t.glare_card(6)),
}, default=float))
`;

const CASES = {
  crops: { anchor: 'h3:has-text("Look flags")', check: async (p) => {
    const li = p.locator('h3:has-text("Look flags") + p + ul li');
    const n = await li.count();
    const crops = await li.locator('img[src^="data:image/jpeg"]').count();
    return { 'every look flag has its crop': n >= 2 && crops === n };
  } },
  holder: { anchor: 'li:has-text("front: sleeve or holder")', check: async (p, body) => ({
    'holder retake text shown': /card is in a sleeve or holder: take it out and retake/.test(body),
    'no grade ceiling claimed': !/PSA\s?\d/.test(await p.textContent('p[data-capped]')),
  }) },
  edge: { anchor: 'li:has-text("front bottom edge and its corners")', check: async (p, body) => ({
    'bottom edge listed as not judged': /front bottom edge and its corners/.test(body) && /cut edge not found on this side/.test(body),
    'no bottom line in look flags': !(await p.locator('h3:has-text("Look flags") + p + ul li').allTextContents()).some((t) => /bottom/.test(t)),
  }) },
  glare: { anchor: 'li:has-text("glare covers")', check: async (p, body) => ({
    'glare retake shown': /glare covers \d+% of the card: retake with the light at an angle/.test(body),
    'no stain flag': !/stain/i.test((await p.locator('h3:has-text("Look flags") + p + ul li').allTextContents()).join(' ')),
  }) },
};

(async () => {
  const data = JSON.parse(execFileSync('python3', ['-c', PY], { cwd: TOOLS, maxBuffer: 64 * 1024 * 1024 }).toString());
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const results = {};
  for (const [vp, opts] of [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
    for (const [name, c] of Object.entries(CASES)) {
      const { photo, report } = data[name];
      const errors = [];
      const p = await b.newPage(opts);
      p.on('pageerror', (e) => errors.push(e.message));
      await p.route('**/api/condition', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(report) }));
      await p.goto('http://localhost:3100/grading', { waitUntil: 'networkidle' });
      await p.click('summary:has-text("Check your own photo instead")');
      await p.setInputFiles('input[type=file] >> nth=0', photo);
      await p.click('button:has-text("Run check")');
      await p.waitForSelector('h3:has-text("Grade ceiling")');
      const body = await p.textContent('body');
      const r = await c.check(p, body);
      r['no horizontal overflow'] = !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
      r['no page errors'] = errors.length === 0;
      await p.locator(c.anchor).first().scrollIntoViewIfNeeded();
      await p.locator(c.anchor).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await p.screenshot({ path: `${SHOTS}/g9c-${name}-${vp}.png` });
      for (const [k, v] of Object.entries(r)) results[`${vp} ${name}: ${k}`] = v;
      await p.close();
    }
  }
  await b.close();
  for (const [k, v] of Object.entries(results)) console.log(`${v ? 'pass' : 'FAIL'} ${k}`);
  process.exit(Object.values(results).every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
