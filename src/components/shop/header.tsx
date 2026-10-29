import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { getCartView } from "@/modules/cart/service";
import { getCurrentUser } from "@/modules/auth/session";

export async function Header() {
  const [cart, user] = await Promise.all([getCartView(), getCurrentUser()]);
  const accountHref = user ? (user.role === "ADMIN" ? "/admin" : "/portal") : "/login";
  const accountLabel = user ? (user.role === "ADMIN" ? "Verwaltung" : "Mein Bereich") : "Anmelden";
  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-line">
      <div className="container-x flex items-center gap-3 h-16">
        <Link href="/" className="flex items-center gap-2.5 min-h-[44px] font-display text-[1.45rem] font-semibold tracking-tight text-ink" aria-label={`${BRAND.name} Startseite`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marke.svg" alt="" width={30} height={30} className="rounded-md" />
          <span>trifuse<span className="text-accent-text">.store</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Hauptnavigation">
          <Link className="nav-link" href="/produkte">Produkte</Link>
          <Link className="nav-link" href="/macher">Macher</Link>
        </nav>
        <form action="/produkte" className="ml-auto hidden md:block" role="search">
          <label className="sr-only" htmlFor="q">Suche</label>
          <input id="q" name="q" type="search" placeholder="Honig, Kerze, Geschenk …" className="input !min-h-[40px] !py-1.5 w-52 lg:w-72" />
        </form>
        <Link href={accountHref} className="nav-link ml-auto md:ml-0 hidden md:flex">{accountLabel}</Link>
        <Link href="/warenkorb" className="btn btn-secondary ml-auto sm:ml-0" aria-label={`Warenkorb, ${cart.count} Artikel`}>
          Warenkorb{cart.count > 0 ? <span className="ml-1 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded bg-accent text-accent-ink text-xs num">{cart.count}</span> : null}
        </Link>
      </div>
      <div className="md:hidden container-x flex items-center gap-2 pb-2">
        <form action="/produkte" className="flex-1" role="search">
          <label className="sr-only" htmlFor="q-mobil">Suche</label>
          <input id="q-mobil" name="q" type="search" placeholder="Honig, Kerze, Geschenk …" className="input !min-h-[44px]" />
        </form>
        <Link className="chip" href="/produkte">Produkte</Link>
        <Link className="chip" href="/macher">Macher</Link>
      </div>
    </header>
  );
}
