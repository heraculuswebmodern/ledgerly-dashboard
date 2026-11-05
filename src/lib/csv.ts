/**
 * RFC 4180 CSV with spreadsheet formula-injection protection: cells that start with
 * =, +, -, @, tab or carriage return are prefixed with a single quote, except plain
 * numbers such as "-1250.00" which must stay numeric.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function escapeCsvCell(value: string | number): string {
  let cell = String(value);
  if (FORMULA_START.test(cell) && !PLAIN_NUMBER.test(cell)) cell = `'${cell}`;
  if (/[",\n\r]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): string {
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}
