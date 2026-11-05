import { beforeEach, describe, expect, it } from "vitest";

import { transferInputSchema } from "@/lib/contracts";
import { generateSeed } from "@/server/db/seed";
import type { Database } from "@/server/db/types";
import { ApiError } from "@/server/http/handler";
import { listAccounts } from "@/server/services/accounts";
import { listCards, updateCard } from "@/server/services/cards";
import type { ServiceContext } from "@/server/services/context";
import { getOverview } from "@/server/services/insights";
import { createTransfer, listScheduled } from "@/server/services/transfers";

/** Service-level tests: real seed, real repositories, no HTTP. */
let ctx: ServiceContext;
let db: Database;

beforeEach(() => {
  const now = new Date("2026-11-05T15:00:00Z");
  db = generateSeed({ now });
  ctx = { db, now, today: "2026-11-05" };
});

const byKind = (kind: string) => listAccounts(ctx).find((a) => a.kind === kind)!;

describe("transfers", () => {
  it("moves money between own accounts instantly and keeps the total unchanged", () => {
    const before = getOverview(ctx).totalCents;
    const savings = byKind("savings");
    const checking = byKind("checking");

    const result = createTransfer(
      ctx,
      transferInputSchema.parse({
        kind: "internal",
        fromAccountId: savings.id,
        toAccountId: checking.id,
        amountCents: 1_000_000,
      }),
    );

    expect(result.kind).toBe("sent");
    expect(byKind("savings").balanceCents).toBe(savings.balanceCents - 1_000_000);
    expect(byKind("checking").balanceCents).toBe(checking.balanceCents + 1_000_000);
    expect(getOverview(ctx).totalCents).toBe(before);
  });

  it("debits available balance immediately for an external payment and settles later", () => {
    const checking = byKind("checking");
    const recipient = db.recipients[0]!;
    createTransfer(
      ctx,
      transferInputSchema.parse({
        kind: "external",
        fromAccountId: checking.id,
        recipientId: recipient.id,
        rail: "ach",
        amountCents: 500_000,
      }),
    );
    const after = byKind("checking");
    expect(after.availableCents).toBe(checking.availableCents - 500_000);
    expect(after.balanceCents).toBe(checking.balanceCents);
    expect(db.transactions[0]).toMatchObject({
      status: "pending",
      counterparty: recipient.name,
      amountCents: -500_000,
    });

    // Ten minutes later the ACH payment has settled.
    const later = { ...ctx, now: new Date(ctx.now.getTime() + 10 * 60_000) };
    expect(listAccounts(later).find((a) => a.kind === "checking")!.balanceCents).toBe(
      checking.balanceCents - 500_000,
    );
  });

  it("schedules future-dated payments without touching balances", () => {
    const checking = byKind("checking");
    const result = createTransfer(
      ctx,
      transferInputSchema.parse({
        kind: "external",
        fromAccountId: checking.id,
        recipientId: db.recipients[1]!.id,
        rail: "wire",
        amountCents: 123_400,
        scheduledFor: "2026-11-20",
      }),
    );
    expect(result.kind).toBe("scheduled");
    expect(listScheduled(ctx).some((s) => s.id === result.scheduledPaymentId)).toBe(true);
    expect(byKind("checking").availableCents).toBe(checking.availableCents);
  });

  it("rejects overdrafts with a 422 and field details", () => {
    const savings = byKind("savings");
    const attempt = () =>
      createTransfer(
        ctx,
        transferInputSchema.parse({
          kind: "internal",
          fromAccountId: savings.id,
          toAccountId: byKind("checking").id,
          amountCents: savings.availableCents + 1,
        }),
      );
    expect(attempt).toThrow(ApiError);
    try {
      attempt();
    } catch (error) {
      expect((error as ApiError).status).toBe(422);
      expect((error as ApiError).fields).toHaveProperty("amountCents");
    }
  });
});

describe("cards", () => {
  it("freezes and unfreezes a card and records a notification", () => {
    const card = listCards(ctx).find((c) => c.status === "active")!;
    const unread = db.notifications.filter((n) => !n.read).length;
    expect(updateCard(ctx, card.id, { status: "frozen" }).status).toBe("frozen");
    expect(db.notifications.filter((n) => !n.read).length).toBe(unread + 1);
    expect(updateCard(ctx, card.id, { status: "active" }).status).toBe("active");
  });

  it("never exposes the full card number in list responses", () => {
    const serialized = JSON.stringify(listCards(ctx));
    for (const card of db.cards) expect(serialized).not.toContain(card.pan);
  });
});
