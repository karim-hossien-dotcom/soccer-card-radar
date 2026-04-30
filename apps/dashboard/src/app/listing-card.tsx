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
  marketPrice: number | null;
  discount: number | null;
  index: number;
}

const reasonLabels: Record<string, string> = {
  yearInRange: "Year",
  setKeywordHit: "Set",
  parallelTermHit: "Parallel",
  belowPriceCeiling: "Price OK",
  autographMatch: "Auto",
};

const recStyles: Record<string, { color: string; bg: string; label: string; border: string }> = {
  buy: { color: "#fff", bg: "#0d9f4f", label: "BUY NOW", border: "#0d9f4f" },
  bid: { color: "#fff", bg: "#c77d15", label: "BID / OFFER", border: "#c77d15" },
  watch: { color: "#fff", bg: "#2563eb", label: "WATCH", border: "#2563eb" },
  skip: { color: "#fff", bg: "#9b9bab", label: "SKIP", border: "#9b9bab" },
};

export default function ListingCard(props: ListingCardProps) {
  const { score, reasons, title, priceUSD, platform, url, player, yearMin, yearMax, recommendation, marketPrice, discount, index } = props;

  const rec = recStyles[recommendation] ?? recStyles.skip;

  const scoreColor =
    score >= 90 ? "var(--score-hot)" :
    score >= 80 ? "var(--score-high)" :
    score >= 65 ? "var(--score-mid)" :
    "var(--score-low)";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr auto",
        gap: "1rem",
        alignItems: "center",
        padding: "0.875rem 1.15rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s ease",
        animation: `fadeInUp 0.3s ease-out ${index * 25}ms both`,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-hover)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Score */}
      <div style={{ textAlign: "center" }}>
        <div
          className="mono"
          style={{ fontSize: "1.4rem", fontWeight: 700, color: scoreColor, lineHeight: 1 }}
        >
          {score}
        </div>
        <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "3px", fontWeight: 500 }}>
          score
        </div>
      </div>

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
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
            gap: "0.6rem",
            marginTop: "0.4rem",
            fontSize: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{player}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
            {yearMin}--{yearMax}
          </span>
          <span
            className="mono"
            style={{
              fontSize: "0.6rem",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              fontWeight: 500,
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
                style={{
                  fontSize: "0.6rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "var(--buy-now-bg)",
                  color: "var(--buy-now)",
                  fontWeight: 600,
                }}
              >
                {reasonLabels[key]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Price + Action */}
      <div style={{ textAlign: "right", minWidth: "115px" }}>
        <div
          className="mono"
          style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}
        >
          ${priceUSD < 1000
            ? priceUSD.toFixed(2)
            : priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>

        {marketPrice && (
          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
            <span className="mono">mkt ${marketPrice < 1000 ? marketPrice.toFixed(0) : marketPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            {discount !== null && discount > 0 && (
              <span className="mono" style={{ color: "var(--buy-now)", fontWeight: 600, marginLeft: "4px" }}>
                -{discount}%
              </span>
            )}
            {discount !== null && discount < 0 && (
              <span className="mono" style={{ color: "var(--score-hot)", fontWeight: 600, marginLeft: "4px" }}>
                +{Math.abs(discount)}%
              </span>
            )}
          </div>
        )}

        <div
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "5px",
            background: rec.bg,
            color: rec.color,
            display: "inline-block",
            marginTop: "5px",
            letterSpacing: "0.04em",
          }}
        >
          {rec.label}
        </div>
      </div>
    </a>
  );
}
