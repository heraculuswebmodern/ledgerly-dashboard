import { describe, expect, it } from "vitest";

import {
  MINUS,
  centsToDecimalString,
  changeInBps,
  divideCents,
  formatBps,
  formatMoney,
  parseMoney,
  shareInBps,
  splitCents,
  sumCents,
} from "./money";

describe("parseMoney", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["12.5", 1250],
    ["12.05", 1205],
    [".99", 99],
    ["$1,250.75", 125075],
    ["  1250  ", 125000],
    ["-40.10", -4010],
    ["1,000,000", 100000000],
  ])("parses %s as %i cents", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1,25", "12,34.00", "1e5", "$", ".", "--5", "1 000"])(
    "rejects %j",
    (input) => {
      expect(parseMoney(input)).toBeNull();
    },
  );

  it("never produces floating point artifacts", () => {
    // 0.1 + 0.2 style inputs stay exact.
    expect(parseMoney("0.10")! + parseMoney("0.20")!).toBe(30);
    expect(parseMoney("19.99")).toBe(1999);
    expect(parseMoney("1.15")).toBe(115);
  });

  it("rejects amounts above the maximum", () => {
    expect(parseMoney("99999999999999")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats with grouping and two decimals", () => {
    expect(formatMoney(123456789)).toBe("$1,234,567.89");
    expect(formatMoney(5)).toBe("$0.05");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("uses a typographic minus for negatives", () => {
    expect(formatMoney(-1999)).toBe(`${MINUS}$19.99`);
  });

  it("supports explicit signs", () => {
    expect(formatMoney(1999, { sign: "always" })).toBe("+$19.99");
    expect(formatMoney(-1999, { sign: "never" })).toBe("$19.99");
    expect(formatMoney(0, { sign: "always" })).toBe("$0.00");
  });

  it("rounds half away from zero when hiding cents", () => {
    expect(formatMoney(150, { hideCents: true })).toBe("$2");
    expect(formatMoney(149, { hideCents: true })).toBe("$1");
    expect(formatMoney(-150, { hideCents: true })).toBe(`${MINUS}$2`);
  });

  it("supports compact notation for chart axes", () => {
    expect(formatMoney(125_000_000, { compact: true })).toBe("$1.3M");
    expect(formatMoney(4_500_000, { compact: true })).toBe("$45K");
  });

  it("throws on non-integer input", () => {
    expect(() => formatMoney(10.5)).toThrow(TypeError);
  });
});

describe("integer helpers", () => {
  it("splits cents without floats", () => {
    expect(splitCents(-120005)).toEqual({ negative: true, whole: 1200, fraction: "05" });
  });

  it("sums and rejects non-integers", () => {
    expect(sumCents([100, 250, -50])).toBe(300);
    expect(() => sumCents([1, 0.5])).toThrow();
  });

  it("divides with round-half-away-from-zero", () => {
    expect(divideCents(1000, 3)).toBe(333);
    expect(divideCents(1001, 2)).toBe(501);
    expect(divideCents(-1001, 2)).toBe(-501);
    expect(divideCents(0, 7)).toBe(0);
    expect(() => divideCents(10, 0)).toThrow(RangeError);
  });

  it("renders decimal strings for CSV", () => {
    expect(centsToDecimalString(-123450)).toBe("-1234.50");
    expect(centsToDecimalString(7)).toBe("0.07");
  });

  it("computes changes and shares in basis points", () => {
    expect(changeInBps(11000, 10000)).toBe(1000);
    expect(changeInBps(9000, 10000)).toBe(-1000);
    expect(changeInBps(100, 0)).toBeNull();
    expect(shareInBps(25, 100)).toBe(2500);
    expect(shareInBps(1, 0)).toBe(0);
  });

  it("formats basis points as percentages", () => {
    expect(formatBps(1234)).toBe("+12.3%");
    expect(formatBps(-386)).toBe(`${MINUS}3.9%`);
    expect(formatBps(0)).toBe("0.0%");
    expect(formatBps(425, { sign: false })).toBe("4.3%");
  });
});
