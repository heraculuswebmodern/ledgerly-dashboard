import { SnowflakeIcon } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import type { Card, CardTheme } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const THEMES: Record<CardTheme, string> = {
  ink: "bg-[#0b1b33] text-white",
  emerald: "bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] text-white",
  slate: "bg-[linear-gradient(135deg,#334155_0%,#1e293b_100%)] text-white",
  teal: "bg-[linear-gradient(135deg,#0e7490_0%,#0ea5a4_100%)] text-white",
};

/** Visual card face. Never renders the full PAN; secrets live in the details panel. */
export function PaymentCard({
  card,
  pan,
  className,
  size = "md",
}: {
  card: Card;
  pan?: string;
  className?: string;
  size?: "md" | "lg";
}) {
  const frozen = card.status === "frozen";
  const number = pan ? pan.replace(/(\d{4})(?=\d)/g, "$1 ") : `•••• •••• •••• ${card.last4}`;

  return (
    <div
      className={cn(
        "relative isolate aspect-[1.586] w-full overflow-hidden rounded-2xl p-5 shadow-pop select-none",
        THEMES[card.theme],
        size === "lg" && "p-6",
        className,
      )}
    >
      {/* Ledger rules + soft light, the Ledgerly card signature. */}
      <div
        className="absolute inset-0 -z-10 [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_21px,rgba(255,255,255,0.06)_21px,rgba(255,255,255,0.06)_22px)] opacity-60"
        aria-hidden="true"
      />
      <div
        className="absolute -top-1/2 -right-1/4 -z-10 size-full rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),transparent)]"
        aria-hidden="true"
      />

      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{card.nickname}</p>
            <p className="text-[11px] tracking-wide text-white/70 uppercase">{card.kind}</p>
          </div>
          <LogoMark title={null} tile={false} className="size-7 text-white" />
        </div>

        <p
          className={cn(
            "mt-auto font-mono tabular tracking-[0.12em]",
            size === "lg" ? "text-lg sm:text-xl" : "text-[15px]",
          )}
          aria-label={pan ? `Card number ${pan}` : `Card ending in ${card.last4}`}
        >
          {number}
        </p>
        <div className="mt-3 flex items-end justify-between text-[11px]">
          <div>
            <p className="text-white/60 uppercase">Cardholder</p>
            <p className="text-[13px] font-medium">{card.holder}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 uppercase">Exp</p>
            <p className="tabular text-[13px] font-medium">{card.expiry}</p>
          </div>
          <p className="text-lg font-black tracking-tight italic" aria-label="Visa">
            VISA
          </p>
        </div>
      </div>

      {frozen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#e6eef8]/35 backdrop-blur-[3px]">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-[#0b1b33] shadow-pop">
            <SnowflakeIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="rounded-full bg-[#0b1b33]/80 px-2.5 py-0.5 text-xs font-semibold">
            Frozen
          </span>
        </div>
      )}
    </div>
  );
}
