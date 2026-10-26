import { supabase } from "@soccer-card-radar/db";
import { snipeScore, DEFAULT_CONFIG, type SnipeConfig, type SnipeResult, type PlayerForm as FormStats } from "@soccer-card-radar/shared";
import { getResearchActions, type ResearchAction } from "../research-engine";
import { assignTier } from "../helpers";
import { matchesTarget } from "@/lib/match-title";
import { budgetLeft, type Bid, type Budget } from "@/lib/budget";

export type Target = {
  id: string; actionId: string; card: string; query: string; mustInclude: string[]; exclude: string[];
  raw: number | null; psa9: number | null; psa10: number | null; popTotal: number | null; pop9: number | null; pop10: number | null;
  printRun: number | null; ssp: boolean; compsAsOf: string | null; confidence: string | null; notes: string | null; active: boolean;
  psaCert: string | null; psaSpecId: number | null; popAsOf: string | null;
};
export type FormRow = FormStats & {
  actionId: string; asOf: string; season: string | null; club: string | null; league: string | null; scope: string | null;
  ratingSource: string | null; prior: Record<string, number | null> | null; note: string | null; sources: string[]; approved: boolean;
};
type ListingRow = { externalId?: string; title: string; priceUSD: number; url: string; rawData: Record<string, unknown> | null; actionId: string | null; lastSeenAt: string; soldAt: string | null };
type Rows = { targets: Target[]; forms: FormRow[]; listings: ListingRow[]; assumptions: { key: string; value: number }[]; ownSubs: { grade: string | null }[]; bids?: Bid[] };

export type LiveListing = { externalId: string; title: string; url: string; price: number; kind: "auction" | "buy"; endsAt: string | null; bids: number | null };
export type BoardRow = {
  target: Target; player: string; signal: ResearchAction["signal"]; tier: "S" | "A" | "B"; legend: boolean;
  form: FormRow | null; result: SnipeResult; live: LiveListing[]; livePrice: number | null;
  staleComps: boolean; // comps older than 14 days: refresh before bidding
  askMedian: number | null; // median live Buy It Now ask for this exact card (free drift check on the raw comp)
  rawDrift: number | null; // raw comp / ask median; far from 1 means the comp is out of date or the target matches the wrong card
};
export type PlayerRow = { action: ResearchAction; latest: FormRow | null; legend: boolean };
/** Karim's own PSA results on cards he bought raw and submitted: the evidence for the gem haircut. */
export type OwnRate = { graded: number; psa10: number };
export type Decision = { status: Bid["status"]; maxBid: number };
export type SnipeData = { budget: Budget; decisions: Record<string, Decision>; rows: BoardRow[]; players: PlayerRow[]; actions: { id: string; player: string }[]; gemHaircut: number; psa9Haircut: number; own: OwnRate };

const FRESH_HOURS = 48;
const STALE_COMP_DAYS = 14;
const fixtureMode = () => !!process.env.SNIPE_FIXTURE && process.env.NODE_ENV !== "production";
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function fetchRows(): Promise<Rows> {
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(process.env.SNIPE_FIXTURE!, "utf8")) as Rows;
  }
  const cutoff = new Date(Date.now() - FRESH_HOURS * 3600_000).toISOString();
  const [t, f, a, o] = await Promise.all([
    supabase.from("SnipeTarget").select("*").eq("active", true),
    supabase.from("PlayerForm").select("*").order("asOf", { ascending: false }),
    supabase.from("Assumption").select("key, value"),
    supabase.from("Card").select("grade").eq("status", "graded").eq("grader", "PSA").not("submissionId", "is", null),
  ]);
  for (const r of [t, f, a, o]) if (r.error) throw new Error(r.error.message);
  const ids = [...new Set((t.data ?? []).map((x) => x.actionId))];
  const l = ids.length
    ? await supabase.from("Listing").select('"externalId", title, "priceUSD", url, "rawData", "actionId", "lastSeenAt", "soldAt"').in("actionId", ids).is("soldAt", null).gte("lastSeenAt", cutoff)
    : { data: [], error: null };
  if (l.error) throw new Error(l.error.message);
  return {
    targets: (t.data ?? []).map((x) => ({ ...x, raw: num(x.raw), psa9: num(x.psa9), psa10: num(x.psa10) })) as Target[],
    forms: (f.data ?? []).map((x) => ({ ...x, avgRating: num(x.avgRating) })) as FormRow[],
    listings: (l.data ?? []) as ListingRow[],
    assumptions: (a.data ?? []).map((x) => ({ key: x.key, value: Number(x.value) })),
    ownSubs: o.data ?? [],
    bids: (await loadBids()).bids,
  };
}

const budgetOf = (assumptions: Rows["assumptions"]) => assumptions.find((a) => a.key === "snipe_budget")?.value ?? 500;

/** C3: decisions from the last 60 days (enough for the current 14-day cycle) and the cycle budget. */
export async function loadBids(): Promise<{ bids: Bid[]; budget: number }> {
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    const rows = JSON.parse(await readFile(process.env.SNIPE_FIXTURE!, "utf8")) as Rows;
    return { bids: rows.bids ?? [], budget: budgetOf(rows.assumptions) };
  }
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const [b, a] = await Promise.all([
    supabase.from("SnipeBid").select('"externalId", "maxBid", status, "wonPrice", "createdAt"').gte("createdAt", since),
    supabase.from("Assumption").select("key, value").eq("key", "snipe_budget"),
  ]);
  if (b.error) throw new Error(b.error.message);
  return {
    bids: (b.data ?? []).map((x) => ({ ...x, maxBid: Number(x.maxBid), wonPrice: x.wonPrice === null ? null : Number(x.wonPrice) })) as Bid[],
    budget: Number(a.data?.[0]?.value ?? 500),
  };
}

