import { describe, expect, it } from "vitest";

import type { TransferContext } from "@/lib/contracts";

import { buildTransfer, type TransferFormValues } from "./transfer-form";

const ctx: TransferContext = {
  today: "2026-11-05",
  accounts: [
    { id: "acct_checking1", name: "Operating", availableCents: 500_000 },
    { id: "acct_savings01", name: "Reserve", availableCents: 9_000_000 },
  ],
  recipients: [{ id: "rcp_vendor001" }],
};

const base: TransferFormValues = {
  kind: "external",
  fromAccountId: "acct_checking1",
  toAccountId: "",
  recipientId: "rcp_vendor001",
  rail: "ach",
  amount: "1,250.50",
  when: "now",
  scheduledFor: "",
  memo: "",
};

describe("buildTransfer (wizard validation)", () => {
  it("converts typed dollars into integer cents", () => {
    const result = buildTransfer(base, ctx);
    expect(result).toEqual({
      ok: true,
      input: expect.objectContaining({ kind: "external", amountCents: 125_050, rail: "ach" }),
    });
  });

  it("reports missing and malformed fields", () => {
    const result = buildTransfer({ ...base, amount: "12.345", recipientId: "" }, ctx);
    expect(result).toEqual({
      ok: false,
      errors: { amount: "Enter a valid amount, e.g. 1,250.00", recipientId: "Choose a recipient" },
    });
  });

  it("surfaces balance checks on the amount field", () => {
    const result = buildTransfer({ ...base, amount: "5000.01" }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.amount).toMatch(/Exceeds the available balance/);
  });

  it("requires a date when scheduling", () => {
    const result = buildTransfer({ ...base, when: "later" }, ctx);
    expect(result).toEqual({ ok: false, errors: { scheduledFor: "Pick a date" } });
  });

  it("builds internal transfers and blocks same-account moves", () => {
    const internal = {
      ...base,
      kind: "internal" as const,
      fromAccountId: "acct_savings01",
      toAccountId: "acct_checking1",
    };
    expect(buildTransfer(internal, ctx).ok).toBe(true);
    const same = buildTransfer({ ...internal, toAccountId: "acct_savings01" }, ctx);
    expect(same).toEqual({ ok: false, errors: { toAccountId: "Choose a different account" } });
  });
});
