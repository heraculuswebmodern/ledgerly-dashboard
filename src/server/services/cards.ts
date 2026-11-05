import "server-only";

import type { Card, CardSecrets, UpdateCardInput } from "@/lib/contracts";
import { notFound } from "@/server/http/handler";
import { cardsRepo, notificationsRepo, transactionsRepo } from "@/server/repositories";

import type { ServiceContext } from "./context";
import { toCard } from "./mappers";

export function listCards(ctx: ServiceContext): Card[] {
  const transactions = transactionsRepo.list(ctx.db, ctx.now);
  return cardsRepo.list(ctx.db).map((c) => toCard(c, transactions, ctx.today));
}

export function updateCard(ctx: ServiceContext, id: string, input: UpdateCardInput): Card {
  const before = cardsRepo.get(ctx.db, id);
  if (!before) throw notFound("Card");
  const statusChanged = input.status && input.status !== before.status;
  const card = cardsRepo.update(ctx.db, id, input)!;
  if (statusChanged) {
    notificationsRepo.push(ctx.db, {
      kind: "card",
      title: card.status === "frozen" ? "Card frozen" : "Card unfrozen",
      body: `${card.nickname} (${card.holder}) was ${card.status === "frozen" ? "frozen" : "unfrozen"} by ${ctx.db.user.name}.`,
      createdAt: ctx.now.toISOString(),
      href: "/cards",
    });
  }
  return toCard(card, transactionsRepo.list(ctx.db, ctx.now), ctx.today);
}

export function revealCard(ctx: ServiceContext, id: string): CardSecrets {
  const card = cardsRepo.get(ctx.db, id);
  if (!card) throw notFound("Card");
  return { cardId: card.id, pan: card.pan, cvc: card.cvc, expiry: card.expiry };
}
