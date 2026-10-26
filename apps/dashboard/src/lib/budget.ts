/** C3: $ budget per 14-day cycle. Approved bids count at their max until they end; won bids at what was paid. */
export type BidStatus = "approved" | "skipped" | "cancelled" | "won" | "lost";
export type Bid = { externalId: string; maxBid: number; status: BidStatus; wonPrice: number | null; createdAt: string };
export type Budget = { budget: number; committed: number; left: number; start: string; end: string };

const DAY = 86_400_000;
export const CYCLE_DAYS = 14;
export const CYCLE_ANCHOR = "2026-10-26"; // first cycle starts Monday 26 Oct

export function cycle(now: Date, anchor = CYCLE_ANCHOR) {
  const a = Date.parse(`${anchor}T00:00:00Z`);
  const n = Math.floor((now.getTime() - a) / (CYCLE_DAYS * DAY));
  const start = a + n * CYCLE_DAYS * DAY;
  return { start: new Date(start), end: new Date(start + CYCLE_DAYS * DAY) };
}

const cents = (x: number) => Math.round(x * 100) / 100;

/** Budget for the cycle containing `now`. `ignore` leaves out one listing (re-approving it at a new max). */
export function budgetLeft(bids: Bid[], budget: number, now = new Date(), ignore?: string): Budget {
  const { start, end } = cycle(now);
  const committed = bids
    .filter((b) => b.externalId !== ignore && Date.parse(b.createdAt) >= start.getTime() && Date.parse(b.createdAt) < end.getTime())
    .reduce((s, b) => s + (b.status === "approved" ? b.maxBid : b.status === "won" ? (b.wonPrice ?? b.maxBid) : 0), 0);
  return { budget, committed: cents(committed), left: cents(budget - committed), start: start.toISOString().slice(0, 10), end: new Date(end.getTime() - DAY).toISOString().slice(0, 10) };
}

/** Why an approval is refused, or null when it fits. */
export function refuse(maxBid: number, endsAt: string | null, left: number, now = new Date()): string | null {
  if (!(maxBid > 0)) return "Max bid must be more than $0";
  if (endsAt && Date.parse(endsAt) <= now.getTime()) return "This auction has already ended";
  if (maxBid > left) return `Only $${left.toFixed(2)} left in this cycle's budget`;
  return null;
}
