/** G9b: the phone's flash (torch) for the four side-light shots of the live scanner.
 * Torch = MediaStreamTrack capability `torch` (Chrome Android, iOS Safari 17.4+); set with applyConstraints. */
import type { Shape } from "./scan-checks";

/** The bits of MediaStreamTrack used here (lets tests pass a mock). */
export type TorchTrack = {
  getCapabilities?: () => object; // MediaTrackCapabilities; `torch` isn't in the DOM typings yet
  applyConstraints: (c: MediaTrackConstraints) => Promise<void>;
};

/** True when the camera reports a controllable torch. */
export function hasTorch(track: TorchTrack | null | undefined): boolean {
  if (!track || typeof track.getCapabilities !== "function") return false;
  try {
    const t = (track.getCapabilities() as { torch?: unknown }).torch;
    return t === true || (Array.isArray(t) && t.includes(true));
  } catch {
    return false;
  }
}

/** Torch should be lit: a light step, the camera has one, and the user hasn't switched it off. */
export const torchWanted = (lightStep: boolean, supported: boolean, enabled: boolean) => lightStep && supported && enabled;

/** Turn the torch on/off. Resolves to whether the camera accepted it (never throws). */
export async function setTorch(track: TorchTrack | null | undefined, on: boolean): Promise<boolean> {
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

/** Instruction for a side-light step. With flash: tilt the phone; without: the existing lamp wording. */
export function lightIntro(side: string, first: boolean, flash: boolean): string {
  if (flash) return `Flash on. Tilt the phone low over the card's ${side} edge (about 30 degrees) so the light skims the surface`;
  return `${first ? "Now light it from the side: hold a lamp or a second phone's flashlight low" : "Move the light low"} on the card's ${side} side, so it skims across the card`;
}

/** Shape with the tilt the flash shot asks for forgiven: angle and skew ignored, card ratio within 25% (a 30-degree tilt
 * foreshortens one side by ~13%). Fill and "all four edges inside" still apply. */
export const TILT_RATIO_TOL = 0.25;
export function forTilt(s: Shape): Shape {
  return { ...s, angleDev: 0, skew: 0, ratioErr: s.ratioErr <= TILT_RATIO_TOL ? 0 : s.ratioErr };
}

/** Upload field for the side-light shots: "flash" when any was lit by the phone's torch (server keeps them look-only). */
export const lightField = (flashUsed: boolean): string | null => (flashUsed ? "flash" : null);
