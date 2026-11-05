import { Faker, base, en } from "@faker-js/faker";

import type { Category, Notification, PaymentMethod, Settings } from "@/lib/contracts";
import { NOTIFICATION_PREFS } from "@/lib/contracts";
import { COMPANY_NAME, DEMO_CREDENTIALS } from "@/lib/demo";
import { sumCents } from "@/lib/money";

import type {
  AccountRecord,
  CardRecord,
  Database,
  RecipientRecord,
  ScheduledPaymentRecord,
  TransactionRecord,
} from "./types";

export const SEED = 4242;
const DAYS_OF_HISTORY = 365;

/**
 * Deterministic sample data for a fictional startup. The same seed and the same `now`
 * date always produce the same dataset. Dates are generated relative to "today" so the
 * demo never looks stale; balances are derived from opening balances + transactions.
 */
export function generateSeed({ now = new Date() }: { now?: Date } = {}): Database {
  const f = new Faker({ locale: [en, base] });
  f.seed(SEED);

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const at = (daysAgo: number, hour = 12, minute = 0) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const dateOnly = (daysFromToday: number) => at(-daysFromToday).slice(0, 10);
  const uid = (prefix: string) =>
    `${prefix}_${f.string.alphanumeric({ length: 12, casing: "mixed" })}`;
  const dollars = (min: number, max: number) => f.number.int({ min: min * 100, max: max * 100 });
  const routing = () => {
    const d = Array.from({ length: 8 }, () => f.number.int({ min: 0, max: 9 }));
    const partial = 3 * (d[0]! + d[3]! + d[6]!) + 7 * (d[1]! + d[4]!) + 1 * (d[2]! + d[5]!);
    // Solve 7*d7 + d8 ≡ -partial (mod 10) with a random d7.
    const d7 = d[7]!;
    const d8 = ((-(partial + 7 * d7) % 10) + 10) % 10;
    return [...d.slice(0, 7), d7, d8].join("");
  };

  // ---- Accounts --------------------------------------------------------------------------
  const ledgerlyRouting = "091311229";
  const accounts: AccountRecord[] = [
    { kind: "checking", name: "Operating", last4: "4821", apyBps: 0 },
    { kind: "savings", name: "Reserve", last4: "7390", apyBps: 310 },
    { kind: "treasury", name: "Treasury", last4: "1056", apyBps: 425 },
  ].map((a) => ({
    ...a,
    kind: a.kind as AccountRecord["kind"],
    id: uid("acct"),
    routingNumber: ledgerlyRouting,
    openingBalanceCents: 0,
    openedAt: at(DAYS_OF_HISTORY + 120),
  }));
  const targets = [128_451_237, 61_204_018, 236_880_450];
  const [checking, savings, treasury] = accounts as [AccountRecord, AccountRecord, AccountRecord];

  // ---- People, cards, recipients -------------------------------------------------------
  const user = {
    id: uid("usr"),
    name: "Avery Morgan",
    email: DEMO_CREDENTIALS.email,
    role: "Head of Finance",
    company: COMPANY_NAME,
  };

  const luhnPan = () => {
    const digits = ["4", ...f.string.numeric(14).split("")].map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let v = digits[digits.length - 1 - i]!;
      if (i % 2 === 0) {
        v *= 2;
        if (v > 9) v -= 9;
      }
      sum += v;
    }
    return [...digits, (10 - (sum % 10)) % 10].join("");
  };
  const expiry = () =>
    `${String(f.number.int({ min: 1, max: 12 })).padStart(2, "0")}/${String((today.getUTCFullYear() + f.number.int({ min: 2, max: 4 })) % 100).padStart(2, "0")}`;

  const cardSpecs: Omit<CardRecord, "id" | "pan" | "cvc" | "expiry" | "accountId">[] = [
    {
      nickname: "AWS & infrastructure",
      holder: "Maya Chen",
      kind: "virtual",
      status: "active",
      theme: "ink",
      monthlyLimitCents: 3_000_000,
    },
    {
      nickname: "Software subscriptions",
      holder: "Avery Morgan",
      kind: "virtual",
      status: "active",
      theme: "emerald",
      monthlyLimitCents: 2_500_000,
    },
    {
      nickname: "Team travel",
      holder: "Jordan Ellis",
      kind: "physical",
      status: "active",
      theme: "slate",
      monthlyLimitCents: 1_500_000,
    },
    {
      nickname: "Team meals",
      holder: "Priya Raman",
      kind: "virtual",
      status: "active",
      theme: "teal",
      monthlyLimitCents: 300_000,
    },
    {
      nickname: "Office & equipment",
      holder: "Sam Okafor",
      kind: "physical",
      status: "frozen",
      theme: "ink",
      monthlyLimitCents: 800_000,
    },
    {
      nickname: "Growth marketing",
      holder: "Lena Fischer",
      kind: "virtual",
      status: "active",
      theme: "emerald",
      monthlyLimitCents: 2_000_000,
    },
  ];
  const cards: CardRecord[] = cardSpecs.map((spec) => ({
    ...spec,
    id: uid("card"),
    pan: luhnPan(),
    cvc: f.string.numeric(3),
    expiry: expiry(),
    accountId: checking.id,
  }));
  const cardFor: Partial<Record<Category, CardRecord>> = {
    infrastructure: cards[0],
    software: cards[1],
    travel: cards[2],
    meals: cards[3],
    office: cards[4],
    marketing: cards[5],
  };

  const banks = [
    "JPMorgan Chase",
    "Wells Fargo",
    "Bank of America",
    "Citibank",
    "U.S. Bank",
    "PNC Bank",
  ];
  const recipientSpecs = [
    { name: "Mission Bay Workspace", email: "billing@missionbayworkspace.com", defaultRail: "ach" },
    { name: "Pilot Accounting", email: "ar@pilotaccounting.co", defaultRail: "ach" },
    { name: "Cooley LLP", email: "remittance@cooley.example", defaultRail: "wire" },
    { name: "Northwind Fabrication", email: "invoices@northwindfab.com", defaultRail: "wire" },
    { name: "Lumen Design Studio", email: "hello@lumendesign.studio", defaultRail: "ach" },
    { name: "Kestrel Components", email: "ap@kestrelcomponents.com", defaultRail: "wire" },
    { name: "Brightline Staffing", email: "payments@brightline.work", defaultRail: "ach" },
    { name: "Ada Martinez", email: "ada.martinez@fastmail.com", defaultRail: "ach" },
  ] as const;
  const recipients: RecipientRecord[] = recipientSpecs.map((spec, i) => ({
    ...spec,
    id: uid("rcp"),
    bankName: banks[i % banks.length]!,
    routingNumber: routing(),
    accountNumber: f.string.numeric(f.number.int({ min: 9, max: 12 })),
    createdAt: at(f.number.int({ min: 200, max: 420 })),
  }));
  const recipientByName = new Map(recipients.map((r) => [r.name, r]));

  // ---- Transactions ----------------------------------------------------------------------
  const transactions: TransactionRecord[] = [];

  type TxSpec = {
    daysAgo: number;
    account: AccountRecord;
    counterparty: string;
    description: string;
    category: Category;
    amountCents: number;
    method: PaymentMethod;
    hour?: number;
    transferGroupId?: string;
  };

  const add = (spec: TxSpec) => {
    const outflow = spec.amountCents < 0;
    const date = at(
      spec.daysAgo,
      spec.hour ?? f.number.int({ min: 8, max: 19 }),
      f.number.int({ min: 0, max: 59 }),
    );
    const settleDays = spec.method === "card" ? 1 : spec.method === "ach" ? 2 : 0;
    let status: TransactionRecord["status"] = "posted";
    if (spec.method !== "transfer" && spec.daysAgo < settleDays + 1 && spec.daysAgo <= 2)
      status = "pending";
    if (
      outflow &&
      spec.method !== "transfer" &&
      spec.daysAgo > 3 &&
      f.datatype.boolean({ probability: 0.012 })
    ) {
      status = "failed";
    }
    const settle = new Date(date);
    settle.setUTCDate(settle.getUTCDate() + settleDays);
    const card = spec.method === "card" ? (cardFor[spec.category] ?? null) : null;
    const recipient = recipientByName.get(spec.counterparty) ?? null;

    transactions.push({
      id: uid("txn"),
      accountId: spec.account.id,
      date,
      postedAt: status === "posted" ? settle.toISOString() : null,
      settlesAt: status === "pending" ? settle.toISOString() : null,
      counterparty: spec.counterparty,
      description: spec.description,
      category: spec.category,
      amountCents: spec.amountCents,
      status,
      method: spec.method,
      cardId: card?.id ?? null,
      recipientId: recipient?.id ?? null,
      transferGroupId: spec.transferGroupId ?? null,
      failureReason:
        status === "failed"
          ? f.helpers.arrayElement([
              "Declined by recipient bank (R01: insufficient funds at counterparty)",
              "Card declined: merchant category blocked",
              "Returned: account closed (R02)",
            ])
          : null,
      note: "",
      attachments:
        outflow && Math.abs(spec.amountCents) > 500_000 && f.datatype.boolean({ probability: 0.4 })
          ? [
              {
                name: `invoice-${f.string.numeric(5)}.pdf`,
                sizeKb: f.number.int({ min: 48, max: 640 }),
              },
            ]
          : [],
    });
  };

  const transfer = (
    daysAgo: number,
    from: AccountRecord,
    to: AccountRecord,
    amount: number,
    memo: string,
  ) => {
    const group = uid("xfr");
    const hour = 9;
    add({
      daysAgo,
      account: from,
      counterparty: `${to.name} ••${to.last4}`,
      description: memo,
      category: "transfer",
      amountCents: -amount,
      method: "transfer",
      hour,
      transferGroupId: group,
    });
    add({
      daysAgo,
      account: to,
      counterparty: `${from.name} ••${from.last4}`,
      description: memo,
      category: "transfer",
      amountCents: amount,
      method: "transfer",
      hour,
      transferGroupId: group,
    });
  };

  const software: [string, number, number, number][] = [
    ["Google Workspace", 4, 1440, 1620],
    ["Slack", 5, 1150, 1260],
    ["Figma", 6, 880, 960],
    ["Linear", 6, 460, 520],
    ["GitHub", 7, 1210, 1310],
    ["Notion", 8, 620, 680],
    ["Vercel", 9, 600, 940],
    ["Datadog", 11, 2800, 3650],
  ];
  const customers = [
    "Vantage Health",
    "Orbital Freight",
    "Northstar Logistics",
    "Meridian Foods",
    "Cobalt Mining Co.",
    "Atlas Agritech",
  ];

  for (let d = DAYS_OF_HISTORY; d >= 0; d--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - d);
    const dom = date.getUTCDate();
    const month = date.getUTCMonth();
    const weekday = date.getUTCDay();
    const isWeekday = weekday > 0 && weekday < 6;
    const lastDayOfMonth =
      new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate() === dom;
    const growth = Math.round(((DAYS_OF_HISTORY - d) / DAYS_OF_HISTORY) * 1_600_000);

    if (dom === 1) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Mission Bay Workspace",
        description: "Office lease · monthly",
        category: "rent",
        amountCents: -2_450_000,
        method: "ach",
        hour: 7,
      });
    }
    if (dom === 1 || dom === 15) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Gusto",
        description: "Payroll · 38 employees",
        category: "payroll",
        amountCents: -(11_200_000 + growth + dollars(0, 4200)),
        method: "ach",
        hour: 6,
      });
    }
    if (dom === 3) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Amazon Web Services",
        description: "AWS · monthly usage",
        category: "infrastructure",
        amountCents: -dollars(16_200, 23_400),
        method: "card",
      });
    }
    for (const [name, day, min, max] of software) {
      if (dom === day)
        add({
          daysAgo: d,
          account: checking,
          counterparty: name,
          description: `${name} subscription`,
          category: "software",
          amountCents: -dollars(min, max),
          method: "card",
        });
    }
    if (dom === 7) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Vouch Insurance",
        description: "D&O + general liability",
        category: "insurance",
        amountCents: -348_000,
        method: "ach",
      });
    }
    if (dom === 10) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Pilot Accounting",
        description: "Bookkeeping & tax",
        category: "professional",
        amountCents: -225_000,
        method: "ach",
      });
    }
    if (dom === 15 && [0, 3, 5, 8].includes(month)) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "IRS · EFTPS",
        description: "Estimated federal tax payment",
        category: "taxes",
        amountCents: -dollars(38_000, 46_000),
        method: "ach",
        hour: 10,
      });
    }
    if (lastDayOfMonth) {
      add({
        daysAgo: d,
        account: treasury,
        counterparty: "Ledgerly Treasury",
        description: "Monthly yield",
        category: "interest",
        amountCents: dollars(8_200, 8_900),
        method: "transfer",
        hour: 23,
      });
      add({
        daysAgo: d,
        account: savings,
        counterparty: "Ledgerly Savings",
        description: "Monthly interest",
        category: "interest",
        amountCents: dollars(1_480, 1_690),
        method: "transfer",
        hour: 23,
      });
    }
    if (dom === 25) {
      transfer(d, treasury, checking, 13_000_000, "Treasury rebalance to operating");
    }
    if (dom === 20 && month % 3 === 0) {
      transfer(d, checking, savings, 2_500_000, "Quarterly reserve contribution");
    }

    // Revenue
    if (isWeekday && f.datatype.boolean({ probability: 0.58 })) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Stripe",
        description: "Stripe payout",
        category: "revenue",
        amountCents: dollars(5_200, 17_500),
        method: "ach",
        hour: 5,
      });
    }
    if (dom === 12 || dom === 26) {
      const customer = f.helpers.arrayElement(customers);
      add({
        daysAgo: d,
        account: checking,
        counterparty: customer,
        description: `Invoice INV-${f.string.numeric(4)} · annual contract`,
        category: "revenue",
        amountCents: dollars(32_000, 88_000),
        method: "wire",
        hour: 14,
      });
    }

    // Variable spend
    if (isWeekday && weekday === 1 && f.datatype.boolean({ probability: 0.75 })) {
      const ad = f.helpers.arrayElement(["Google Ads", "LinkedIn Ads", "Meta Ads"]);
      add({
        daysAgo: d,
        account: checking,
        counterparty: ad,
        description: `${ad} · campaign spend`,
        category: "marketing",
        amountCents: -dollars(1_200, 6_400),
        method: "card",
      });
    }
    if (f.datatype.boolean({ probability: 0.11 })) {
      const [merchant, min, max] = f.helpers.arrayElement([
        ["Delta Air Lines", 380, 1_900],
        ["United Airlines", 340, 2_200],
        ["Alaska Airlines", 210, 860],
        ["Airbnb", 600, 2_400],
        ["Marriott", 420, 1_600],
        ["Hilton", 380, 1_400],
      ] as const);
      add({
        daysAgo: d,
        account: checking,
        counterparty: merchant,
        description: "Team travel",
        category: "travel",
        amountCents: -dollars(min, max),
        method: "card",
      });
    }
    if (f.datatype.boolean({ probability: 0.13 })) {
      const merchant = f.helpers.arrayElement(["Uber", "Lyft"]);
      add({
        daysAgo: d,
        account: checking,
        counterparty: merchant,
        description: "Ground transport",
        category: "travel",
        amountCents: -dollars(18, 86),
        method: "card",
      });
    }
    if (isWeekday && f.datatype.boolean({ probability: 0.24 })) {
      const [merchant, min, max] = f.helpers.arrayElement([
        ["DoorDash", 60, 420],
        ["Sweetgreen", 40, 260],
        ["Blue Bottle Coffee", 18, 96],
        ["Tartine Bakery", 30, 180],
        ["Chipotle Catering", 180, 520],
      ] as const);
      add({
        daysAgo: d,
        account: checking,
        counterparty: merchant,
        description: "Team meal",
        category: "meals",
        amountCents: -dollars(min, max),
        method: "card",
      });
    }
    if (f.datatype.boolean({ probability: 0.07 })) {
      const [merchant, min, max] = f.helpers.arrayElement([
        ["Amazon Business", 60, 1_400],
        ["Apple", 1_200, 3_900],
        ["B&H Photo", 140, 2_200],
        ["IKEA Business", 200, 1_800],
        ["Staples", 40, 320],
      ] as const);
      add({
        daysAgo: d,
        account: checking,
        counterparty: merchant,
        description: "Office & equipment",
        category: "office",
        amountCents: -dollars(min, max),
        method: "card",
      });
    }
    if (dom === 18 && f.datatype.boolean({ probability: 0.7 })) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Cooley LLP",
        description: "Legal services · corporate",
        category: "professional",
        amountCents: -dollars(6_000, 18_500),
        method: "wire",
      });
    }
    if (dom === 22 && f.datatype.boolean({ probability: 0.6 })) {
      add({
        daysAgo: d,
        account: checking,
        counterparty: "Northwind Fabrication",
        description: "Prototype batch · PO-" + f.string.numeric(4),
        category: "office",
        amountCents: -dollars(9_000, 28_000),
        method: "wire",
      });
    }
  }

  // A few touches that make the data feel used.
  const firstNoted = transactions.find(
    (t) => t.counterparty === "Amazon Web Services" && t.status === "posted",
  );
  if (firstNoted)
    firstNoted.note = "Includes reserved-instance renewal for the robotics simulation cluster.";

  // Derive opening balances so the current posted balances land on round-looking targets.
  accounts.forEach((account, i) => {
    const posted = sumCents(
      transactions
        .filter((t) => t.accountId === account.id && t.status === "posted")
        .map((t) => t.amountCents),
    );
    account.openingBalanceCents = targets[i]! - posted;
  });

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

  // ---- Scheduled payments, notifications, settings --------------------------------------
  const daysUntilNextMonth = (dayOfMonth: number) => {
    const next = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, dayOfMonth));
    return Math.round((next.getTime() - today.getTime()) / 86_400_000);
  };
  const r = (name: string) => recipientByName.get(name)!;
  const scheduledSpecs: ScheduledPaymentRecord[] = [
    {
      id: uid("sch"),
      recipientId: r("Lumen Design Studio").id,
      fromAccountId: checking.id,
      amountCents: 650_000,
      rail: "ach",
      dueDate: dateOnly(3),
      memo: "Brand refresh · milestone 2",
    },
    {
      id: uid("sch"),
      recipientId: r("Northwind Fabrication").id,
      fromAccountId: checking.id,
      amountCents: 4_280_000,
      rail: "wire",
      dueDate: dateOnly(6),
      memo: "PO-2291 · actuator housings",
    },
    {
      id: uid("sch"),
      recipientId: r("Mission Bay Workspace").id,
      fromAccountId: checking.id,
      amountCents: 2_450_000,
      rail: "ach",
      dueDate: dateOnly(daysUntilNextMonth(1)),
      memo: "Office lease",
    },
    {
      id: uid("sch"),
      recipientId: r("Pilot Accounting").id,
      fromAccountId: checking.id,
      amountCents: 225_000,
      rail: "ach",
      dueDate: dateOnly(daysUntilNextMonth(10)),
      memo: "Bookkeeping & tax",
    },
  ];
  const scheduled = scheduledSpecs.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const lastWire = transactions.find((t) => t.method === "wire" && t.amountCents > 0);
  const notifications: Notification[] = [
    {
      id: uid("ntf"),
      kind: "payment",
      title: "Wire received",
      body: lastWire
        ? `${lastWire.counterparty} sent you an incoming wire.`
        : "An incoming wire arrived.",
      createdAt: lastWire?.date ?? at(1),
      read: false,
      href: "/transactions?method=wire",
    },
    {
      id: uid("ntf"),
      kind: "card",
      title: "Card frozen",
      body: "Office & equipment (Sam Okafor) was frozen by Avery Morgan.",
      createdAt: at(2, 16, 12),
      read: false,
      href: "/cards",
    },
    {
      id: uid("ntf"),
      kind: "payment",
      title: "Payment scheduled",
      body: "Lumen Design Studio will be paid in 3 days.",
      createdAt: at(3, 10, 4),
      read: false,
      href: "/payments",
    },
    {
      id: uid("ntf"),
      kind: "security",
      title: "New sign-in",
      body: "Chrome on macOS · San Francisco, CA.",
      createdAt: at(4, 8, 41),
      read: true,
      href: "/settings",
    },
    {
      id: uid("ntf"),
      kind: "info",
      title: "Statement ready",
      body: "Your monthly statements for Operating, Reserve and Treasury are available.",
      createdAt: at(today.getUTCDate() - 1, 6, 0),
      read: true,
      href: "/accounts",
    },
  ];

  const notificationPrefs = Object.fromEntries(
    NOTIFICATION_PREFS.map((key) => [
      key,
      { email: key !== "productUpdates", push: key !== "weeklySummary" },
    ]),
  ) as Settings["notifications"];

  const settings: Settings = {
    profile: {
      name: user.name,
      email: user.email,
      phone: "+1 (415) 555-0142",
      title: user.role,
      timezone: "America/Los_Angeles",
    },
    security: { twoFactorEnabled: true, lastPasswordChange: at(74), sessions: 2 },
    notifications: notificationPrefs,
    lowBalanceThresholdCents: 25_000_000,
  };

  return { user, accounts, transactions, cards, recipients, scheduled, notifications, settings };
}
