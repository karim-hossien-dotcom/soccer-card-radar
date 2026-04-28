import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soccer Card Radar",
  description: "Card alert system — eBay, Mercari, Japan market monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
