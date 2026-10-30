import { test } from "node:test";
import assert from "node:assert/strict";
import { hasTorch, torchWanted, setTorch, lightIntro, forTilt, lightField, type TorchTrack } from "./torch.ts";

/** Mock camera track: records every torch constraint applied. */
function track(caps: Record<string, unknown> | null, fail = false) {
  const applied: boolean[] = [];
  const t: TorchTrack = {
    ...(caps ? { getCapabilities: () => caps } : {}),
    applyConstraints: async (c) => {
      if (fail) throw new Error("OverconstrainedError");
      applied.push(Boolean((c.advanced?.[0] as { torch?: boolean })?.torch));
    },
  };
  return { t, applied };
}

test("torch support comes from the track's capabilities", () => {
  assert.equal(hasTorch(track({ torch: true }).t), true);
  assert.equal(hasTorch(track({ torch: [false, true] }).t), true);
  assert.equal(hasTorch(track({ torch: false }).t), false);
  assert.equal(hasTorch(track({}).t), false);
  assert.equal(hasTorch(track(null).t), false); // browser without getCapabilities (older Firefox)
  assert.equal(hasTorch(null), false);
  assert.equal(hasTorch({ getCapabilities: () => { throw new Error("x"); }, applyConstraints: async () => {} }), false);
});

test("torch is lit only on light steps, with support, and when the toggle is on", () => {
  assert.equal(torchWanted(true, true, true), true);
  assert.equal(torchWanted(false, true, true), false); // front / back
  assert.equal(torchWanted(true, false, true), false); // no torch
  assert.equal(torchWanted(true, true, false), false); // user switched it off
});

test("a scan with torch: on for the 4 light steps, off for front, back and close", async () => {
  const { t, applied } = track({ torch: true });
  const steps = ["front", "lightL", "lightT", "lightR", "lightB", "back"];
  for (const st of steps) await setTorch(t, torchWanted(st.startsWith("light"), hasTorch(t), true));
  await setTorch(t, false); // close
  assert.deepEqual(applied, [false, true, true, true, true, false, false]);
});

test("setTorch never throws and reports failure", async () => {
  assert.equal(await setTorch(track({ torch: true }, true).t, true), false);
  assert.equal(await setTorch(null, true), false);
  assert.equal(await setTorch(track({ torch: true }).t, true), true);
});

test("light-step wording: tilt the phone with flash, lamp wording unchanged without", () => {
  assert.equal(lightIntro("left", true, true), "Flash on. Tilt the phone low over the card's left edge (about 30 degrees) so the light skims the surface");
  assert.equal(lightIntro("bottom", false, true), "Flash on. Tilt the phone low over the card's bottom edge (about 30 degrees) so the light skims the surface");
  assert.equal(lightIntro("left", true, false), "Now light it from the side: hold a lamp or a second phone's flashlight low on the card's left side, so it skims across the card");
  assert.equal(lightIntro("top", false, false), "Move the light low on the card's top side, so it skims across the card");
});

test("tilted flash shot: angle and skew forgiven, ratio within 25%", () => {
  const tilted = { fill: 0.4, ratioErr: 0.13, angleDev: 14, skew: 0.2, inside: true };
  assert.deepEqual(forTilt(tilted), { fill: 0.4, ratioErr: 0, angleDev: 0, skew: 0, inside: true });
  assert.equal(forTilt({ ...tilted, ratioErr: 0.4 }).ratioErr, 0.4); // a different object is still refused
  assert.equal(forTilt({ ...tilted, inside: false }).inside, false);
});

test("upload flag only when flash was used", () => {
  assert.equal(lightField(true), "flash");
  assert.equal(lightField(false), null);
});
