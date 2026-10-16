"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import m from "./masthead.module.css";

const tabs = [
  { label: "Rookies", href: "/" },
  { label: "Stars", href: "/stars" },
  { label: "Legends", href: "/legends" },
  { label: "Dips", href: "/dips" },
  { label: "Vault", href: "/collection" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className={m.nav} aria-label="Sections">
      {tabs.map((t) => {
        const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={m.tab} aria-current={active ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
