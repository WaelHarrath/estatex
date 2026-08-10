import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import SignOutButton from "./SignOutButton";
import Clock from "./Clock";

export default async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-abyss/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold tracking-[0.22em] text-porcelain">
            ESTATE<span className="text-gold transition group-hover:text-gold-bright">X</span>
          </span>
          <span className="figure hidden text-[0.58rem] uppercase tracking-[0.3em] text-porcelain-faint sm:inline">
            Global · Live markets
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/properties" className="text-porcelain-soft transition hover:text-porcelain">
            Properties
          </Link>
          {session?.user ? (
            <>
              <Link href="/wallet" className="text-porcelain-soft transition hover:text-porcelain">
                Wallet
              </Link>
              <Link href="/recommendations" className="text-porcelain-soft transition hover:text-porcelain">
                For you
              </Link>
              <Link href="/chat" className="text-porcelain-soft transition hover:text-porcelain">
                Concierge
              </Link>
              <Link href="/profile" className="text-porcelain-soft transition hover:text-porcelain">
                Profile
              </Link>
              <span className="figure hidden text-xs text-porcelain-faint lg:inline">
                {session.user.name}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost !px-4 !py-2 !text-sm"
              >
                Sign in
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-2 !text-sm">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <span className="flex items-center gap-2.5">
            <span className="live-dot" aria-hidden />
            <span className="figure text-[0.6rem] uppercase tracking-[0.28em] text-porcelain-faint">
              Live markets · Auctions · Shares
            </span>
          </span>
          <Clock />
        </div>
      </div>
    </header>
  );
}
