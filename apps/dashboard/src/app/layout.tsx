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
        {/* Top bar */}
        <div
          style={{
            background: "#1a1a2e",
            padding: "0.75rem 0",
            marginBottom: "1.5rem",
            borderBottom: "3px solid #dc2626",
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <a
              href="/"
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ color: "#dc2626", fontSize: "1.5rem" }}>&#9679;</span>
              Soccer Card Radar
            </a>
            <span className="mono" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>LIVE</span>
          </div>
        </div>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
          <Nav />
        </div>
        {children}
      </body>
    </html>
  );
}
