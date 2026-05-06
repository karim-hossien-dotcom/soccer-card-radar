import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Card Radar" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: "620px", margin: "0 auto", padding: "20px 16px 60px" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
