import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Synthetic case B' (proxy only, index factors given), dated relative to a fixed `now`.
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
        {
          kind: "proxy",
          gradeState: "raw",
          sales: [{ price: 70, date: ago(60), indexFactor: 1 }, { price: 80, date: ago(100), indexFactor: 1 }],
        },
      ],
    }),
  );
  const r = run([file]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.applies, true);
  assert.ok(Math.abs(out.value - 74.45) <= 0.1);
  assert.ok(Math.abs(out.low - 37.12) <= 0.1);
  assert.ok(Math.abs(out.high - 149.32) <= 0.1);
  assert.equal(out.confidence, 2);
  assert.equal(out.method, "thin_blend");
  assert.deepEqual(out.flags, []);
  assert.deepEqual(out.signals.map((s: { kind: string }) => s.kind), ["proxy"]);
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

test("CLI accepts dated ratio pairs and drops pairs older than 365 days", () => {
  const dir = mkdtempSync(join(tmpdir(), "thin-blend-"));
  const file = join(dir, "ratios.json");
  writeFileSync(
    file,
    JSON.stringify({
      now: NOW,
      target: { gradeState: "graded", grade: "PSA 8" },
      signals: [
        {
          kind: "grade_ratio",
          gradeState: "graded",
          sales: [{ price: 100, date: ago(30) }],
          ratios: [{ r: 0.5, date: ago(10) }, { r: 0.6, date: ago(20) }, { r: 0.7, date: ago(30) }, { r: 9, date: ago(400) }, 0.65],
        },
      ],
    }),
  );
  const r = run([file]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.signals[0].kind, "grade_ratio");
  assert.ok(Math.abs(out.signals[0].r - 0.625) < 1e-9);
  const reasons = out.excluded.map((e: { reason: string }) => e.reason);
  assert.ok(reasons.some((x: string) => /older than 365 days/.test(x)));
  assert.ok(reasons.some((x: string) => /undated ratio/.test(x)));
});

test("CLI refuses a purchase signal: exit 2 with the error", () => {
  const dir = mkdtempSync(join(tmpdir(), "thin-blend-"));
  const file = join(dir, "purchase.json");
  writeFileSync(
    file,
    JSON.stringify({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [{ kind: "purchase", gradeState: "raw", sales: [{ price: 100, date: ago(200), indexFactor: 1 }] }],
    }),
  );
  const r = run([file]);
  assert.equal(r.status, 2);
  assert.equal(JSON.parse(r.stdout).error, "purchase is not a value signal");
});

test("CLI flags no_index and drops sales older than 24 months", () => {
  const dir = mkdtempSync(join(tmpdir(), "thin-blend-"));
  const file = join(dir, "noindex.json");
  writeFileSync(
    file,
    JSON.stringify({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [{ kind: "exact", gradeState: "raw", sales: [{ price: 50, date: ago(40) }, { price: 500, date: ago(800) }] }],
    }),
  );
  const r = run([file]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.flags, ["no_index"]);
  assert.equal(out.confidence, 1);
  assert.equal(out.value, 50);
  assert.ok(out.excluded.some((e: { reason: string }) => e.reason === "age"));
});
