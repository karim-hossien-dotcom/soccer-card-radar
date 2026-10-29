import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./nav-bar";
import ScanBtn from "./scan-btn";
import m from "./masthead.module.css";

export const metadata: Metadata = { title: "Card Radar" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className={m.band}>
          <div className="shell">
            <div className={m.top}>
              <a href="/" className={m.mark}>
                <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true"><rect x="1" y="1" width="20" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="1" y="1" width="20" height="7" rx="3" fill="#5b83ff" /></svg>
                Card Radar
              </a>
              <NavBar />
              <div className={m.right}><ScanBtn /></div>
            </div>
          </div>
        </header>
        <main className="shell page">{children}</main>
      </body>
    </html>
  );
}
