"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  { label: "ROOKIES", href: "/" },
  { label: "STARS", href: "/stars" },
  { label: "LEGENDS", href: "/legends" },
  { label: "DIPS", href: "/dips" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav style={{
      display: "flex",
      gap: 4,
      marginBottom: 20,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: 4,
      boxShadow: "inset 0 0 0 1px rgba(218,41,28,0.04)",
    }}>
      {tabs.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="bebas"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "7px 0",
              borderRadius: 7,
              fontSize: 15,
              letterSpacing: "0.06em",
              transition: "all 0.15s",
              color: isActive ? "var(--manu-gold)" : "var(--text-3)",
              background: isActive
                ? "linear-gradient(180deg, var(--manu-red) 0%, #a01f15 100%)"
                : "transparent",
              border: isActive
                ? "1px solid rgba(251,225,34,0.30)"
                : "1px solid transparent",
              boxShadow: isActive
                ? "0 0 14px var(--manu-red-glow), inset 0 1px 0 rgba(251,225,34,0.15)"
                : "none",
              textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.5)" : "none",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
