"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  { label: "ROOKIES", href: "/", activeColor: "var(--green)", activeBg: "rgba(34,197,94,0.12)" },
  { label: "STARS", href: "/stars", activeColor: "#3b82f6", activeBg: "rgba(59,130,246,0.12)" },
  { label: "LEGENDS", href: "/legends", activeColor: "var(--gold)", activeBg: "rgba(251,191,36,0.12)" },
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
              color: isActive ? tab.activeColor : "var(--text-3)",
              background: isActive ? tab.activeBg : "transparent",
              border: isActive ? `1px solid ${tab.activeColor}30` : "1px solid transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
