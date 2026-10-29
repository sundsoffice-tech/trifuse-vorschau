import Link from "next/link";
import { logoutAction } from "@/modules/auth/actions";
import { NavLinks } from "./nav-links";

export function BackofficeShell({ title, subtitle, links, children }: { title: string; subtitle: string; links: { href: string; label: string; exact?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      {/* Die Seitenleiste reicht immer bis unten (Künstler-Fund 49): die Spalte trägt den Hintergrund, die Navigation bleibt stehen. */}
      <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-line bg-surface-2">
        <aside className="md:sticky md:top-0 p-4 md:p-5 flex md:flex-col gap-3 md:gap-1 overflow-x-auto md:h-screen">
          <div className="md:mb-4 shrink-0">
            <Link href="/" className="font-display text-xl font-semibold">trifuse<span className="text-accent-text">.store</span></Link>
            <p className="text-xs text-ink-2 mt-0.5">{title}</p>
            <p className="text-xs text-ink-3 truncate max-w-[12rem] hidden md:block">{subtitle}</p>
          </div>
          <nav className="flex md:flex-col gap-1 md:flex-1" aria-label={title}><NavLinks links={links} /></nav>
          <div className="flex md:flex-col gap-1 shrink-0">
            <Link href="/" className="nav-link">Zum Shop</Link>
            <form action={logoutAction}><button className="nav-link w-full text-left" type="submit">Abmelden</button></form>
          </div>
        </aside>
      </div>
      <div className="flex-1 min-w-0 p-4 md:p-8 max-w-6xl">{children}</div>
    </div>
  );
}
