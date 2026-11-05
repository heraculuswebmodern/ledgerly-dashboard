import { CircleCheckIcon, CircleXIcon, ClockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type TransactionStatus } from "@/lib/contracts";

const VARIANT = { posted: "neutral", pending: "pending", failed: "negative" } as const;
const ICON = { posted: CircleCheckIcon, pending: ClockIcon, failed: CircleXIcon };

/** Status is always icon + label, never color alone. */
export function StatusBadge({ status }: { status: TransactionStatus }) {
  const Icon = ICON[status];
  return (
    <Badge variant={VARIANT[status]}>
      <Icon aria-hidden="true" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
