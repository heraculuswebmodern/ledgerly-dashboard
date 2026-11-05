import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { CardsView } from "@/features/cards/components/cards-view";

export const metadata: Metadata = { title: "Cards" };

export default function CardsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-xl" />}>
      <CardsView />
    </Suspense>
  );
}
