"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { MoneyInput } from "@/components/shared/money-input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RAIL_ETA, RAIL_LIMITS, type Account, type Recipient } from "@/lib/contracts";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { TransferFormValues } from "../transfer-form";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-negative" role="alert">
      {message}
    </p>
  );
}

function AccountOption({ account }: { account: Account }) {
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span>
        {account.name} <span className="tabular text-muted-foreground">••{account.last4}</span>
      </span>
      <span className="tabular text-muted-foreground">{formatMoney(account.availableCents)}</span>
    </span>
  );
}

export function TransferDetailsStep({
  form,
  accounts,
  recipients,
  today,
  onCancel,
  onSubmit,
}: {
  form: UseFormReturn<TransferFormValues>;
  accounts: Account[];
  recipients: Recipient[];
  today: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { control, register, formState } = form;
  const { errors } = formState;
  const [kind, when, fromId] = useWatch({ control, name: ["kind", "when", "fromAccountId"] });
  const from = accounts.find((a) => a.id === fromId);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <Segmented
            aria-label="Payment type"
            className="w-full [&>*]:flex-1"
            value={field.value}
            onValueChange={(v) => {
              field.onChange(v);
              form.clearErrors();
            }}
            options={[
              { value: "external", label: "Pay someone" },
              { value: "internal", label: "Between my accounts" },
            ]}
          />
        )}
      />

      {kind === "external" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="recipientId">To</Label>
            <Link
              href="/payments?tab=recipients&add=1"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <PlusIcon className="size-3" aria-hidden="true" /> New recipient
            </Link>
          </div>
          <Controller
            control={control}
            name="recipientId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="recipientId"
                  aria-invalid={!!errors.recipientId}
                  aria-describedby="recipientId-error"
                >
                  <SelectValue placeholder="Choose a recipient" />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}{" "}
                      <span className="text-muted-foreground">
                        · {r.bankName} ••{r.accountLast4}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="recipientId-error" message={errors.recipientId?.message} />
        </div>
      )}

      <div className={cn("grid gap-4", kind === "internal" && "sm:grid-cols-2")}>
        <div className="space-y-2">
          <Label htmlFor="fromAccountId">From</Label>
          <Controller
            control={control}
            name="fromAccountId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="fromAccountId" aria-invalid={!!errors.fromAccountId}>
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <AccountOption account={a} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="fromAccountId-error" message={errors.fromAccountId?.message} />
        </div>
        {kind === "internal" && (
          <div className="space-y-2">
            <Label htmlFor="toAccountId">To</Label>
            <Controller
              control={control}
              name="toAccountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="toAccountId"
                    aria-invalid={!!errors.toAccountId}
                    aria-describedby="toAccountId-error"
                  >
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === fromId}>
                        {a.name} <span className="tabular text-muted-foreground">••{a.last4}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError id="toAccountId-error" message={errors.toAccountId?.message} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount">Amount</Label>
          {from && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                form.setValue(
                  "amount",
                  formatMoney(from.availableCents, { sign: "never" }).slice(1),
                  { shouldValidate: true },
                )
              }
            >
              Available{" "}
              <span className="tabular font-medium">{formatMoney(from.availableCents)}</span>
            </button>
          )}
        </div>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="amount"
              size="lg"
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              aria-describedby="amount-error"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError id="amount-error" message={errors.amount?.message} />
      </div>

      {kind === "external" && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-[13px] font-medium">Send via</legend>
            <Controller
              control={control}
              name="rail"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Payment rail" className="grid grid-cols-2 gap-2">
                  {(["ach", "wire"] as const).map((rail) => (
                    <button
                      key={rail}
                      type="button"
                      role="radio"
                      aria-checked={field.value === rail}
                      onClick={() => field.onChange(rail)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        field.value === rail
                          ? "border-foreground/40 bg-accent ring-1 ring-foreground/20"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <p className="text-sm font-semibold">{rail === "ach" ? "ACH" : "Wire"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{RAIL_ETA[rail]}</p>
                      <p className="text-xs text-muted-foreground">
                        No fee · up to {formatMoney(RAIL_LIMITS[rail], { compact: true })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            />
          </fieldset>

          <div className="space-y-2">
            <Label>When</Label>
            <div className="flex flex-wrap items-start gap-2">
              <Controller
                control={control}
                name="when"
                render={({ field }) => (
                  <Segmented
                    aria-label="When to send"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "now", label: "Send now" },
                      { value: "later", label: "Schedule" },
                    ]}
                  />
                )}
              />
              {when === "later" && (
                <div className="flex-1 space-y-1">
                  <Input
                    type="date"
                    aria-label="Payment date"
                    min={today}
                    className="h-8"
                    aria-invalid={!!errors.scheduledFor}
                    {...register("scheduledFor")}
                  />
                  <FieldError id="scheduledFor-error" message={errors.scheduledFor?.message} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="memo">
          Memo <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="memo"
          maxLength={140}
          placeholder={kind === "internal" ? "e.g. Monthly sweep" : "e.g. Invoice #1042"}
          {...register("memo")}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="brand">
          Review
        </Button>
      </DialogFooter>
    </form>
  );
}
