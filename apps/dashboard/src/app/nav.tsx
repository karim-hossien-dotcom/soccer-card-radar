"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "DEALS" },
  { href: "/rookies", label: "ROOKIES" },
  { href: "/parallels", label: "PARALLELS" },
  { href: "/autos", label: "AUTOS" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: "0.25rem",
        padding: "0.5rem",
        background: "var(--bg-card)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        marginBottom: "1.5rem",
      }}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <a
            key={link.href}
            href={link.href}
            className="mono"
            style={{
              fontSize: "0.7rem",
              padding: "6px 14px",
              borderRadius: "5px",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-muted)",
              textDecoration: "none",
              fontWeight: active ? 600 : 400,
              letterSpacing: "0.08em",
              transition: "all 0.15s ease",
            }}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
