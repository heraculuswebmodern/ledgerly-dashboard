import "server-only";

import type { Account } from "@/lib/contracts";
import { accountsRepo, transactionsRepo } from "@/server/repositories";

import type { ServiceContext } from "./context";
import { computeAccount } from "./mappers";

export function listAccounts({ db, now, today }: ServiceContext): Account[] {
  const transactions = transactionsRepo.list(db, now);
  return accountsRepo.list(db).map((a) => computeAccount(a, transactions, today));
}
