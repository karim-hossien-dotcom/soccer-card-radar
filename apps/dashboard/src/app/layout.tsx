import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Radar",
  description: "Soccer card deals — live from eBay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
