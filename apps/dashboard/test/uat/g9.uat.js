// G9b UAT: phone flash for the side-light steps, with a mocked camera (canvas stream), torch present and absent.
// Run against fixtures: COLLECTION_FIXTURE=test/fixtures/collection.json next dev --port 3100; then node test/uat/g9.uat.js
// Screenshots go to $SHOTS (default /tmp/uat/shots).
const { chromium } = require('playwright');
const fs = require('fs');
const SHOTS = process.env.SHOTS || '/tmp/uat/shots';
fs.mkdirSync(SHOTS, { recursive: true });

/** Fake back camera: a card on a dark mat. torch: whether getCapabilities() reports one; every torch constraint is logged. */
const camera = (torch) => {
  window.__torch = [];
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const g = c.getContext('2d');
  const draw = () => {
    g.fillStyle = '#151515'; g.fillRect(0, 0, c.width, c.height);
    const w = 700, h = w / 0.714, x = (c.width - w) / 2, y = (c.height - h) / 2;
    g.fillStyle = '#8a1c2a'; g.fillRect(x, y, w, h);
    g.fillStyle = '#e8e4da'; g.fillRect(x + 45, y + 45, w - 90, h - 90);
    g.fillStyle = '#2050a0'; for (let i = 0; i < 40; i++) g.fillRect(x + 80 + (i * 37) % (w - 200), y + 90 + i * 22, 90, 6);
    g.fillStyle = '#111'; g.font = 'bold 60px sans-serif'; g.fillText('L. DIAZ', x + 180, y + h - 120);
    requestAnimationFrame(draw);
  };
  draw();
  navigator.mediaDevices.getUserMedia = async () => {
    const ms = c.captureStream(15);
    const t = ms.getVideoTracks()[0];
    const caps = t.getCapabilities ? t.getCapabilities.bind(t) : () => ({});
    t.getCapabilities = () => (torch ? { ...caps(), torch: true } : caps());
    t.applyConstraints = async (k) => { const v = k && k.advanced && k.advanced[0] && 'torch' in k.advanced[0] ? k.advanced[0].torch : null; if (v !== null) window.__torch.push(v); };
    return ms;
  };
};

async function run(b, torch, out) {
  const tag = torch ? 'torch' : 'notorch';
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', (e) => out.errors.push(`${tag} pageerror ${e.message}`));
  await p.addInitScript(camera, torch);
  await p.goto('http://localhost:3100/grading', { waitUntil: 'networkidle' });
  await p.click('button:has-text("Scan a card that isn\'t in the Vault")');
  await p.waitForSelector('[role=dialog][aria-label="Scan a card"]');
  await p.waitForFunction(() => !/Starting the camera/.test(document.querySelector('[aria-live=polite]')?.textContent || ''), null, { timeout: 30000 });
  const stepTag = () => p.textContent('[role=dialog] span[class*=stepTag]');
  const r = (out.checks[tag] = {});
  r.frontTag = await stepTag();
  r.frontToggle = await p.$$eval('[role=dialog] button[aria-pressed]', (e) => e.length);
  await p.screenshot({ path: `${SHOTS}/g9-${tag}-front-390.png` });
  // front: auto-captures on a steady card; press the shutter if it hasn't yet
  const reached = await p.waitForFunction(() => /2 of 6/.test(document.querySelector('[role=dialog] span[class*=stepTag]')?.textContent || ''), null, { timeout: 5000 }).catch(() => null);
  if (!reached) await p.click('button[aria-label="Take the photo now"]');
  await p.waitForFunction(() => /2 of 6/.test(document.querySelector('[role=dialog] span[class*=stepTag]')?.textContent || ''), null, { timeout: 20000 });
  await p.waitForTimeout(500);
  r.lightTag = await stepTag();
  r.lightHint = await p.textContent('[aria-live=polite]');
  r.lightToggle = await p.$$eval('[role=dialog] button[aria-pressed]', (e) => e.map((x) => `${x.textContent} pressed=${x.getAttribute('aria-pressed')}`));
  r.torchAfterLight = await p.evaluate(() => window.__torch.slice());
  await p.screenshot({ path: `${SHOTS}/g9-${tag}-light-left-390.png` });
  if (torch) {
    await p.click('[role=dialog] button[aria-pressed]');
    await p.waitForTimeout(300);
    r.offHint = await p.textContent('[aria-live=polite]');
    r.offToggle = await p.textContent('[role=dialog] button[aria-pressed]');
    r.torchAfterOff = await p.evaluate(() => window.__torch.slice());
    await p.screenshot({ path: `${SHOTS}/g9-torch-light-left-flash-off-390.png` });
    await p.click('[role=dialog] button[aria-pressed]');
    await p.waitForTimeout(300);
  }
  r.overflowX = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await p.click('button[aria-label="Close the scanner"]');
  await p.waitForTimeout(300);
  r.torchAfterClose = await p.evaluate(() => window.__torch.slice());
  await p.close();
}

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); // CHROMIUM: use an installed browser build
  const out = { errors: [], checks: {} };
  await run(b, true, out);
  await run(b, false, out);
  const t = out.checks.torch, n = out.checks.notorch;
  const flashText = "Flash on. Tilt the phone low over the card's left edge (about 30 degrees) so the light skims the surface";
  const lampText = "Now light it from the side: hold a lamp or a second phone's flashlight low on the card's left side, so it skims across the card";
  out.pass = {
    noToggleOnFront: t.frontToggle === 0,
    toggleOnLight: t.lightToggle.length === 1 && t.lightToggle[0] === 'Flash on pressed=true',
    flashWording: t.lightHint === flashText || /Hold still|Tilt the phone over/.test(t.lightHint),
    torchOnForLight: t.torchAfterLight.at(-1) === true && !t.torchAfterLight.slice(0, -1).includes(true),
    toggleOffTurnsTorchOff: t.torchAfterOff.at(-1) === false && t.offToggle === 'Flash off' && t.offHint === lampText,
    torchOffOnClose: t.torchAfterClose.at(-1) === false,
    noTorchNoToggle: n.lightToggle.length === 0 && n.torchAfterClose.every((x) => x === false),
    noTorchLampWording: n.lightHint === lampText || /Hold still|Move the light/.test(n.lightHint),
    noOverflow: !t.overflowX && !n.overflowX,
    noErrors: out.errors.length === 0,
  };
  console.log(JSON.stringify(out, null, 1));
  await b.close();
  process.exit(Object.values(out.pass).every(Boolean) ? 0 : 1);
})();
