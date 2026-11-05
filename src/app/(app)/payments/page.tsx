import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PaymentsView } from "@/features/payments/components/payments-view";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      }
    >
      <PaymentsView />
    </Suspense>
  );
}
