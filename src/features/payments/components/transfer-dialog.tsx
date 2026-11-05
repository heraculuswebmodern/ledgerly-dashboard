"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/features/accounts/api";
import { ApiClientError } from "@/lib/api-client";
import type {
  Account,
  ParsedTransferInput,
  Recipient,
  TransferContext,
  TransferResult,
} from "@/lib/contracts";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { invalidateLedger, useCreateTransfer, useRecipients } from "../api";
import { buildTransfer, type TransferFormValues } from "../transfer-form";
import { TransferDetailsStep } from "./transfer-details-step";
import { TransferReviewStep } from "./transfer-review-step";
import { TransferSuccessStep } from "./transfer-success-step";

type Step = "details" | "review" | "success";
const STEPS: { id: Step; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "success", label: "Done" },
];

export type TransferPreset = { kind?: "internal" | "external"; recipientId?: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaults(accounts: Account[], preset: TransferPreset): TransferFormValues {
  const checking = accounts.find((a) => a.kind === "checking") ?? accounts[0];
  const savings = accounts.find((a) => a.kind === "savings");
  const internal = preset.kind === "internal";
  return {
    kind: internal ? "internal" : "external",
    fromAccountId: internal ? (savings?.id ?? "") : (checking?.id ?? ""),
    toAccountId: internal ? (checking?.id ?? "") : "",
    recipientId: preset.recipientId ?? "",
    rail: "ach",
    amount: "",
    when: "now",
    scheduledFor: "",
    memo: "",
  };
}

export function TransferDialog({
  open,
  preset,
  onClose,
}: {
  open: boolean;
  preset: TransferPreset;
  onClose: () => void;
}) {
  const accounts = useAccounts();
  const recipients = useRecipients();
  const ready = accounts.data && recipients.data;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[480px]">
        {accounts.isError || recipients.isError ? (
          <>
            <DialogTitle className="sr-only">Send money</DialogTitle>
            <ErrorState
              onRetry={() => void Promise.all([accounts.refetch(), recipients.refetch()])}
            />
          </>
        ) : !ready ? (
          <>
            <DialogTitle className="sr-only">Send money</DialogTitle>
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </>
        ) : (
          <TransferWizard
            key={`${preset.kind ?? ""}-${preset.recipientId ?? ""}`}
            accounts={accounts.data}
            recipients={recipients.data}
            preset={preset}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransferWizard({
  accounts,
  recipients,
  preset,
  onClose,
}: {
  accounts: Account[];
  recipients: Recipient[];
  preset: TransferPreset;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("details");
  const [input, setInput] = useState<ParsedTransferInput | null>(null);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const create = useCreateTransfer();
  const [today] = useState(todayIso);

  // React Hook Form re-reads options on every render, so this closure always validates
  // against the latest balances and recipients.
  const ctx: TransferContext = { accounts, recipients, today };
  const resolver: Resolver<TransferFormValues> = async (values) => {
    const built = buildTransfer(values, ctx);
    if (built.ok) return { values, errors: {} };
    return {
      values: {},
      errors: Object.fromEntries(
        Object.entries(built.errors).map(([field, message]) => [
          field,
          { type: "validate", message },
        ]),
      ),
    };
  };

  const form = useForm<TransferFormValues>({
    defaultValues: defaults(accounts, preset),
    resolver,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const kind = useWatch({ control: form.control, name: "kind" });

  const toLabel = (() => {
    if (!input) return "";
    if (input.kind === "internal")
      return accounts.find((a) => a.id === input.toAccountId)?.name ?? "";
    return recipients.find((r) => r.id === input.recipientId)?.name ?? "";
  })();

  const onDetails = form.handleSubmit((values) => {
    const built = buildTransfer(values, ctx);
    if (built.ok) {
      setInput(built.input);
      setSubmitError(null);
      setStep("review");
    }
  });

  const onConfirm = () => {
    if (!input) return;
    setSubmitError(null);
    create.mutate(input, {
      onSuccess: (res) => {
        setResult(res);
        setStep("success");
        toast.success(
          res.kind === "scheduled"
            ? `Scheduled ${formatMoney(res.amountCents)} to ${toLabel}`
            : `Sent ${formatMoney(res.amountCents)} to ${toLabel}`,
        );
      },
      onError: (error) => {
        setSubmitError(error.message);
        if (error instanceof ApiClientError && error.status === 422) {
          // Balances may have changed elsewhere; refresh and send the user back to fix it.
          void invalidateLedger(queryClient);
        }
      },
    });
  };

  const title =
    step === "success" ? "Payment complete" : kind === "internal" ? "Move money" : "Send money";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {step === "details" &&
            "Enter the payment details. You'll review everything before it's sent."}
          {step === "review" &&
            "Check the details carefully. Payments can't be recalled once sent."}
          {step === "success" && "A receipt is available in Transactions."}
        </DialogDescription>
      </DialogHeader>

      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => {
          const index = STEPS.findIndex((x) => x.id === step);
          const state = i < index ? "done" : i === index ? "current" : "todo";
          return (
            <li
              key={s.id}
              className="flex flex-1 flex-col gap-1.5"
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                className={cn(
                  "h-1 rounded-full transition-colors",
                  state === "todo" ? "bg-muted" : "bg-brand-gradient",
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  state === "todo" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {step === "details" && (
        <TransferDetailsStep
          form={form}
          accounts={accounts}
          recipients={recipients}
          today={today}
          onCancel={onClose}
          onSubmit={onDetails}
        />
      )}
      {step === "review" && input && (
        <TransferReviewStep
          input={input}
          accounts={accounts}
          recipients={recipients}
          today={today}
          pending={create.isPending}
          error={submitError}
          onBack={() => setStep("details")}
          onConfirm={onConfirm}
        />
      )}
      {step === "success" && result && (
        <TransferSuccessStep
          result={result}
          toLabel={toLabel}
          onDone={onClose}
          onAnother={() => {
            form.reset({ ...form.getValues(), amount: "", memo: "" });
            setInput(null);
            setResult(null);
            setStep("details");
          }}
        />
      )}
    </>
  );
}
