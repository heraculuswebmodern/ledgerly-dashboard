import "server-only";

import type { Notification, Settings } from "@/lib/contracts";
import type {
  AccountRecord,
  CardRecord,
  Database,
  RecipientRecord,
  ScheduledPaymentRecord,
  TransactionRecord,
} from "@/server/db/types";

/**
 * Repositories are the only code that touches the store. Each takes the session-scoped
 * database, which keeps services free of storage details and easy to test.
 */

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export const accountsRepo = {
  list: (db: Database): readonly AccountRecord[] => db.accounts,
  get: (db: Database, id: string) => db.accounts.find((a) => a.id === id) ?? null,
};

export const transactionsRepo = {
  /** Returns all transactions, first settling any pending items whose settlement time has passed. */
  list(db: Database, now: Date): readonly TransactionRecord[] {
    const iso = now.toISOString();
    for (const t of db.transactions) {
      if (t.status === "pending" && t.settlesAt && t.settlesAt <= iso) {
        t.status = "posted";
        t.postedAt = t.settlesAt;
        t.settlesAt = null;
      }
    }
    return db.transactions;
  },
  get: (db: Database, id: string, now: Date) =>
    transactionsRepo.list(db, now).find((t) => t.id === id) ?? null,
  insert(db: Database, records: TransactionRecord[]) {
    db.transactions.unshift(...records);
  },
  update(db: Database, id: string, patch: Partial<Pick<TransactionRecord, "category" | "note">>) {
    const record = db.transactions.find((t) => t.id === id);
    if (!record) return null;
    Object.assign(record, patch);
    return record;
  },
};

export const cardsRepo = {
  list: (db: Database): readonly CardRecord[] => db.cards,
  get: (db: Database, id: string) => db.cards.find((c) => c.id === id) ?? null,
  update(
    db: Database,
    id: string,
    patch: Partial<Pick<CardRecord, "status" | "monthlyLimitCents" | "nickname">>,
  ) {
    const card = db.cards.find((c) => c.id === id);
    if (!card) return null;
    Object.assign(card, patch);
    return card;
  },
};

export const recipientsRepo = {
  list: (db: Database): readonly RecipientRecord[] => db.recipients,
  get: (db: Database, id: string) => db.recipients.find((r) => r.id === id) ?? null,
  insert(db: Database, record: RecipientRecord) {
    db.recipients.push(record);
    return record;
  },
  update(db: Database, id: string, patch: Partial<Omit<RecipientRecord, "id" | "createdAt">>) {
    const record = db.recipients.find((r) => r.id === id);
    if (!record) return null;
    Object.assign(record, patch);
    return record;
  },
  remove(db: Database, id: string): boolean {
    const index = db.recipients.findIndex((r) => r.id === id);
    if (index === -1) return false;
    db.recipients.splice(index, 1);
    return true;
  },
};

export const scheduledRepo = {
  list: (db: Database): readonly ScheduledPaymentRecord[] => db.scheduled,
  insert(db: Database, record: ScheduledPaymentRecord) {
    db.scheduled.push(record);
    db.scheduled.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return record;
  },
  remove(db: Database, id: string): boolean {
    const index = db.scheduled.findIndex((s) => s.id === id);
    if (index === -1) return false;
    db.scheduled.splice(index, 1);
    return true;
  },
  removeForRecipient(db: Database, recipientId: string) {
    db.scheduled = db.scheduled.filter((s) => s.recipientId !== recipientId);
  },
};

export const notificationsRepo = {
  list: (db: Database): readonly Notification[] =>
    [...db.notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  push(db: Database, notification: Omit<Notification, "id" | "read">) {
    db.notifications.unshift({ ...notification, id: newId("ntf"), read: false });
    if (db.notifications.length > 30) db.notifications.length = 30;
  },
  markAllRead(db: Database) {
    for (const n of db.notifications) n.read = true;
  },
};

export const settingsRepo = {
  get: (db: Database): Settings => db.settings,
  update(db: Database, patch: (settings: Settings) => void) {
    patch(db.settings);
    return db.settings;
  },
};
