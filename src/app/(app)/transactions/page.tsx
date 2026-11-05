import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TransactionsView } from "@/features/transactions/components/transactions-view";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsFallback />}>
      <TransactionsView />
    </Suspense>
  );
}

function TransactionsFallback() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-[32rem] w-full rounded-xl" />
    </div>
  );
}
