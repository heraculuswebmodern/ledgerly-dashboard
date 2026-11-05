import { describe, expect, it } from "vitest";

import { MINUS } from "@/lib/money";

import { isValidRoutingNumber, recipientInputSchema } from "./recipients";
import { checkTransfer, isScheduled, transferInputSchema, type TransferContext } from "./transfers";

const ctx: TransferContext = {
  today: "2026-11-05",
  accounts: [
    { id: "acct_checking1", name: "Operating", availableCents: 1_000_000 },
    { id: "acct_savings01", name: "Reserve", availableCents: 50_000_000 },
  ],
  recipients: [{ id: "rcp_vendor001" }],
};

const external = (overrides: Record<string, unknown> = {}) =>
  transferInputSchema.parse({
    kind: "external",
    fromAccountId: "acct_checking1",
    recipientId: "rcp_vendor001",
    rail: "ach",
    amountCents: 250_000,
    ...overrides,
  });

const internal = (overrides: Record<string, unknown> = {}) =>
  transferInputSchema.parse({
    kind: "internal",
    fromAccountId: "acct_savings01",
    toAccountId: "acct_checking1",
    amountCents: 250_000,
    ...overrides,
  });

describe("transfer input schema", () => {
  it("requires positive integer cents", () => {
    expect(transferInputSchema.safeParse({ ...external(), amountCents: 0 }).success).toBe(false);
    expect(transferInputSchema.safeParse({ ...external(), amountCents: -5 }).success).toBe(false);
    expect(transferInputSchema.safeParse({ ...external(), amountCents: 10.5 }).success).toBe(false);
  });

  it("rejects unknown kinds and malformed ids", () => {
    expect(transferInputSchema.safeParse({ ...external(), kind: "crypto" }).success).toBe(false);
    expect(transferInputSchema.safeParse({ ...external(), recipientId: "../etc" }).success).toBe(
      false,
    );
  });

  it("sanitizes and caps the memo", () => {
    expect(external({ memo: "  Invoice <b>42</b> " }).memo).toBe("Invoice b42/b");
    expect(transferInputSchema.safeParse({ ...external(), memo: "x".repeat(141) }).success).toBe(
      false,
    );
  });
});

describe("checkTransfer", () => {
  it("accepts a valid payment", () => {
    expect(checkTransfer(external(), ctx)).toEqual([]);
    expect(checkTransfer(internal(), ctx)).toEqual([]);
  });

  it("blocks payments above the available balance", () => {
    const issues = checkTransfer(external({ amountCents: 1_000_001 }), ctx);
    expect(issues).toEqual([
      { field: "amountCents", message: "Exceeds the available balance of $10,000.00 in Operating" },
    ]);
  });

  it("allows spending exactly the available balance", () => {
    expect(checkTransfer(external({ amountCents: 1_000_000 }), ctx)).toEqual([]);
  });

  it("enforces per-rail limits before balance checks", () => {
    const issues = checkTransfer(
      external({ fromAccountId: "acct_savings01", amountCents: 25_000_001 }),
      ctx,
    );
    expect(issues[0]?.message).toBe("ACH transfers are limited to $250,000");
    expect(
      checkTransfer(
        external({ fromAccountId: "acct_savings01", rail: "wire", amountCents: 25_000_001 }),
        ctx,
      ),
    ).toEqual([]);
  });

  it("rejects transfers to the same account", () => {
    const issues = checkTransfer(internal({ toAccountId: "acct_savings01" }), ctx);
    expect(issues).toContainEqual({ field: "toAccountId", message: "Choose a different account" });
  });

  it("rejects unknown accounts and recipients", () => {
    expect(
      checkTransfer(external({ fromAccountId: "acct_missing01" }), ctx).map((i) => i.field),
    ).toContain("fromAccountId");
    expect(
      checkTransfer(external({ recipientId: "rcp_missing01" }), ctx).map((i) => i.field),
    ).toContain("recipientId");
  });

  it("validates scheduled dates", () => {
    expect(checkTransfer(external({ scheduledFor: "2026-11-04" }), ctx)[0]?.field).toBe(
      "scheduledFor",
    );
    expect(checkTransfer(external({ scheduledFor: "2027-03-01" }), ctx)[0]?.field).toBe(
      "scheduledFor",
    );
    expect(checkTransfer(external({ scheduledFor: "2026-12-01" }), ctx)).toEqual([]);
  });

  it("treats today as send-now and future dates as scheduled", () => {
    expect(isScheduled(external({ scheduledFor: "2026-11-05" }), ctx.today)).toBe(false);
    expect(isScheduled(external({ scheduledFor: "2026-11-06" }), ctx.today)).toBe(true);
    expect(isScheduled(internal(), ctx.today)).toBe(false);
  });

  it("formats money in messages without floating point noise", () => {
    const issues = checkTransfer(external({ amountCents: 1_000_001 }), {
      ...ctx,
      accounts: [{ id: "acct_checking1", name: "Operating", availableCents: -1 }],
    });
    expect(issues[0]?.message).toContain(`${MINUS}$0.01`);
  });
});

describe("recipient validation", () => {
  it("validates ABA routing checksums", () => {
    expect(isValidRoutingNumber("021000021")).toBe(true); // well-known valid routing number
    expect(isValidRoutingNumber("021000022")).toBe(false);
    expect(isValidRoutingNumber("12345")).toBe(false);
  });

  it("validates a full recipient", () => {
    const valid = {
      name: "Northwind Fabrication",
      email: "AP@Northwind.com",
      bankName: "Wells Fargo",
      routingNumber: "021000021",
      accountNumber: "000123456789",
      defaultRail: "wire",
    };
    expect(recipientInputSchema.parse(valid).email).toBe("ap@northwind.com");
    expect(recipientInputSchema.safeParse({ ...valid, accountNumber: "12a" }).success).toBe(false);
    expect(recipientInputSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(recipientInputSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });
});
