// J3 UAT (qa): the "/" panel shows a notice instead of crashing when JobRun can't be read.
// Needs a dev server WITHOUT COLLECTION_FIXTURE and without Supabase env (the loader then throws "Supabase env vars missing"):
//   next dev --port 3100   then   node test/uat/j3-error.uat.js
// Same notice path as a missing JobRun table (J3 merged before J1 is applied) or any other DB error.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exitCode = 1; } else console.log('ok   ' + m); };
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const [name, viewport] of [['1280', { width: 1280, height: 1000 }], ['390', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    const r = await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    ok(r.status() === 200 && new URL(p.url()).pathname === '/', `${name}: "/" still 200 on a DB error (no redirect, no 500)`);
    const notice = p.locator('p.notice');
    ok((await notice.count()) === 1 && /^Couldn't load job runs: .+/.test(await notice.innerText()), `${name}: notice "Couldn't load job runs: ..."`);
    ok((await p.locator('section[aria-label="Latest runs"]').count()) === 0, `${name}: no panel rendered on error`);
    ok(!errs.length, `${name}: no page errors ${errs.join('; ')}`);
    await p.close();
  }
  await b.close();
})();
