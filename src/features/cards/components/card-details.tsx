"use client";

import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, Loader2Icon, SnowflakeIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MAX_CARD_LIMIT_CENTS, type Card, type CardSecrets } from "@/lib/contracts";
import { centsToInputValue, formatMoney, parseMoney, shareInBps } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useRevealCard, useUpdateCard } from "../api";
import { PaymentCard } from "./payment-card";

const REVEAL_SECONDS = 30;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        await navigator.clipboard?.writeText(value).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-positive" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}

function useCountdown(active: boolean, seconds: number, onDone: () => void) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onDone();
      }
    }, 250);
    return () => clearInterval(id);
  }, [active, seconds, onDone]);
  return left;
}

export function CardDetails({ card }: { card: Card }) {
  const update = useUpdateCard();
  const reveal = useRevealCard();
  const [secrets, setSecrets] = useState<CardSecrets | null>(null);
  const [limit, setLimit] = useState(centsToInputValue(card.monthlyLimitCents));
  const [limitError, setLimitError] = useState<string | null>(null);
  const hide = () => setSecrets(null);
  const left = useCountdown(!!secrets, REVEAL_SECONDS, hide);

  const frozen = card.status === "frozen";
  const usedBps = shareInBps(card.spentThisMonthCents, card.monthlyLimitCents);
  const usedPct = Math.min(100, Math.round(usedBps / 100));
  const near = usedBps >= 8000;

  const saveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseMoney(limit);
    if (cents === null || cents <= 0) return setLimitError("Enter a positive amount");
    if (cents > MAX_CARD_LIMIT_CENTS)
      return setLimitError("Limit can be at most $500,000 per month");
    setLimitError(null);
    update.mutate({ id: card.id, monthlyLimitCents: cents });
  };

  return (
    <div className="space-y-6">
      <PaymentCard card={card} pan={secrets?.pan} size="lg" />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={reveal.isPending}
          aria-pressed={!!secrets}
          onClick={() => {
            if (secrets) return hide();
            reveal.mutate(card.id, { onSuccess: setSecrets });
          }}
        >
          {reveal.isPending ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : secrets ? (
            <EyeOffIcon aria-hidden="true" />
          ) : (
            <EyeIcon aria-hidden="true" />
          )}
          {secrets ? `Hide (${left}s)` : "Show details"}
        </Button>
        <Button
          variant={frozen ? "brand" : "outline"}
          onClick={() => update.mutate({ id: card.id, status: frozen ? "active" : "frozen" })}
          disabled={update.isPending && update.variables?.status !== undefined}
        >
          <SnowflakeIcon aria-hidden="true" />
          {frozen ? "Unfreeze" : "Freeze"}
        </Button>
      </div>

      {secrets && (
        <dl className="divide-y rounded-xl border text-sm" aria-live="polite">
          {[
            ["Card number", secrets.pan.replace(/(\d{4})(?=\d)/g, "$1 "), secrets.pan],
            ["Expiry", secrets.expiry, secrets.expiry],
            ["CVC", secrets.cvc, secrets.cvc],
          ].map(([label, display, raw]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex items-center gap-1 font-mono tabular">
                {display}
                <CopyButton value={raw!} label={label!.toLowerCase()} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <div>
          <Label htmlFor={`freeze-${card.id}`} className="text-sm">
            Freeze card
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Temporarily decline all new purchases.
          </p>
        </div>
        <Switch
          id={`freeze-${card.id}`}
          checked={frozen}
          onCheckedChange={(checked) =>
            update.mutate({ id: card.id, status: checked ? "frozen" : "active" })
          }
        />
      </div>

      <section aria-labelledby={`limit-${card.id}`} className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 id={`limit-${card.id}`} className="text-sm font-semibold">
            Monthly spending
          </h3>
          <p className="tabular text-xs text-muted-foreground">
            {formatMoney(card.spentThisMonthCents)} of{" "}
            {formatMoney(card.monthlyLimitCents, { hideCents: true })}
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={usedPct}
          aria-label="Monthly limit used"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              near ? "bg-[#f59e0b]" : "bg-brand-gradient",
            )}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {near ? "Close to the limit. " : ""}
          {formatMoney(Math.max(0, card.monthlyLimitCents - card.spentThisMonthCents))} left this
          month · resets on the 1st
        </p>

        <form onSubmit={saveLimit} className="space-y-1.5" noValidate>
          <Label htmlFor={`limit-input-${card.id}`}>Monthly limit</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <MoneyInput
                id={`limit-input-${card.id}`}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                aria-invalid={!!limitError}
                aria-describedby={limitError ? `limit-error-${card.id}` : undefined}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={update.isPending}>
              Save
            </Button>
          </div>
          {limitError && (
            <p id={`limit-error-${card.id}`} className="text-xs text-negative" role="alert">
              {limitError}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
