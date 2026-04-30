"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Rookies", icon: "&#9889;" },
  { href: "/parallels", label: "Parallels", icon: "&#9670;" },
  { href: "/autos", label: "Autos", icon: "&#9997;" },
  { href: "/research", label: "Research", icon: "&#128200;" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.75rem",
      }}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <a
            key={link.href}
            href={link.href}
            style={{
              fontSize: "0.85rem",
              padding: "8px 16px",
              borderRadius: "6px",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              textDecoration: "none",
              fontWeight: active ? 600 : 500,
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: link.icon }} style={{ fontSize: "0.75rem" }} />
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
