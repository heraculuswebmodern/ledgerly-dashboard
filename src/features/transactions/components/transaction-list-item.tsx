import Link from "next/link";

import { Amount } from "@/components/shared/amount";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { CATEGORY_LABELS, type Transaction } from "@/lib/contracts";
import { formatShortDate } from "@/lib/dates";

/** Compact row used in summary lists (overview, account detail). Opens the detail drawer. */
export function TransactionListItem({ transaction: t }: { transaction: Transaction }) {
  return (
    <Link
      href={`/transactions?txn=${t.id}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar name={t.counterparty} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.counterparty}</p>
        <p className="truncate text-xs text-muted-foreground">
          {CATEGORY_LABELS[t.category]} · {formatShortDate(t.date)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Amount cents={t.amountCents} className="text-sm font-medium" />
        {t.status !== "posted" && <StatusBadge status={t.status} />}
      </div>
    </Link>
  );
}
