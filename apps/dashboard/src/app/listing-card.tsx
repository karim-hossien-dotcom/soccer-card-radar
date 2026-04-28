"use client";

interface ListingCardProps {
  id: string;
  score: number;
  reasons: Record<string, boolean>;
  title: string;
  priceUSD: number;
  platform: string;
  url: string;
  player: string;
  yearMin: number | null;
  yearMax: number | null;
  recommendation: string;
  index: number;
}

const reasonLabels: Record<string, string> = {
  yearInRange: "YEAR",
  setKeywordHit: "SET",
  parallelTermHit: "PARALLEL",
  belowPriceCeiling: "PRICE OK",
  autographMatch: "AUTO",
};

const recStyles: Record<string, { color: string; bg: string; label: string }> = {
  buy: { color: "var(--buy-now)", bg: "var(--buy-now-bg)", label: "BUY NOW" },
  bid: { color: "var(--bid)", bg: "var(--bid-bg)", label: "BID / OFFER" },
  watch: { color: "var(--watch)", bg: "var(--watch-bg)", label: "WATCH" },
  skip: { color: "var(--skip)", bg: "var(--skip-bg)", label: "SKIP" },
};

export default function ListingCard(props: ListingCardProps) {
  const { score, reasons, title, priceUSD, platform, url, player, yearMin, yearMax, recommendation, index } = props;

  const rec = recStyles[recommendation] ?? recStyles.skip;

  const scoreColor =
    score >= 90
      ? "var(--score-hot)"
      : score >= 80
        ? "var(--score-high)"
        : score >= 65
          ? "var(--score-mid)"
          : "var(--score-low)";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="listing-card"
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr auto",
        gap: "1rem",
        alignItems: "center",
        padding: "0.875rem 1rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        transition: "all 0.15s ease",
        animation: `fadeInUp 0.3s ease-out ${index * 30}ms both`,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "var(--bg-card-hover)";
        el.style.borderColor = "var(--border-hover)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "var(--bg-card)";
        el.style.borderColor = "var(--border)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Score */}
      <div style={{ textAlign: "center" }}>
        <div
          className="mono"
          style={{ fontSize: "1.5rem", fontWeight: 700, color: scoreColor, lineHeight: 1 }}
        >
          {score}
        </div>
        <div
          className="mono"
          style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "2px" }}
        >
          SCORE
        </div>
      </div>

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.35rem",
            fontSize: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>{player}</span>
          <span style={{ color: "var(--text-muted)" }}>
            {yearMin}–{yearMax}
          </span>
          <span
            className="mono"
            style={{
              fontSize: "0.6rem",
              padding: "1px 5px",
              borderRadius: "3px",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            {platform}
          </span>

          {Object.entries(reasons).map(([key, value]) => {
            if (!value || !reasonLabels[key]) return null;
            return (
              <span
                key={key}
                className="mono"
                style={{
                  fontSize: "0.55rem",
                  padding: "1px 4px",
                  borderRadius: "2px",
                  background: "var(--buy-now-bg)",
                  color: "var(--buy-now)",
                  letterSpacing: "0.03em",
                }}
              >
                {reasonLabels[key]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Price + Action */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          className="mono"
          style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}
        >
          ${priceUSD < 1000
            ? priceUSD.toFixed(2)
            : priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
        <div
          className="mono"
          style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "3px",
            background: rec.bg,
            color: rec.color,
            display: "inline-block",
            marginTop: "4px",
            letterSpacing: "0.06em",
          }}
        >
          {rec.label}
        </div>
      </div>
    </a>
  );
}
