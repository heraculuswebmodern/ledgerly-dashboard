import { describe, expect, it } from "vitest";

import { isValidRoutingNumber } from "@/lib/contracts";

import { generateSeed } from "./seed";

describe("generateSeed", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("is deterministic for the same date", () => {
    expect(generateSeed({ now })).toEqual(generateSeed({ now }));
  });

  it("produces a realistic, well-formed dataset", () => {
    const db = generateSeed({ now });
    expect(db.transactions.length).toBeGreaterThanOrEqual(300);
    expect(new Set(db.transactions.map((t) => t.id)).size).toBe(db.transactions.length);
    expect(
      db.transactions.every((t) => Number.isSafeInteger(t.amountCents) && t.amountCents !== 0),
    ).toBe(true);
    expect(new Set(db.transactions.map((t) => t.method))).toEqual(
      new Set(["card", "ach", "wire", "transfer"]),
    );
    expect(new Set(db.transactions.map((t) => t.status))).toEqual(
      new Set(["posted", "pending", "failed"]),
    );
    expect(db.accounts.map((a) => a.kind)).toEqual(["checking", "savings", "treasury"]);
    expect(db.recipients.every((r) => isValidRoutingNumber(r.routingNumber))).toBe(true);
  });

  it("keeps internal transfers balanced", () => {
    const db = generateSeed({ now });
    const groups = new Map<string, number>();
    for (const t of db.transactions) {
      if (t.transferGroupId)
        groups.set(t.transferGroupId, (groups.get(t.transferGroupId) ?? 0) + t.amountCents);
    }
    expect(groups.size).toBeGreaterThan(0);
    expect([...groups.values()].every((sum) => sum === 0)).toBe(true);
  });

  it("generates Luhn-valid card numbers", () => {
    const luhn = (pan: string) =>
      pan
        .split("")
        .reverse()
        .map(Number)
        .reduce((sum, d, i) => sum + (i % 2 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0) %
        10 ===
      0;
    expect(generateSeed({ now }).cards.every((c) => luhn(c.pan))).toBe(true);
  });
});
