"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { TransferResult } from "@/lib/contracts";
import { formatMoney } from "@/lib/money";

export function TransferSuccessStep({
  result,
  toLabel,
  onDone,
  onAnother,
}: {
  result: TransferResult;
  toLabel: string;
  onDone: () => void;
  onAnother: () => void;
}) {
  const reduce = useReducedMotion();
  const scheduled = result.kind === "scheduled";
  return (
    <div className="flex flex-col items-center py-4 text-center" role="status">
      <motion.span
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 20 }}
        className="flex size-16 items-center justify-center rounded-full bg-brand-gradient text-ink shadow-pop"
      >
        <CheckIcon className="size-8" strokeWidth={2.5} aria-hidden="true" />
      </motion.span>
      <h3 className="mt-5 text-xl font-semibold tracking-tight">
        {scheduled ? "Payment scheduled" : "Money on its way"}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        <span className="tabular font-medium text-foreground">
          {formatMoney(result.amountCents)}
        </span>{" "}
        to {toLabel}. {result.eta}.
      </p>
      <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        {result.transactionIds[0] && (
          <Button asChild variant="outline" onClick={onDone}>
            <Link href={`/transactions?txn=${result.transactionIds[0]}`}>View transaction</Link>
          </Button>
        )}
        <Button variant="outline" onClick={onAnother}>
          Make another
        </Button>
        <Button variant="default" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