/** Weights and fee from Assumption (snipe_w_*, fee_to_grade_a_raw_in_hand_card); defaults otherwise. */
function config(assumptions: Rows["assumptions"]): SnipeConfig {
  const a = Object.fromEntries(assumptions.map((x) => [x.key, x.value]));
  const w = { ...DEFAULT_CONFIG.weights };
  for (const k of Object.keys(w) as (keyof typeof w)[]) if (typeof a[`snipe_w_${k}`] === "number") w[k] = a[`snipe_w_${k}`];
  return {
    ...DEFAULT_CONFIG, weights: w,
    gradingFee: a.fee_to_grade_a_raw_in_hand_card ?? DEFAULT_CONFIG.gradingFee,
    gemHaircut: a.snipe_gem_haircut ?? DEFAULT_CONFIG.gemHaircut,
    psa9Haircut: a.snipe_psa9_haircut ?? DEFAULT_CONFIG.psa9Haircut,
  };
}

const PAGE: Record<string, "rookie" | "stars" | "legends"> = { rookie: "rookie", steal: "stars", legacy: "legends" };

export function liveFor(t: Target, listings: ListingRow[], now = Date.now()): LiveListing[] {
  return listings
    .filter((l) => l.actionId === t.actionId && matchesTarget(l.title, t.mustInclude, t.exclude))
    .map((l) => {
      const raw = l.rawData ?? {};
      const endsAt = (raw.itemEndDate as string) ?? null;
      return { externalId: l.externalId ?? "", title: l.title, url: l.url, price: l.priceUSD, kind: raw.isAuction ? "auction" : "buy", endsAt, bids: (raw.bidCount as number) ?? null } as LiveListing;
    })
    .filter((l) => l.kind === "buy" || !l.endsAt || new Date(l.endsAt).getTime() > now)
    .sort((a, b) => (a.kind === b.kind ? (a.kind === "auction" ? (a.endsAt ?? "").localeCompare(b.endsAt ?? "") : a.price - b.price) : a.kind === "auction" ? -1 : 1));
}

export function buildBoard(rows: Rows, now = new Date()): SnipeData {
  const actions = getResearchActions();
  const byId = new Map(actions.map((a) => [a.id, a]));
  const cfg = config(rows.assumptions);
  const latest = (id: string, approvedOnly: boolean) =>
    rows.forms.filter((f) => f.actionId === id && (!approvedOnly || f.approved)).sort((a, b) => b.asOf.localeCompare(a.asOf))[0] ?? null;
  const staleBefore = new Date(now.getTime() - STALE_COMP_DAYS * 86400_000).toISOString().slice(0, 10);

  const board: BoardRow[] = rows.targets.filter((t) => t.active).map((t) => {
    const a = byId.get(t.actionId);
    const signal = a?.signal ?? "HOLD";
    const legend = a?.lane === "legacy";
    const tier = a ? assignTier(a.signal, a.lane, a.catalyst, PAGE[a.lane]) : "B";
    const form = legend ? null : latest(t.actionId, true);
    const live = liveFor(t, rows.listings, now.getTime());
    // Price to judge: soonest-ending auction, else cheapest Buy It Now.
    const livePrice = live.length ? live[0].price : null;
    const result = snipeScore(t, livePrice, { signal, tier, legend, form }, cfg);
    const asks = live.filter((l) => l.kind === "buy").map((l) => l.price).sort((x, y) => x - y);
    const askMedian = asks.length >= 3 ? asks[Math.floor(asks.length / 2)] : null;
    return {
      target: t, player: a?.player ?? t.actionId, signal, tier, legend, form, result, live, livePrice,
      staleComps: !t.compsAsOf || t.compsAsOf < staleBefore,
      askMedian, rawDrift: askMedian && t.raw ? Math.round((t.raw / askMedian) * 100) / 100 : null,
    };
  });
  // Biddable now first (a live listing for this exact card), then the watch list; each by score.
  board.sort((x, y) => Number(!x.live.length) - Number(!y.live.length) || (y.result.score ?? -1) - (x.result.score ?? -1));

  const players: PlayerRow[] = actions.map((a) => ({ action: a, latest: latest(a.id, false), legend: a.lane === "legacy" }));
  const own = { graded: (rows.ownSubs ?? []).length, psa10: (rows.ownSubs ?? []).filter((c) => c.grade === "10").length };
  const bids = rows.bids ?? [];
  const decisions = Object.fromEntries(bids.map((b) => [b.externalId, { status: b.status, maxBid: b.maxBid }]));
  return { budget: budgetLeft(bids, budgetOf(rows.assumptions), now), decisions, rows: board, players, actions: actions.map((a) => ({ id: a.id, player: a.player })), gemHaircut: cfg.gemHaircut, psa9Haircut: cfg.psa9Haircut, own };
}

export async function loadSnipe(): Promise<SnipeData> {
  return buildBoard(await fetchRows());
}

/** Fixture-mode writes for UAT (never used in production). */
export async function mutateFixture(fn: (rows: Rows) => void): Promise<boolean> {
  if (!fixtureMode()) return false;
  const { readFile, writeFile } = await import("node:fs/promises");
  const rows = JSON.parse(await readFile(process.env.SNIPE_FIXTURE!, "utf8")) as Rows;
  fn(rows);
  await writeFile(process.env.SNIPE_FIXTURE!, JSON.stringify(rows));
  return true;
}
