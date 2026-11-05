"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/lib/contracts";
import { DEMO_CREDENTIALS } from "@/lib/demo";

/** Only allow same-site relative redirects after sign-in (prevents open redirects). */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return "/overview";
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [formError, setFormError] = useState<string | null>(
    params.get("expired") ? "Your session expired. Sign in again to continue." : null,
  );
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post("/auth/login", values);
      router.replace(safeNextPath(params.get("next")));
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Couldn't reach Ledgerly. Check your connection.",
      );
    }
  });

  const fillDemo = () => {
    form.setValue("email", DEMO_CREDENTIALS.email, { shouldValidate: true });
    form.setValue("password", DEMO_CREDENTIALS.password, { shouldValidate: true });
    setFormError(null);
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5"
      aria-describedby={formError ? "login-error" : undefined}
    >
      {formError && (
        <div
          id="login-error"
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-negative/20 bg-negative-soft px-3 py-2.5 text-sm text-negative"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="h-11"
          {...form.register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-negative">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <span className="text-xs text-muted-foreground">Mock auth · no real account needed</span>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-11 pr-11"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-negative">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2Icon className="animate-spin" aria-hidden="true" /> Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRightIcon aria-hidden="true" />
          </>
        )}
      </Button>

      <div className="rounded-xl border border-dashed bg-subtle p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[13px] font-medium">
              <SparklesIcon className="size-3.5 text-positive" aria-hidden="true" /> Demo
              credentials
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground">
              <dt>Email</dt>
              <dd className="text-foreground">{DEMO_CREDENTIALS.email}</dd>
              <dt>Password</dt>
              <dd className="text-foreground">{DEMO_CREDENTIALS.password}</dd>
            </dl>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fillDemo}>
            Use demo
          </Button>
        </div>
      </div>
    </form>
  );
}
