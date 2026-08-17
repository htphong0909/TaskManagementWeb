import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText, formatPiecesToText } from "../woodCutParser";

describe("woodCutParser", () => {
  it("parses comma-separated dimensions accurately", () => {
    const input = "1110, 1230\n234, 234";
    const result = parseRequiredPiecesText(input);
    expect(result.errors).toHaveLength(0);
    expect(result.pieces).toHaveLength(2);
    expect(result.pieces[0]).toMatchObject({ length: 1110, width: 1230, quantity: 1, allowRotation: true });
    expect(result.pieces[1]).toMatchObject({ length: 234, width: 234, quantity: 1, allowRotation: true });
  });

  it("parses x notation with quantity", () => {
    const input = "1110x1230 x2\n500*600, 3";
    const result = parseRequiredPiecesText(input);
    expect(result.errors).toHaveLength(0);
    expect(result.pieces[0]).toMatchObject({ length: 1110, width: 1230, quantity: 2 });
    expect(result.pieces[1]).toMatchObject({ length: 500, width: 600, quantity: 3 });
  });

  it("handles empty lines and whitespace gracefully", () => {
    const input = "\n  1110, 1230  \n\n  234,   234 \n";
    const result = parseRequiredPiecesText(input);
    expect(result.pieces).toHaveLength(2);
  });

  it("formats pieces back to text", () => {
    const pieces = [
      { id: "p1", name: "T1", length: 1110, width: 1230, quantity: 2, allowRotation: true },
      { id: "p2", name: "T2", length: 234, width: 234, quantity: 1, allowRotation: true },
    ];
    const text = formatPiecesToText(pieces);
    expect(text).toContain("1110, 1230, 2");
    expect(text).toContain("234, 234");
  });
});
