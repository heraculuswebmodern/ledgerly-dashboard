import { describe, expect, it } from "vitest";

import { transactionQuerySchema } from "@/lib/contracts";

import {
  countActiveFilters,
  filterTransactions,
  paginate,
  queryTransactions,
  sortTransactions,
  type QueryableTransaction,
} from "./transactions-query";

const tx = (overrides: Partial<QueryableTransaction>): QueryableTransaction => ({
  id: "txn_aaaaaaaa",
  accountId: "acct_checking",
  date: "2026-10-01T12:00:00.000Z",
  counterparty: "Acme",
  description: "",
  category: "software",
  amountCents: -1000,
  status: "posted",
  method: "card",
  note: "",
  ...overrides,
});

const DATA: QueryableTransaction[] = [
  tx({
    id: "txn_00000001",
    counterparty: "Amazon Web Services",
    category: "infrastructure",
    amountCents: -2_240_060,
    date: "2026-11-03T14:33:00.000Z",
  }),
  tx({
    id: "txn_00000002",
    counterparty: "Stripe",
    description: "Stripe payout",
    category: "revenue",
    amountCents: 1_248_000,
    method: "ach",
    date: "2026-11-02T05:00:00.000Z",
  }),
  tx({
    id: "txn_00000003",
    counterparty: "Gusto",
    category: "payroll",
    amountCents: -11_820_416,
    method: "ach",
    status: "pending",
    date: "2026-11-01T06:00:00.000Z",
  }),
  tx({
    id: "txn_00000004",
    counterparty: "Delta Air Lines",
    category: "travel",
    amountCents: -84_210,
    date: "2026-10-20T10:00:00.000Z",
    note: "Offsite in Denver",
  }),
  tx({
    id: "txn_00000005",
    counterparty: "Vantage Health",
    category: "revenue",
    amountCents: 6_420_000,
    method: "wire",
    date: "2026-10-12T14:00:00.000Z",
    accountId: "acct_savings",
  }),
  tx({
    id: "txn_00000006",
    counterparty: "Cooley LLP",
    category: "professional",
    amountCents: -950_000,
    method: "wire",
    status: "failed",
    date: "2026-10-05T09:00:00.000Z",
  }),
];

describe("filterTransactions", () => {
  it("returns everything with no filters", () => {
    expect(filterTransactions(DATA, {})).toHaveLength(DATA.length);
  });

  it("searches counterparty, description, notes and category labels, case-insensitively", () => {
    expect(filterTransactions(DATA, { q: "amazon" }).map((t) => t.id)).toEqual(["txn_00000001"]);
    expect(filterTransactions(DATA, { q: "PAYOUT" }).map((t) => t.id)).toEqual(["txn_00000002"]);
    expect(filterTransactions(DATA, { q: "denver" }).map((t) => t.id)).toEqual(["txn_00000004"]);
    expect(filterTransactions(DATA, { q: "payroll" }).map((t) => t.id)).toEqual(["txn_00000003"]);
  });

  it("matches numeric searches against absolute amounts", () => {
    expect(filterTransactions(DATA, { q: "842.1" }).map((t) => t.id)).toEqual(["txn_00000004"]);
    expect(filterTransactions(DATA, { q: "$12,480" }).map((t) => t.id)).toEqual(["txn_00000002"]);
  });

  it("filters by inclusive date range on the UTC day", () => {
    const ids = filterTransactions(DATA, { from: "2026-11-01", to: "2026-11-02" }).map((t) => t.id);
    expect(ids).toEqual(["txn_00000002", "txn_00000003"]);
  });

  it("combines multi-select filters with AND across fields, OR within a field", () => {
    const result = filterTransactions(DATA, { category: ["revenue", "payroll"], method: ["ach"] });
    expect(result.map((t) => t.id)).toEqual(["txn_00000002", "txn_00000003"]);
  });

  it("filters by status, account and direction", () => {
    expect(filterTransactions(DATA, { status: ["failed"] })).toHaveLength(1);
    expect(filterTransactions(DATA, { account: ["acct_savings"] })).toHaveLength(1);
    expect(filterTransactions(DATA, { direction: "in" }).every((t) => t.amountCents > 0)).toBe(
      true,
    );
    expect(filterTransactions(DATA, { direction: "out" }).every((t) => t.amountCents < 0)).toBe(
      true,
    );
  });

  it("filters by absolute amount range in cents", () => {
    const ids = filterTransactions(DATA, { min: 1_000_000, max: 7_000_000 }).map((t) => t.id);
    expect(ids).toEqual(["txn_00000001", "txn_00000002", "txn_00000005"]);
  });
});

describe("sortTransactions", () => {
  it("sorts by date descending by default semantics", () => {
    expect(sortTransactions(DATA, "date", "desc")[0]!.id).toBe("txn_00000001");
    expect(sortTransactions(DATA, "date", "asc")[0]!.id).toBe("txn_00000006");
  });

  it("sorts by signed amount", () => {
    expect(sortTransactions(DATA, "amount", "asc")[0]!.id).toBe("txn_00000003");
    expect(sortTransactions(DATA, "amount", "desc")[0]!.id).toBe("txn_00000005");
  });

  it("sorts by counterparty name", () => {
    expect(sortTransactions(DATA, "counterparty", "asc").map((t) => t.counterparty)[0]).toBe(
      "Amazon Web Services",
    );
  });

  it("does not mutate its input", () => {
    const copy = [...DATA];
    sortTransactions(DATA, "amount", "asc");
    expect(DATA).toEqual(copy);
  });
});

describe("paginate", () => {
  it("clamps out-of-range pages", () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    expect(paginate(items, 2, 25)).toMatchObject({
      items: [25, 26, 27, 28, 29],
      page: 2,
      pageCount: 2,
    });
    expect(paginate(items, 99, 25).page).toBe(2);
    expect(paginate([], 1, 25)).toMatchObject({ items: [], total: 0, pageCount: 1 });
  });
});

describe("queryTransactions", () => {
  it("parses URL params and returns a summarized page that excludes failed items from totals", () => {
    const query = transactionQuerySchema.parse({
      category: "revenue,professional",
      pageSize: "25",
    });
    const result = queryTransactions(DATA, query);
    expect(result.total).toBe(3);
    expect(result.summary).toEqual({ inCents: 7_668_000, outCents: 0 });
  });

  it("rejects invalid queries", () => {
    expect(transactionQuerySchema.safeParse({ category: "gambling" }).success).toBe(false);
    expect(transactionQuerySchema.safeParse({ from: "2026-11-02", to: "2026-11-01" }).success).toBe(
      false,
    );
    expect(transactionQuerySchema.safeParse({ min: "500", max: "100" }).success).toBe(false);
    expect(transactionQuerySchema.safeParse({ pageSize: "7" }).success).toBe(false);
  });

  it("sanitizes the search string", () => {
    const query = transactionQuerySchema.parse({ q: "  <script>aws\u0000  " });
    expect(query.q).toBe("scriptaws");
  });
});

describe("countActiveFilters", () => {
  it("counts filter groups, not values", () => {
    expect(
      countActiveFilters({
        category: ["revenue", "payroll"],
        from: "2026-01-01",
        to: "2026-02-01",
        q: "x",
      }),
    ).toBe(2);
    expect(countActiveFilters({ direction: "all" })).toBe(0);
  });
});
