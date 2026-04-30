"use client";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Research" },
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell / Avoid" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", alignItems: "center" }}>
      {links.map((link, i) => {
        const active = pathname === link.href;
        return (
          <div key={link.href} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {i > 0 && <span style={{ color: "var(--border-hover)", fontSize: "0.7rem" }}>&rarr;</span>}
            <a href={link.href} style={{
              fontSize: "0.82rem", padding: "7px 16px", borderRadius: "6px",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              textDecoration: "none", fontWeight: active ? 600 : 500,
            }}>{link.label}</a>
          </div>
        );
      })}
    </nav>
  );
}
