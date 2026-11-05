import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsView } from "@/features/analytics/components/analytics-view";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-xl" />}>
      <AnalyticsView />
    </Suspense>
  );
}
