import type { Metadata } from "next";
import { Suspense } from "react";

import { Wordmark } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandPanel } from "@/features/auth/components/brand-panel";
import { LoginForm } from "@/features/auth/components/login-form";
import { ThemeToggle } from "@/features/shell/components/theme-toggle";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="hidden lg:block" aria-label="About Ledgerly">
        <BrandPanel />
      </section>

      <section className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your Ledgerly workspace.
          </p>
          <div className="mt-8">
            <Suspense fallback={<LoginFormSkeleton />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:hidden">
          Ledgerly is a product demo, not a bank.
        </p>
      </section>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
