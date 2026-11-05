# Ledgerly: build plan

> Business banking, simplified.
> A technical case study: a business banking dashboard with a mock, typed backend that deploys to Vercel with zero external services.

## 1. Architecture

```
Browser (React 19 client components)
   │  TanStack Query (server state)   Zustand (UI state: sidebar, command palette, filters draft)
   │  fetch() via typed api-client  ──►  shared Zod contracts (src/lib/contracts)
   ▼
Next.js App Router
   ├─ proxy.ts            → session check, redirects unauthenticated users to /login
   ├─ app/(auth)/login    → public
   ├─ app/(app)/*         → protected pages, rendered inside <AppShell>
   └─ app/api/*           → Route Handlers (thin): parse + validate input with Zod,
                            resolve session, call a service, serialize the response
                               ▼
src/server
   ├─ auth/      HMAC-signed, HTTP-only session cookie (Web Crypto, edge + node safe)
   ├─ services/  business rules (balances, transfers, card limits, analytics aggregation)
   ├─ repositories/  data access over the store (the only layer that touches the store)
   └─ db/        deterministic seed (faker, fixed seed) + per-session in-memory store
```

Key decisions

- **Per-session in-memory store.** Each demo session gets its own copy of the seeded dataset, so one visitor's
  transfers never leak into another's. Mutations persist for the life of the server instance. On Vercel an
  instance can be recycled; the store then re-seeds deterministically. That trade-off is documented in the README.
- **Balances are derived, not stored.** `balance = opening balance + Σ posted transactions`; available balance also
  subtracts pending outflows. A transfer simply appends transactions, so every screen stays consistent for free.
- **Money is integer cents everywhere.** One module (`src/lib/money.ts`) parses, adds and formats. Formatting never
  divides into floats; it splits whole units and cents with integer arithmetic.
- **Filters live in the URL** (`/transactions?q=aws&category=software`) so views are shareable and back-button safe.
  The same pure `queryTransactions()` function powers the list endpoint, CSV export and unit tests.

## 2. Data model (`src/lib/contracts`)

| Entity             | Key fields                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`             | id, name, email, company, role                                                                                                                                                                                      |
| `Account`          | id, kind (`checking` · `savings` · `treasury`), name, last4, routing, openingBalanceCents, apyBps → computed `balanceCents`, `availableCents`                                                                       |
| `Transaction`      | id, accountId, postedAt, counterparty, description, category, amountCents (signed), status (`posted` · `pending` · `failed`), method (`card` · `ach` · `wire` · `transfer`), cardId?, note, attachments, timeline[] |
| `Card`             | id, nickname, holder, kind (`virtual` · `physical`), last4, expiry, status (`active` · `frozen`), monthlyLimitCents, spentThisMonthCents (derived), accountId                                                       |
| `Recipient`        | id, name, email, bankName, accountLast4, routingNumber, defaultMethod (`ach` · `wire`)                                                                                                                              |
| `ScheduledPayment` | id, recipientId, amountCents, dueDate, method, memo                                                                                                                                                                 |
| `Notification`     | id, kind, title, body, createdAt, read                                                                                                                                                                              |
| `Settings`         | profile, security (twoFactor), notification preferences                                                                                                                                                             |

Seed: ~12 months of activity for a fictional startup ("Halcyon Robotics, Inc."), 350+ transactions, generated
relative to "today" with `faker.seed(4242)` so the shape is identical on every boot.

## 3. Pages

| Route           | Purpose                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`        | Split-screen brand panel + form, demo credentials hint                                                                                         |
| `/overview`     | Cash position hero, account balances, KPIs (in, out, net, burn, runway), cash-flow chart (7D/30D/90D/1Y), spend by category, recent + upcoming |
| `/accounts`     | Account cards with details (routing, APY), per-account activity                                                                                |
| `/transactions` | Search, filters, sortable table, pagination, detail drawer, CSV export                                                                         |
| `/payments`     | Send money / internal transfer wizard, recipients CRUD, scheduled payments                                                                     |
| `/cards`        | Card list, freeze/unfreeze, limits, reveal details                                                                                             |
| `/analytics`    | Trends, top merchants, category breakdown, income vs expenses                                                                                  |
| `/settings`     | Profile, security (2FA), notification preferences                                                                                              |

## 4. Component tree (abridged)

```
RootLayout (fonts, ThemeProvider, QueryProvider, Toaster)
├─ LoginPage → BrandPanel (LedgerLines, StatementPreview) · LoginForm
└─ AppLayout → AppShell
   ├─ Sidebar (Logo, NavItem×7, collapse toggle)      ├─ MobileNav (bottom bar + "more" sheet)
   ├─ Topbar (SearchTrigger, NotificationsMenu, ThemeToggle, UserMenu)
   ├─ CommandPalette (pages, actions, transactions, recipients)
   └─ <page>
      ├─ Overview: CashPositionHero · AccountStrip · KpiGrid · CashFlowChart · CategoryDonut · RecentTransactions · UpcomingPayments
      ├─ Transactions: TransactionToolbar (Search, FilterPopover, Export) · TransactionTable · Pagination · TransactionDrawer
      ├─ Payments: TransferWizard (Details → Review → Success) · RecipientList · RecipientDialog · ScheduledList
      ├─ Cards: CardGrid · PaymentCard (visual) · CardDetailsPanel (Reveal, Freeze, LimitForm)
      ├─ Analytics: TrendChart · IncomeVsExpenses · CategoryBreakdown · TopMerchants
      └─ Settings: ProfileForm · SecurityCard · NotificationPrefs
```

## 5. Build order (vertical slices, each ends with typecheck + lint + tests + commit)

1. Scaffold, tooling (ESLint, Prettier, Vitest, Playwright)
2. Brand tokens, logo, UI primitives, app shell, mock auth
3. Data layer: contracts, seed, store, repositories, services, route handlers
4. Overview
5. Transactions
6. Transfers + recipients
7. Cards
8. Analytics + settings
9. Verification (browser, both themes, mobile) and README
