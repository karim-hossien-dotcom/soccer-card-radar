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
              <a href="/" className={m.mark}>Card Radar</a>
              <ScanBtn />
            </div>
            <NavBar />
          </div>
        </header>
        <main className="shell page">{children}</main>
      </body>
    </html>
  );
}
