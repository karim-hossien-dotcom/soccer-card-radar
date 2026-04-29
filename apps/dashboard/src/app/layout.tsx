import type { Metadata } from "next";
import "./globals.css";
import Nav from "./nav";

export const metadata: Metadata = {
  title: "Soccer Card Radar",
  description: "Card deal scanner — find steals across eBay, Mercari, Japan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "1rem" }}>
            <a
              href="/"
              className="mono"
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #7c5cff, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textDecoration: "none",
              }}
            >
              SOCCER CARD RADAR
            </a>
            <span className="mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>v1.0</span>
          </div>
          <Nav />
        </div>
        {children}
      </body>
    </html>
  );
}
