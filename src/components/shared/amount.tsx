import { formatMoney, type FormatMoneyOptions } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Renders money with tabular numerals. Inflows are tinted positive; outflows keep the
 * default ink (Ledgerly reserves red for failures and warnings rather than every expense).
 */
export function Amount({
  cents,
  className,
  tone = "auto",
  ...options
}: {
  cents: number;
  className?: string;
  tone?: "auto" | "plain" | "signed";
} & FormatMoneyOptions) {
  const sign = options.sign ?? (tone === "plain" ? "auto" : "always");
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        tone !== "plain" && cents > 0 && "text-positive",
        tone === "signed" && cents < 0 && "text-negative",
        className,
      )}
    >
      {formatMoney(cents, { ...options, sign })}
    </span>
  );
}
