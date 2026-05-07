import type { ResearchAction, Lane } from "./research-engine";

const LANE_LABEL: Record<Lane, string> = {
  rookie: "rookie lane",
  steal: "steal lane",
  legacy: "legacy lane",
};

export default function AvoidSection({
  actions,
  lane,
}: {
  actions: ResearchAction[];
  lane: Lane;
}) {
  const sells = actions.filter((a) => a.signal === "SELL" && a.lane === lane);
  if (sells.length === 0) return null;

  return (
    <section style={{ marginTop: 28, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <h2
          className="bebas"
          style={{ fontSize: 13, letterSpacing: "0.1em", color: "var(--manu-red)" }}
        >
          AVOID
        </h2>
        <span className="mono" style={{ fontSize: 10, color: "var(--text-3)" }}>
          {LANE_LABEL[lane]}
        </span>
      </div>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--manu-red)",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 0 18px rgba(218,41,28,0.18), inset 0 0 0 1px rgba(218,41,28,0.08)",
      }}>
        {sells.map((a) => (
          <div
            key={a.id}
            style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0" }}
          >
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100,
              background: "var(--manu-red-soft)", color: "var(--manu-red)",
              border: "1px solid var(--manu-red)",
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: "nowrap",
            }}>
              SELL
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.player}</span>
            <span style={{
              fontSize: 11,
              color: "var(--text-3)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {a.reasoning.slice(0, 55)}…
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
