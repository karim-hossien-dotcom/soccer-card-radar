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
        {/* Gradient accent line at top */}
        <div
          style={{
            height: "2px",
            background: "linear-gradient(90deg, #10b981 0%, #58a6ff 50%, #a78bfa 100%)",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            background: "rgba(22,27,34,0.95)",
            borderBottom: "1px solid var(--border)",
            padding: "0.75rem 0",
          }}
        >
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "0 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Logo */}
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.6rem",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "var(--text-primary)",
                }}
              >
                SCR
              </span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.01em",
                }}
              >
                Soccer Card Radar
              </span>
            </a>

            {/* LIVE indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10b981",
                  animation: "livePulse 2s ease-in-out infinite",
                }}
              />
              <span
                className="mono"
                style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.12em" }}
              >
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
          <Nav />
        </div>

        {children}
      </body>
    </html>
  );
}
