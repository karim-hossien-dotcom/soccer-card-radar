import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Synthetic case B' (purchase + proxy), dated relative to a fixed `now`.
const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "thin-blend.ts");
const NOW = "2026-11-03T12:00:00Z";
const ago = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();

const run = (args: string[]) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

test("CLI prints value, low, high, confidence and per-signal weights as JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "thin-blend-"));
  const file = join(dir, "in.json");
  writeFileSync(
    file,
    JSON.stringify({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [
        { kind: "purchase", gradeState: "raw", sales: [{ price: 100, date: ago(200) }] },
        { kind: "proxy", gradeState: "raw", sales: [{ price: 70, date: ago(60) }, { price: 80, date: ago(100) }] },
      ],
    }),
  );
  const r = run([file]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.applies, true);
  assert.ok(Math.abs(out.value - 89.7) <= 0.1);
  assert.ok(Math.abs(out.low - 58.8) <= 0.1);
  assert.ok(Math.abs(out.high - 136.85) <= 0.1);
  assert.equal(out.confidence, 2);
  assert.equal(out.method, "thin_blend");
  assert.deepEqual(out.signals.map((s: { kind: string }) => s.kind), ["purchase", "proxy"]);
  const share = out.signals.reduce((a: number, s: { weightShare: number }) => a + s.weightShare, 0);
  assert.ok(Math.abs(share - 1) < 1e-9);
});

test("CLI exits 2 with a JSON error on missing file or bad JSON", () => {
  const missing = run([join(tmpdir(), "no-such-thin-blend.json")]);
  assert.equal(missing.status, 2);
  assert.ok(JSON.parse(missing.stdout).error);

  const dir = mkdtempSync(join(tmpdir(), "thin-blend-"));
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{nope");
  const r = run([bad]);
  assert.equal(r.status, 2);
  assert.ok(JSON.parse(r.stdout).error);

  const usage = run([]);
  assert.equal(usage.status, 2);
});
