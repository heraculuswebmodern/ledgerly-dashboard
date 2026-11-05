"use client";

import { ErrorState } from "@/components/shared/states";
import { Card } from "@/components/ui/card";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <ErrorState onRetry={reset} />
    </Card>
  );
}
