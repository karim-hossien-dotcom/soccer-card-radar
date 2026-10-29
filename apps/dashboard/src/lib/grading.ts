/**
 * G1: Grading tab. Pure grouping over Vault cards; IO lives in app/grading/load.ts.
 */
export type GCard = {
  id: string; status: string; item: string; player: string; gradeLabel: string; submissionId: string | null;
  cost: number | null; valueNow: number | null; psa10: number | null; psa9: number | null;
  net10: number | null; net9: number | null; decision: string | null; estimated: boolean;
};
export type Submission = {
  id: string; subNumber: string | null; grader: string; serviceLevel: string | null; feePerCard: number | null;
  status: string | null; arrivedOn: string | null; estComplete: string | null;
};
export type OpenSub = Submission & { cards: GCard[]; cost: number; if9: number; if10: number; priced: number };
export type BackCard = GCard & { gain: number | null; cracked: boolean };
export type Grading = {
  open: OpenSub[];
  back: BackCard[];
  backTotals: { cards: number; cost: number; value: number; gain: number; grades: [string, number][] };
  candidates: GCard[];
};

const DONE = /complet(ed)?$/i; // "Completed" is done; "Completing" is still at PSA
const sum = (xs: (number | null)[]) => Math.round(xs.reduce<number>((s, x) => s + (x ?? 0), 0) * 100) / 100;

export function buildGrading(cards: GCard[], subs: Submission[]): Grading {
  const atPsa = cards.filter((c) => c.status === "at_grader" && c.submissionId);
  const open = subs
    .filter((s) => !DONE.test(s.status ?? "") || atPsa.some((c) => c.submissionId === s.id))
    .map((s) => {
      const list = atPsa.filter((c) => c.submissionId === s.id);
      return { ...s, cards: list, cost: sum(list.map((c) => c.cost)), if9: sum(list.map((c) => c.psa9)), if10: sum(list.map((c) => c.psa10)), priced: list.filter((c) => c.psa9 !== null).length };
    })
    // An order with nothing left at PSA is done once any of its cards is back, whatever its status says.
    .filter((s) => s.cards.length > 0 || (!DONE.test(s.status ?? "") && !cards.some((c) => c.submissionId === s.id)))
    .sort((a, b) => (a.arrivedOn ?? "9").localeCompare(b.arrivedOn ?? "9"));

  const back = cards
    .filter((c) => c.submissionId && (c.status === "graded" || c.status === "raw"))
    .map((c) => ({ ...c, cracked: c.status === "raw", gain: c.valueNow !== null && c.cost !== null ? Math.round((c.valueNow - c.cost) * 100) / 100 : null }))
    .sort((a, b) => (a.submissionId ?? "").localeCompare(b.submissionId ?? "") || (b.valueNow ?? 0) - (a.valueNow ?? 0));
  const counts = new Map<string, number>();
  for (const c of back) { const g = c.cracked ? "Cracked" : c.gradeLabel; counts.set(g, (counts.get(g) ?? 0) + 1); }
  const withBoth = back.filter((c) => c.gain !== null);

  const candidates = cards
    .filter((c) => c.status === "raw" && !c.submissionId && c.decision?.startsWith("Grade"))
    .sort((a, b) => (b.net9 ?? -1e9) - (a.net9 ?? -1e9));

  return {
    open,
    back,
    backTotals: {
      cards: back.length,
      cost: sum(withBoth.map((c) => c.cost)),
      value: sum(withBoth.map((c) => c.valueNow)),
      gain: sum(withBoth.map((c) => c.gain)),
      grades: [...counts.entries()].sort((a, b) => (parseFloat(b[0].split(" ").pop() ?? "") || -1) - (parseFloat(a[0].split(" ").pop() ?? "") || -1)),
    },
    candidates,
  };
}

/** G1: Vault card -> Snipe "add target" link, prefilled with the latest real comp per grade. */
export type SnipePrefill = { card: string; player: string; raw?: number; psa9?: number; psa10?: number; asOf?: string; cert?: string };
export function snipeHref(p: SnipePrefill): string {
  const q = new URLSearchParams({ add: p.card, player: p.player });
  for (const k of ["raw", "psa9", "psa10", "asOf", "cert"] as const) if (p[k] !== undefined && p[k] !== null && p[k] !== "") q.set(k, String(p[k]));
  return `/snipe?${q.toString()}`;
}
export function prefillFromComps(card: string, player: string, cert: string | null, grader: string | null, comps: { grade: string; price: number; method: string; asOf: string }[]): SnipePrefill {
  const real = comps.filter((c) => c.method !== "value_used").sort((a, b) => b.asOf.localeCompare(a.asOf));
  const at = (g: string) => real.find((c) => c.grade === g);
  const picks = [at("raw"), at("PSA 9"), at("PSA 10")];
  const dates = picks.filter(Boolean).map((c) => c!.asOf).sort();
  return {
    card, player,
    raw: picks[0]?.price, psa9: picks[1]?.price, psa10: picks[2]?.price,
    asOf: dates[0], // oldest of the three, so the board flags it stale if any is old
    cert: grader === "PSA" && cert ? cert : undefined,
  };
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9/#]+/g, " ").trim();
/** An existing target for the same card: same PSA cert, or the same card text. */
export function findTarget<T extends { id: string; card: string; psaCert: string | null }>(targets: T[], card: string, cert?: string | null): T | null {
  return targets.find((t) => (cert && t.psaCert === cert) || norm(t.card) === norm(card)) ?? null;
}
