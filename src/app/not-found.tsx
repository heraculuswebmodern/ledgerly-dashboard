import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CompassIcon className="size-6" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">This page isn&apos;t on the books</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The link may be old, or the page may have moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/overview">Back to overview</Link>
      </Button>
    </main>
  );
}
