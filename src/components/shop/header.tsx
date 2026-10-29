import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { getCartView } from "@/modules/cart/service";
import { getCurrentUser } from "@/modules/auth/session";

export async function Header() {
  const [cart, user] = await Promise.all([getCartView(), getCurrentUser()]);
  const accountHref = user ? (user.role === "ADMIN" ? "/admin" : "/portal") : "/login";
  const accountLabel = user ? (user.role === "ADMIN" ? "Verwaltung" : "Mein Bereich") : "Anmelden";
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
      <div className="container-x flex items-center gap-4 h-16">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">{BRAND.name}</Link>
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Hauptnavigation">
          <Link className="nav-link" href="/produkte">Produkte</Link>
          <Link className="nav-link" href="/haendler">Marken</Link>
          <Link className="nav-link" href="/verkaufen">Selbst verkaufen</Link>
        </nav>
        <form action="/produkte" className="ml-auto hidden sm:block">
          <label className="sr-only" htmlFor="q">Suche</label>
          <input id="q" name="q" type="search" placeholder="Suchen …" className="input !min-h-[40px] !py-1.5 w-44 lg:w-64" />
        </form>
        <Link href={accountHref} className="nav-link ml-auto sm:ml-0">{accountLabel}</Link>
        <Link href="/warenkorb" className="btn btn-secondary btn-sm" aria-label={`Warenkorb, ${cart.count} Artikel`}>
          Warenkorb{cart.count > 0 ? <span className="ml-1 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-accent text-accent-ink text-xs">{cart.count}</span> : null}
        </Link>
      </div>
      <nav className="md:hidden container-x flex gap-1 pb-2 overflow-x-auto" aria-label="Hauptnavigation mobil">
        <Link className="nav-link whitespace-nowrap" href="/produkte">Produkte</Link>
        <Link className="nav-link whitespace-nowrap" href="/haendler">Marken</Link>
        <Link className="nav-link whitespace-nowrap" href="/verkaufen">Selbst verkaufen</Link>
      </nav>
    </header>
  );
}
