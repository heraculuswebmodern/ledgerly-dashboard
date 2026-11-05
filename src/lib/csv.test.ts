import { describe, expect, it } from "vitest";

import { escapeCsvCell, toCsv } from "./csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell('Acme, "Inc"')).toBe('"Acme, ""Inc"""');
    expect(escapeCsvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("neutralizes spreadsheet formulas but keeps negative numbers numeric", () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("-1250.00")).toBe("-1250.00");
    expect(escapeCsvCell("-cmd")).toBe("'-cmd");
  });

  it("builds CRLF-delimited documents", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("a,b\r\n1,x\r\n");
  });
});
