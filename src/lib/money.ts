/**
 * Money utilities. Every amount in Ledgerly is an integer number of cents (USD).
 * Nothing in this module turns money into floating point values: parsing works on
 * the string digits, formatting splits whole dollars and cents with integer
 * arithmetic, and averaging rounds with an integer remainder.
 */

export type Cents = number;

/** Just under $10B, comfortably inside Number.MAX_SAFE_INTEGER. */
export const MAX_CENTS = 999_999_999_999;

export function isCents(value: unknown): value is Cents {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function assertCents(value: number): asserts value is Cents {
  if (!isCents(value)) throw new TypeError(`Expected integer cents, received ${value}`);
}

const MONEY_INPUT = /^\s*(-)?\s*\$?\s*(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d{0,2}))?\s*$/;

/**
 * Parses user input such as "1,250.5", "$12" or ".99" into cents.
 * Returns null for anything that is not a well-formed amount with at most two decimals.
 */
export function parseMoney(input: string): Cents | null {
  const match = MONEY_INPUT.exec(input);
  if (!match) return null;
  const [, minus, wholeRaw, fractionRaw] = match;
  if (wholeRaw === undefined && !fractionRaw) return null;
  const whole = Number((wholeRaw ?? "0").replaceAll(",", ""));
  const fraction = Number((fractionRaw ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return minus ? -cents : cents;
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const value of values) {
    assertCents(value);
    total += value;
  }
  return total;
}

/** Integer division with round-half-away-from-zero. Used for averages such as burn rate. */
export function divideCents(cents: Cents, divisor: number): Cents {
  assertCents(cents);
  if (!Number.isSafeInteger(divisor) || divisor === 0) {
    throw new RangeError("Divisor must be a non-zero integer");
  }
  const sign = Math.sign(cents) * Math.sign(divisor);
  const a = Math.abs(cents);
  const b = Math.abs(divisor);
  const remainder = a % b;
  const quotient = (a - remainder) / b;
  const rounded = remainder * 2 >= b ? quotient + 1 : quotient;
  return sign * rounded || 0;
}

/** Splits cents into whole dollars and the two-digit fraction, using integer math only. */
export function splitCents(cents: Cents): { negative: boolean; whole: number; fraction: string } {
  assertCents(cents);
  const abs = Math.abs(cents);
  const fraction = abs % 100;
  return {
    negative: cents < 0,
    whole: (abs - fraction) / 100,
    fraction: String(fraction).padStart(2, "0"),
  };
}

const groupFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Typographic minus sign, which lines up with "+" in tabular figures. */
export const MINUS = "−";

export type FormatMoneyOptions = {
  /** "auto" shows a minus for negatives; "always" also shows "+" for positives. */
  sign?: "auto" | "always" | "never";
  /** Drop the cents, e.g. for large hero numbers. Rounds half away from zero. */
  hideCents?: boolean;
  /** Compact notation ("$1.2M"), intended for chart axes. */
  compact?: boolean;
};

/** The single formatting entry point for money in the UI. */
export function formatMoney(cents: Cents, options: FormatMoneyOptions = {}): string {
  const { sign = "auto", hideCents = false, compact = false } = options;
  const rounded = hideCents || compact ? divideCents(cents, 100) * 100 : cents;
  const { negative, whole, fraction } = splitCents(rounded);

  const body = compact
    ? `$${compactFormatter.format(whole)}`
    : `$${groupFormatter.format(whole)}${hideCents ? "" : `.${fraction}`}`;

  if (sign === "never" || rounded === 0) return body;
  if (negative) return `${MINUS}${body}`;
  return sign === "always" ? `+${body}` : body;
}

/** Plain decimal string ("-1234.50") for machine-readable output such as CSV. */
export function centsToDecimalString(cents: Cents): string {
  const { negative, whole, fraction } = splitCents(cents);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Formats cents as an editable input value ("1250.50"), without grouping or symbol. */
export function centsToInputValue(cents: Cents): string {
  return centsToDecimalString(cents).replace(/\.00$/, "");
}

/**
 * Relative change between two amounts in basis points (1% = 100 bps), rounded.
 * Returns null when there is no meaningful baseline.
 */
export function changeInBps(current: Cents, previous: Cents): number | null {
  assertCents(current);
  assertCents(previous);
  if (previous === 0) return null;
  return divideCents((current - previous) * 10_000, Math.abs(previous));
}

/** Formats basis points as a percentage with one decimal ("+4.2%"). */
export function formatBps(bps: number, { sign = true }: { sign?: boolean } = {}): string {
  const tenths = divideCents(bps, 10);
  const abs = Math.abs(tenths);
  const decimal = abs % 10;
  const whole = (abs - decimal) / 10;
  const prefix = tenths < 0 ? MINUS : sign && tenths > 0 ? "+" : "";
  return `${prefix}${whole}.${decimal}%`;
}

/** Share of a total in basis points, for progress bars and chart labels (display only). */
export function shareInBps(part: Cents, total: Cents): number {
  if (total === 0) return 0;
  return divideCents(part * 10_000, total);
}
