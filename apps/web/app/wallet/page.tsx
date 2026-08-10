import { getWalletBalance } from "@estatex/core";
import { requireUser } from "@/src/guards";
import { formatMoney } from "@/src/format";
import FundButton from "./FundButton";
import FundConfirm from "./FundConfirm";

export const dynamic = "force-dynamic";

export default async function WalletPage({
  searchParams
}: {
  searchParams: Promise<{ funded?: string; session_id?: string }>;
}) {
  const user = await requireUser();
  const balance = await getWalletBalance(user.id);
  const { funded, session_id: sessionId } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="figure text-[0.62rem] uppercase tracking-[0.28em] text-cadastral">Ledger</p>
      <h1 className="mt-1 font-display text-3xl text-ink">Wallet</h1>
      <p className="mt-1 text-sm text-ink-soft">Simulated funds for auctions and share purchases (demo mode).</p>

      <div className="relative mt-8 overflow-hidden border border-cadastral-soft bg-paper-deep p-6">
        <div className="survey-grid absolute inset-0" aria-hidden />
        <div className="relative">
          <p className="figure text-[0.6rem] uppercase tracking-[0.24em] text-ink-soft">Available</p>
          <p className="figure mt-1 text-4xl font-medium tracking-tight text-ink">
            {formatMoney(BigInt(balance.availableCents))}
          </p>
          <p className="figure mt-3 text-xs tracking-[0.12em] text-ink-soft">
            Reserved <span className="text-cadastral">{formatMoney(BigInt(balance.reservedCents))}</span> · held on
            open bids
          </p>
        </div>
      </div>

      <div className="mt-8 border border-hairline bg-paper-raise p-5">
        <h2 className="font-display text-xl text-ink">Add funds</h2>
        <p className="mt-1 text-sm text-ink-soft">Top up via Stripe test checkout. No real money is moved.</p>
        <div className="mt-4">
          <FundButton />
        </div>
      </div>

      {funded === "1" && sessionId && (
        <div className="mt-6">
          <FundConfirm sessionId={sessionId} />
        </div>
      )}
    </main>
  );
}
