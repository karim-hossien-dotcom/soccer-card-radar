import { dealRows } from "../deal-rows";
import { getResearchActions } from "../research-engine";

export const dynamic = "force-dynamic";

const MAX_STALE_HOURS = 48;
const PRICE_CAP: Record<string, number> = { rookie: 1000, steal: 2000, legacy: 5000 };

type DipRow = {
  actionId: string;
  player: string;
  lane: "rookie" | "steal" | "legacy";
  signal: "BUY" | "SELL" | "HOLD";
  soldMedian: number;
  activeMedian: number;
  cheapest: number;
  listingsCount: number;
  sampleSize: number;
  trend7d: number | null;
  trend30d: number | null;
  gapPct: number;          // (active - sold) / sold × 100, positive = sellers are above market
  scrapedAt: string;
};

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function conviction(gap: number, trend: number | null): "high" | "medium" | "low" {
  // Strong: sellers >15% above sold AND market actively dropping
  if (gap >= 15 && (trend ?? 0) <= -5) return "high";
  if (gap >= 10) return "medium";
  return "low";
}

async function loadDips(): Promise<{ rows: DipRow[]; soldDataMissing: boolean; warning?: string }> {
  const actions = getResearchActions();
  const freshCutoff = new Date(Date.now() - MAX_STALE_HOURS * 3600_000).toISOString();

  const { listings, stats: statRows } = await dealRows(freshCutoff);

  const stats = new Map(statRows.map((s) => [s.actionId, s]));

  // Group listings by actionId
  const listingsByAction = new Map<string, number[]>();
  for (const l of listings) {
    if (!l.actionId) continue;
    const cap = PRICE_CAP[l.lane ?? "rookie"] ?? 1000;
    if (l.priceUSD > cap) continue;
    const arr = listingsByAction.get(l.actionId) ?? [];
    arr.push(l.priceUSD);
    listingsByAction.set(l.actionId, arr);
  }

  const rows: DipRow[] = [];
  let soldDataMissing = true;

  for (const action of actions) {
    const prices = listingsByAction.get(action.id) ?? [];
    const stat = stats.get(action.id);
    if (!stat || stat.sampleSize === 0) continue;             // need sold data for a real gap
    if (prices.length === 0) continue;                         // need active listings
    soldDataMissing = false;

    const sold = (stat.fairValueMid ?? stat.median ?? 0) as number;
    if (sold <= 0) continue;
    const active = median(prices);
    const gap = ((active - sold) / sold) * 100;

    rows.push({
      actionId: action.id,
      player: action.player,
      lane: action.lane,
      signal: action.signal,
      soldMedian: sold,
      activeMedian: active,
      cheapest: Math.min(...prices),
      listingsCount: prices.length,
      sampleSize: stat.sampleSize,
      trend7d: stat.trend7dPct,
      trend30d: stat.trend30dPct,
      gapPct: Math.round(gap * 10) / 10,
      scrapedAt: stat.scrapedAt,
    });
  }

  rows.sort((a, b) => b.gapPct - a.gapPct);
  const out: { rows: DipRow[]; soldDataMissing: boolean; warning?: string } = { rows, soldDataMissing: soldDataMissing && rows.length === 0 };
  if (rows.length === 0) {
    out.warning = "No sold-comp data yet. Run /api/sold-scan to populate PlayerSoldStats.";
  }
  return out;
}

function fmtMoney(n: number): string {
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

const LANE: Record<string, string> = { rookie: "Rookie", steal: "Star", legacy: "Legend" };
const trend = (t: number | null) => (t === null ? <span className="muted">—</span> : <span className={t < 0 ? "loss" : "gain"}>{t >= 0 ? "+" : "−"}{Math.abs(t).toFixed(0)}%</span>);

export default async function DipsPage() {
  const { rows, warning } = await loadDips();

  return (
    <>
      <header className="page-head">
        <h1>Dips</h1>
        <p>Players whose asking prices sit above what their cards actually sold for. Sellers haven&apos;t caught up yet, so offers below ask tend to land.</p>
      </header>

      {warning && <p className="notice">{warning}</p>}

      {rows.length > 0 && (
        <div className="sheet-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="rank">#</th>
                <th>Player</th>
                <th className="num">Sold mid</th>
                <th className="num">Asking mid</th>
                <th className="num">Gap</th>
                <th className="num">30 days</th>
                <th className="num">7 days</th>
                <th className="num">Sales</th>
                <th className="num">Listings</th>
                <th className="num">Cheapest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const conv = conviction(r.gapPct, r.trend30d);
                return (
                  <tr key={r.actionId}>
                    <td className="rank">{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 650 }}>{r.player}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {LANE[r.lane]}{r.signal === "SELL" && <span className="loss"> sell target</span>}
                      </div>
                    </td>
                    <td className="num">{fmtMoney(r.soldMedian)}</td>
                    <td className="num">{fmtMoney(r.activeMedian)}</td>
                    <td className={`num ${conv === "high" ? "loss" : ""}`} style={{ fontWeight: conv === "low" ? 400 : 700 }}>
                      {r.gapPct >= 0 ? "+" : ""}{r.gapPct}%
                    </td>
                    <td className="num">{trend(r.trend30d)}</td>
                    <td className="num">{trend(r.trend7d)}</td>
                    <td className="num muted">{r.sampleSize}</td>
                    <td className="num muted">{r.listingsCount}</td>
                    <td className="num">{fmtMoney(r.cheapest)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details className="notes">
        <summary>How this ranking works</summary>
        <div>
          <p><strong>Gap</strong> is the asking median minus the sold mid, as a share of the sold mid. Positive means sellers haven&apos;t lowered listings to match recent sales.</p>
          <p><strong>30 and 7 days</strong> trends use sold transactions only. A red fall means the market is softening.</p>
          <p><strong>Red bold gap</strong>: high conviction, a gap of 15% or more and a 30-day trend of −5% or worse. <strong>Bold gap</strong>: medium, a gap of 10% or more.</p>
          <p>Long-run comparisons need accumulated weekly history; a trend view follows after about 12 weeks of snapshots.</p>
        </div>
      </details>
    </>
  );
}
