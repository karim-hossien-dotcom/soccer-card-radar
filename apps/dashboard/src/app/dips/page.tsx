import { supabase } from "@soccer-card-radar/db";
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

  const [listingsRes, statsRes] = await Promise.all([
    supabase
      .from("Listing")
      .select("priceUSD, actionId, lane")
      .is("soldAt", null)
      .gte("lastSeenAt", freshCutoff),
    supabase
      .from("PlayerSoldStats")
      .select("actionId, median, fairValueMid, sampleSize, trend7dPct, trend30dPct, scrapedAt, sourceStatus"),
  ]);

  const stats = new Map<string, NonNullable<typeof statsRes.data>[number]>();
  for (const s of statsRes.data ?? []) stats.set(s.actionId, s);

  // Group listings by actionId
  const listingsByAction = new Map<string, number[]>();
  for (const l of listingsRes.data ?? []) {
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

function laneColor(lane: string): string {
  if (lane === "rookie") return "var(--green)";
  if (lane === "steal") return "#3b82f6";
  return "var(--gold)";
}

export default async function DipsPage() {
  const { rows, warning } = await loadDips();

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2 className="bebas" style={{ fontSize: 13, letterSpacing: "0.1em", color: "var(--manu-red)", marginBottom: 4 }}>
          DIP RADAR
        </h2>
        <p className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
          Players where active asking prices are above recent sold medians — sellers haven&apos;t lowered yet
        </p>
      </div>

      {warning && (
        <div style={{
          padding: 16,
          background: "var(--surface)",
          border: "1px dashed var(--border)",
          borderRadius: 12,
          color: "var(--text-2)",
          fontSize: 12,
          marginBottom: 16,
        }}>
          <i className="fas fa-info-circle" style={{ marginRight: 6, color: "var(--manu-gold)" }} />
          {warning}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>
                <th style={{ textAlign: "left",  padding: "10px 12px" }}>Player</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Sold mid</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Active mid</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Gap</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>30d</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>7d</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Sold #</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Active #</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Cheapest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const conv = conviction(r.gapPct, r.trend30d);
                const convColor = conv === "high" ? "var(--manu-red)" : conv === "medium" ? "var(--manu-gold)" : "var(--text-3)";
                return (
                  <tr key={r.actionId} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.player}</div>
                      <div style={{ fontSize: 9, color: laneColor(r.lane), letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        {r.lane}
                        {r.signal === "SELL" && (
                          <span style={{ color: "var(--manu-red)", marginLeft: 6 }}>· SELL TARGET</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }} className="mono">{fmtMoney(r.soldMedian)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }} className="mono">{fmtMoney(r.activeMedian)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: convColor, fontWeight: 600 }} className="mono">
                      {r.gapPct >= 0 ? "+" : ""}{r.gapPct}%
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: (r.trend30d ?? 0) < 0 ? "var(--manu-red)" : "var(--green)" }} className="mono">
                      {r.trend30d === null ? "—" : `${r.trend30d >= 0 ? "↑" : "↓"}${Math.abs(r.trend30d).toFixed(0)}%`}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: (r.trend7d ?? 0) < 0 ? "var(--manu-red)" : "var(--green)" }} className="mono">
                      {r.trend7d === null ? "—" : `${r.trend7d >= 0 ? "↑" : "↓"}${Math.abs(r.trend7d).toFixed(0)}%`}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-3)" }} className="mono">{r.sampleSize}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-3)" }} className="mono">{r.listingsCount}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--green)" }} className="mono">{fmtMoney(r.cheapest)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details style={{ marginTop: 16 }}>
        <summary className="bebas" style={{ fontSize: 13, color: "var(--text-3)", cursor: "pointer", letterSpacing: "0.08em" }}>
          HOW THIS RANKING WORKS
        </summary>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginTop: 8, fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
          <p><strong style={{ color: "var(--manu-gold)" }}>Gap</strong> = (active median − sold mid) / sold mid. Positive means sellers haven&apos;t lowered listings to match the most recent sold prices.</p>
          <p><strong style={{ color: "var(--manu-gold)" }}>30d / 7d trend</strong> from sold transactions only. Red ↓ = market actively softening.</p>
          <p><strong style={{ color: "var(--manu-red)" }}>High conviction (red %)</strong> = gap ≥ 15% AND 30d trend ≤ −5%.</p>
          <p><strong style={{ color: "var(--manu-gold)" }}>Medium</strong> = gap ≥ 10%, market not yet recovered.</p>
          <p style={{ marginTop: 8, color: "var(--text-3)" }}>
            <i className="fas fa-info-circle mr-1"></i>
            For long-term &quot;Nov 2025 vs now&quot; comparisons we need accumulated weekly history. Started this week — sparkline view comes after ~12 weeks of snapshots.
          </p>
        </div>
      </details>
    </>
  );
}
