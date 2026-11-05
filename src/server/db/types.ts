import type {
  AccountKind,
  CardKind,
  CardStatus,
  CardTheme,
  Category,
  Notification,
  PaymentMethod,
  SessionUser,
  Settings,
  TransactionStatus,
  TransferRail,
} from "@/lib/contracts";

/** Storage records. They hold a few fields (full PAN, account numbers) that never leave the server. */

export type AccountRecord = {
  id: string;
  kind: AccountKind;
  name: string;
  last4: string;
  routingNumber: string;
  openingBalanceCents: number;
  apyBps: number;
  openedAt: string;
};

export type TransactionRecord = {
  id: string;
  accountId: string;
  date: string;
  /** When the transaction posted; null while pending or if it failed. */
  postedAt: string | null;
  /** For pending items: when they will settle. Checked lazily on read. */
  settlesAt: string | null;
  counterparty: string;
  description: string;
  category: Category;
  amountCents: number;
  status: TransactionStatus;
  method: PaymentMethod;
  cardId: string | null;
  recipientId: string | null;
  /** Links the two legs of an internal transfer. */
  transferGroupId: string | null;
  failureReason: string | null;
  note: string;
  attachments: { name: string; sizeKb: number }[];
};

export type CardRecord = {
  id: string;
  nickname: string;
  holder: string;
  kind: CardKind;
  status: CardStatus;
  pan: string;
  cvc: string;
  expiry: string;
  accountId: string;
  theme: CardTheme;
  monthlyLimitCents: number;
};

export type RecipientRecord = {
  id: string;
  name: string;
  email: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  defaultRail: TransferRail;
  createdAt: string;
};

export type ScheduledPaymentRecord = {
  id: string;
  recipientId: string;
  fromAccountId: string;
  amountCents: number;
  rail: TransferRail;
  dueDate: string;
  memo: string;
};

export type Database = {
  user: SessionUser;
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  cards: CardRecord[];
  recipients: RecipientRecord[];
  scheduled: ScheduledPaymentRecord[];
  notifications: Notification[];
  settings: Settings;
};
