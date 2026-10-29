"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + "/");
        return <Link key={l.href} href={l.href} className="nav-link whitespace-nowrap" aria-current={active ? "page" : undefined}>{l.label}</Link>;
      })}
    </>
  );
}
