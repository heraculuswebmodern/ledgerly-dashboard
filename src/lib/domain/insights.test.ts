import { describe, expect, it } from "vitest";

import {
  buildCashFlow,
  burnRate,
  flows,
  monthlyFlows,
  runwayMonths,
  spendByCategory,
} from "./insights";
import type { QueryableTransaction } from "./transactions-query";

let n = 0;
const tx = (
  date: string,
  amountCents: number,
  extra: Partial<QueryableTransaction> = {},
): QueryableTransaction => ({
  id: `txn_${String(++n).padStart(8, "0")}`,
  accountId: "acct_checking",
  date: `${date}T12:00:00.000Z`,
  counterparty: "X",
  description: "",
  category: amountCents > 0 ? "revenue" : "software",
  amountCents,
  status: "posted",
  method: "ach",
  note: "",
  ...extra,
});

describe("flows", () => {
  it("excludes failed items and internal transfers", () => {
    const result = flows([
      tx("2026-11-01", 10_000),
      tx("2026-11-01", -4_000),
      tx("2026-11-01", -9_999, { status: "failed" }),
      tx("2026-11-01", -50_000, { category: "transfer" }),
    ]);
    expect(result).toEqual({ inCents: 10_000, outCents: 4_000, netCents: 6_000 });
  });
});

describe("buildCashFlow", () => {
  const data = [tx("2026-11-05", 500), tx("2026-11-04", -200), tx("2026-10-01", 1_000)];

  it("produces daily buckets for 7D", () => {
    const series = buildCashFlow(data, "7d", "2026-11-05");
    expect(series.bucket).toBe("day");
    expect(series.points).toHaveLength(7);
    expect(series.points.at(-1)).toMatchObject({ start: "2026-11-05", inCents: 500, outCents: 0 });
    expect(series.totals).toEqual({ inCents: 500, outCents: 200, netCents: 300 });
  });

  it("produces weekly buckets for 90D and monthly for 1Y", () => {
    expect(buildCashFlow(data, "90d", "2026-11-05").points).toHaveLength(13);
    const year = buildCashFlow(data, "1y", "2026-11-05");
    expect(year.points).toHaveLength(12);
    expect(year.points.at(-1)?.start).toBe("2026-11-01");
    expect(year.points.find((p) => p.start === "2026-10-01")?.inCents).toBe(1_000);
  });
});

describe("spendByCategory", () => {
  it("ranks outflows and reports shares in basis points", () => {
    const result = spendByCategory([
      tx("2026-11-01", -7_500, { category: "payroll" }),
      tx("2026-11-01", -2_500, { category: "travel" }),
      tx("2026-11-01", 9_000),
    ]);
    expect(result).toEqual([
      { category: "payroll", amountCents: 7_500, count: 1, shareBps: 7_500 },
      { category: "travel", amountCents: 2_500, count: 1, shareBps: 2_500 },
    ]);
  });
});

describe("burn and runway", () => {
  const history = [
    tx("2026-08-10", -300_000),
    tx("2026-09-10", -300_000),
    tx("2026-10-10", -300_000),
    tx("2026-10-11", 150_000),
    tx("2026-11-02", -999_999), // current month is excluded
  ];

  it("averages net outflow over the last three complete months", () => {
    expect(burnRate(history, "2026-11-05", 3)).toBe(250_000);
  });

  it("returns zero burn when cash-flow positive", () => {
    expect(burnRate([tx("2026-10-10", 100)], "2026-11-05", 3)).toBe(0);
  });

  it("computes whole months of runway", () => {
    expect(runwayMonths(1_000_000, 250_000)).toBe(4);
    expect(runwayMonths(999_999, 250_000)).toBe(3);
    expect(runwayMonths(1_000_000, 0)).toBeNull();
  });

  it("summarizes monthly flows oldest first", () => {
    const months = monthlyFlows(history, "2026-11-05", 3);
    expect(months.map((m) => m.month)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(months[1]).toMatchObject({ inCents: 150_000, outCents: 300_000 });
  });
});
