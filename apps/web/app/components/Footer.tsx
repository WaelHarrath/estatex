import Link from "next/link";

const boardLinks = [
  { label: "All properties", href: "/properties" },
  { label: "Wallet", href: "/wallet" },
  { label: "AI concierge", href: "/chat" },
  { label: "Member sign in", href: "/login" }
];

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-hairline bg-abyss-deep">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
        aria-hidden
      />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* The house — what this business is */}
        <div className="lg:col-span-2">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-porcelain">
            ESTATE<span className="text-gold">X</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-porcelain-soft">
            EstateX is a global marketplace for real estate. We run live property auctions with
            anti-sniping protection, let you buy fractional house shares that pay dividends, and
            put an AI concierge on every listing to read pricing, comparables, and the rules for
            you. One ledger, every address on Earth.
          </p>
          <p className="figure mt-6 text-[0.62rem] uppercase tracking-[0.24em] text-porcelain-faint">
            Markets across 14 countries · The floor never closes
          </p>
        </div>

        {/* The board */}
        <nav aria-label="Market">
          <p className="eyebrow">The board</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {boardLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-porcelain-soft transition hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* The house — contact */}
        <div>
          <p className="eyebrow">Reach the house</p>
          <ul className="mt-4 space-y-2.5 text-sm text-porcelain-soft">
            <li>
              <span className="figure mr-2 text-[0.6rem] uppercase tracking-[0.2em] text-gold">Email</span>
              hello@estatex.global
            </li>
            <li>
              <span className="figure mr-2 text-[0.6rem] uppercase tracking-[0.2em] text-gold">Phone</span>
              +1 (415) 555-0142
            </li>
            <li>
              <span className="figure mr-2 text-[0.6rem] uppercase tracking-[0.2em] text-gold">Post</span>
              1 Exchange Place, New York, NY 10005
            </li>
            <li className="figure pt-2 text-[0.62rem] uppercase tracking-[0.2em] text-porcelain-faint">
              Mon–Sat · 09:00–21:00 UTC
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-porcelain-faint sm:flex-row">
          <p className="figure">© 2026 EstateX International Ltd. All rights reserved.</p>
          <p className="figure">Lot ledger · ESTATEX.GLOBAL</p>
        </div>
      </div>
    </footer>
  );
}
