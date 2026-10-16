/** A4: PSA Public API (api.psacard.com/publicapi) — pop + images for graded certs. Pure; IO injected. */

export const PSA_BASE = "https://api.psacard.com/publicapi";

export type PsaPop = { total: number; gem10: number; pop9: number; gemRate: number | null };
export type PsaTarget = { cardId: string; cert: string; specId: number | null; needsImage: boolean };
export type PsaFetch = (path: string) => Promise<{ status: number; body: unknown }>;
export type PsaRefreshResult = {
  calls: number;
  specIds: { cardId: string; specId: number }[];
  pops: ({ cardId: string } & PsaPop)[];
  images: { cardId: string; url: string }[];
  errors: { cardId: string; cert: string; reason: string }[];
  stopped: string | null; // why the run ended early (budget, rate limit, auth)
  pending: number; // targets not reached
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

/** GetPSASpecPopulation -> totals. Gem rate = PSA 10 / graded (excludes Authentic). */
export function popFromSpec(body: unknown): PsaPop | null {
  const p = (body as { PSAPop?: Record<string, unknown> } | null)?.PSAPop;
  if (!p) return null;
  const total = num(p.Total), gem10 = num(p.Grade10), pop9 = num(p.Grade9), graded = total - num(p.Auth);
  return { total, gem10, pop9, gemRate: graded > 0 ? Math.round((gem10 / graded) * 10_000) / 10_000 : null };
}

export function specFromCert(body: unknown): number | null {
  const id = (body as { PSACert?: { SpecID?: unknown } } | null)?.PSACert?.SpecID;
  return typeof id === "number" && id > 0 ? id : null;
}

/** GetImagesByCertNumber has no published schema: accept [{IsFrontImage, ImageURL}] and close variants. */
export function frontImage(body: unknown): string | null {
  const list = Array.isArray(body) ? body : ((body as { Images?: unknown[] } | null)?.Images ?? []);
  const urlOf = (x: Record<string, unknown>) => (x.ImageURL ?? x.ImageUrl ?? x.Url ?? x.url) as string | undefined;
  const items = (list as Record<string, unknown>[]).filter((x) => x && typeof urlOf(x) === "string" && /^https:\/\//.test(urlOf(x)!));
  const front = items.find((x) => x.IsFrontImage === true) ?? items[0];
  return front ? urlOf(front)! : null;
}

/** Calls PSA within `budget` requests. Spec pops are cached per run (several cards can share a spec). */
export async function refreshPsa(targets: PsaTarget[], fetchPsa: PsaFetch, budget: number): Promise<PsaRefreshResult> {
  const r: PsaRefreshResult = { calls: 0, specIds: [], pops: [], images: [], errors: [], stopped: null, pending: 0 };
  const popCache = new Map<number, PsaPop | null>();
  const call = async (path: string) => {
    r.calls++;
    const res = await fetchPsa(path);
    if (res.status === 401 || res.status === 403) throw new Stop("PSA rejected the token (check PSA_API_TOKEN)");
    if (res.status === 429) throw new Stop("PSA daily limit reached");
    return res;
  };
  let i = 0;
  try {
    for (; i < targets.length; i++) {
      const t = targets[i];
      const need = (t.specId ? 0 : 1) + 1 + (t.needsImage ? 1 : 0);
      if (r.calls + need > budget) { r.stopped = "call budget used"; break; }
      let specId = t.specId;
      if (!specId) {
        const res = await call(`/cert/GetByCertNumber/${encodeURIComponent(t.cert)}`);
        specId = res.status === 200 ? specFromCert(res.body) : null;
        if (!specId) { r.errors.push({ cardId: t.cardId, cert: t.cert, reason: `cert lookup: no spec (HTTP ${res.status})` }); continue; }
        r.specIds.push({ cardId: t.cardId, specId });
      }
      if (!popCache.has(specId)) {
        const res = await call(`/pop/GetPSASpecPopulation/${specId}`);
        popCache.set(specId, res.status === 200 ? popFromSpec(res.body) : null);
      }
      const pop = popCache.get(specId);
      if (pop) r.pops.push({ cardId: t.cardId, ...pop });
      else r.errors.push({ cardId: t.cardId, cert: t.cert, reason: `no population for spec ${specId}` });
      if (t.needsImage) {
        const res = await call(`/cert/GetImagesByCertNumber/${encodeURIComponent(t.cert)}`);
        const url = res.status === 200 ? frontImage(res.body) : null;
        if (url) r.images.push({ cardId: t.cardId, url });
      }
    }
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
    r.stopped = e.message;
  }
  r.pending = targets.length - i;
  return r;
}

class Stop extends Error {}
