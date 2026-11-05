"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheckIcon } from "lucide-react";

import { Wordmark } from "@/components/brand/logo";
import { formatMoney } from "@/lib/money";

const ENTRIES = [
  { name: "Stripe payout", meta: "ACH · Today", cents: 1_248_000 },
  { name: "Gusto payroll", meta: "ACH · Nov 1", cents: -11_820_416 },
  { name: "Vantage Health", meta: "Wire · Oct 29", cents: 6_420_000 },
  { name: "Amazon Web Services", meta: "Card ••4417 · Oct 28", cents: -1_984_255 },
];

/** The navy storytelling half of the login screen: ruled ledger paper and a live-looking statement. */
export function BrandPanel() {
  const reduce = useReducedMotion();
  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.25 + i * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden bg-hero p-10 text-hero-foreground xl:p-14">
      <div className="absolute inset-0 -z-10 ledger-lines" aria-hidden="true" />
      {/* Margin rule, like the red line on ledger paper, in brand teal. */}
      <div
        className="absolute inset-y-0 left-6 -z-10 w-px bg-teal/30 xl:left-8"
        aria-hidden="true"
      />
      <div
        className="absolute -right-32 -bottom-40 -z-10 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.22),transparent)]"
        aria-hidden="true"
      />

      <Wordmark tone="inverse" />

      <div className="mt-auto max-w-lg">
        <p className="text-sm font-medium tracking-wide text-emerald uppercase">
          Business banking, simplified.
        </p>
        <h1 className="mt-3 text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance xl:text-5xl">
          Keep the bottom line in plain sight.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-hero-muted">
          Accounts, payments and cards for teams who&apos;d rather build than reconcile. Every
          dollar, every day, on one clean ledger.
        </p>
      </div>

      <div aria-hidden="true" className="relative mt-10 max-w-md">
        <motion.div
          {...rise(0)}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-xs text-hero-muted">
            <span>Operating ••4821</span>
            <span className="tabular">Statement · November</span>
          </div>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {ENTRIES.map((entry, i) => (
              <motion.li
                key={entry.name}
                {...rise(i + 1)}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{entry.name}</p>
                  <p className="text-xs text-hero-muted">{entry.meta}</p>
                </div>
                <span
                  className={`tabular text-sm font-medium ${entry.cents > 0 ? "text-[#6ee7b7]" : "text-hero-foreground"}`}
                >
                  {formatMoney(entry.cents, { sign: "always" })}
                </span>
              </motion.li>
            ))}
          </ul>
          <motion.div {...rise(6)} className="mt-3">
            <div className="h-1.5 rounded-full bg-brand-gradient" />
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-hero-muted">Available across accounts</span>
              <span className="tabular text-lg font-semibold tracking-tight">
                {formatMoney(426_535_705)}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs text-hero-muted">
        <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
        Ledgerly is a product demo, not a bank. No real money moves.
      </p>
    </div>
  );
}
