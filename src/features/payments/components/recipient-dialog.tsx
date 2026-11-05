"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { ApiClientError } from "@/lib/api-client";
import {
  recipientInputSchema,
  recipientUpdateSchema,
  type Recipient,
  type RecipientUpdateInput,
} from "@/lib/contracts";

import { useSaveRecipient } from "../api";

type FormValues = RecipientUpdateInput;

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-negative" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function RecipientDialog({
  open,
  recipient,
  onClose,
}: {
  open: boolean;
  recipient: Recipient | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <RecipientForm key={recipient?.id ?? "new"} recipient={recipient} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function RecipientForm({
  recipient,
  onClose,
}: {
  recipient: Recipient | null;
  onClose: () => void;
}) {
  const editing = !!recipient;
  const save = useSaveRecipient(recipient?.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(editing ? recipientUpdateSchema : recipientInputSchema) as never,
    defaultValues: {
      name: recipient?.name ?? "",
      email: recipient?.email ?? "",
      bankName: recipient?.bankName ?? "",
      routingNumber: recipient?.routingNumber ?? "",
      accountNumber: "",
      defaultRail: recipient?.defaultRail ?? "ach",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      onClose();
    } catch (error) {
      if (error instanceof ApiClientError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) {
          form.setError(field as keyof FormValues, { message });
        }
      }
      if (!(error instanceof ApiClientError && Object.keys(error.fields).length)) {
        form.setError("root", {
          message: error instanceof Error ? error.message : "Couldn't save",
        });
      }
    }
  });

  const reg = (name: keyof FormValues) => ({
    id: `recipient-${name}`,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `recipient-${name}-error` : undefined,
    ...form.register(name),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${recipient.name}` : "Add a recipient"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Update payment details. Leave the account number blank to keep the current one."
            : "Save bank details once and pay this recipient by ACH or wire."}
        </DialogDescription>
      </DialogHeader>

      <Field id="recipient-name" label="Legal name" error={errors.name?.message}>
        <Input
          autoComplete="organization"
          placeholder="Northwind Fabrication LLC"
          {...reg("name")}
        />
      </Field>
      <Field
        id="recipient-email"
        label="Email for remittance (optional)"
        error={errors.email?.message}
      >
        <Input type="email" placeholder="ap@vendor.com" {...reg("email")} />
      </Field>
      <Field id="recipient-bankName" label="Bank name" error={errors.bankName?.message}>
        <Input placeholder="Wells Fargo" {...reg("bankName")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="recipient-routingNumber"
          label="Routing number"
          error={errors.routingNumber?.message}
          hint="9 digits (ABA)"
        >
          <Input
            inputMode="numeric"
            maxLength={9}
            placeholder="021000021"
            className="tabular"
            {...reg("routingNumber")}
          />
        </Field>
        <Field
          id="recipient-accountNumber"
          label="Account number"
          error={errors.accountNumber?.message}
          hint={editing ? `Current: ••${recipient.accountLast4}` : undefined}
        >
          <Input
            inputMode="numeric"
            maxLength={17}
            placeholder={editing ? "Unchanged" : "000123456789"}
            className="tabular"
            {...reg("accountNumber")}
          />
        </Field>
      </div>
      <div className="space-y-1.5">
        <Label>Default payment method</Label>
        <Controller
          control={form.control}
          name="defaultRail"
          render={({ field }) => (
            <Segmented
              aria-label="Default payment method"
              value={field.value}
              onValueChange={field.onChange}
              options={[
                { value: "ach", label: "ACH" },
                { value: "wire", label: "Wire" },
              ]}
            />
          )}
        />
      </div>

      {errors.root && (
        <p className="text-sm text-negative" role="alert">
          {errors.root.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {editing ? "Save changes" : "Add recipient"}
        </Button>
      </DialogFooter>
    </form>
  );
}
