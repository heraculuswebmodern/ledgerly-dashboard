import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The Ledgerly monogram: an "L" built from two stacked ledger bars.
 * The stem is an entry line; the base is "the bottom line", drawn in the brand gradient.
 */
export function LogoMark({
  className,
  title = "Ledgerly",
  tile = true,
}: {
  className?: string;
  title?: string | null;
  tile?: boolean;
}) {
  const id = useId();
  const gradientId = `${id}-g`;
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(
        "size-8 shrink-0",
        tile && "rounded-[9px] dark:ring-1 dark:ring-white/12",
        className,
      )}
      role={title ? "img" : undefined}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="1" stopColor="#0EA5A4" />
        </linearGradient>
      </defs>
      {tile && <rect width="32" height="32" rx="9" fill="#0B1B33" />}
      <rect x="9" y="6.5" width="5" height="13" rx="2.5" fill={tile ? "#F4F7FB" : "currentColor"} />
      <rect x="9" y="21.5" width="14.5" height="5" rx="2.5" fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function Wordmark({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverse";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark title={null} className={cn(tone === "inverse" && "ring-1 ring-white/12")} />
      <span
        className={cn(
          "text-[19px] leading-none font-semibold tracking-[-0.035em]",
          tone === "inverse" ? "text-white" : "text-foreground",
        )}
      >
        ledgerly
      </span>
      <span className="sr-only">Ledgerly</span>
    </span>
  );
}
