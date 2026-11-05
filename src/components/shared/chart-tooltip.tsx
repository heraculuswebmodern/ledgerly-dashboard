import type { ReactNode } from "react";

import { formatMoney } from "@/lib/money";

export type TooltipRow = { label: string; cents: number; color?: string; emphasis?: boolean };

/** Shared chart tooltip: label in muted ink, values in text tokens, color only on the swatch. */
export function ChartTooltipCard({
  title,
  rows,
  footer,
}: {
  title: ReactNode;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-[3px]"
                style={{ background: row.color ?? "transparent" }}
                aria-hidden="true"
              />
              {row.label}
            </span>
            <span className={row.emphasis ? "tabular font-semibold" : "tabular"}>
              {formatMoney(row.cents)}
            </span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 border-t pt-1.5 text-muted-foreground">{footer}</div>}
    </div>
  );
}
