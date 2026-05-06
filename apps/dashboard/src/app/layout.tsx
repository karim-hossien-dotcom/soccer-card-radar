import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./nav-bar";
import ScanBtn from "./scan-btn";

export const metadata: Metadata = { title: "Card Radar" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <a href="/" className="bebas" style={{ fontSize: 28, letterSpacing: "0.04em", color: "var(--text)" }}>
              CARD RADAR
            </a>
            <ScanBtn />
          </div>
          <NavBar />
          {children}
        </div>
      </body>
    </html>
  );
}
