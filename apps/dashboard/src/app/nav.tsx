"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/parallels", label: "Parallels" },
  { href: "/autos", label: "Autos" },
  { href: "/research", label: "Research" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <a
            key={link.href}
            href={link.href}
            style={{
              fontSize: "0.82rem", padding: "7px 16px", borderRadius: "6px",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              textDecoration: "none", fontWeight: active ? 600 : 500,
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
