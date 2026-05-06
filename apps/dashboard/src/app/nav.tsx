"use client";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",     label: "Research" },
  { href: "/buy",  label: "Buy" },
  { href: "/sell", label: "Sell" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: "0.35rem",
        padding: "0.75rem 0",
        marginBottom: "1.25rem",
        borderBottom: "1px solid var(--border)",
        alignItems: "center",
      }}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <a
            key={link.href}
            href={link.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: active ? 600 : 500,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.01em",
              textDecoration: "none",
              transition: "all 0.15s ease",
              background: active
                ? "linear-gradient(135deg, #10b981 0%, #58a6ff 100%)"
                : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              boxShadow: active
                ? "0 0 12px rgba(16,185,129,0.25), 0 2px 8px rgba(0,0,0,0.2)"
                : "none",
            }}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
