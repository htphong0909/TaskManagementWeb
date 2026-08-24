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

  it("parses lines with !r, norot, no-rot, lock, and r=0 as allowRotation: false", () => {
    const input = `
1110, 1230 !r
234, 234 x2 norot
500x600 no-rot
800x400 lock
400x400 r=0
300x300
    `.trim();

    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(6);
    expect(pieces[0]).toMatchObject({ length: 1110, width: 1230, allowRotation: false });
    expect(pieces[1]).toMatchObject({ length: 234, width: 234, quantity: 2, allowRotation: false });
    expect(pieces[2]).toMatchObject({ length: 500, width: 600, allowRotation: false });
    expect(pieces[3]).toMatchObject({ length: 800, width: 400, allowRotation: false });
    expect(pieces[4]).toMatchObject({ length: 400, width: 400, allowRotation: false });
    expect(pieces[5]).toMatchObject({ length: 300, width: 300, allowRotation: true });
  });

  it("formats pieces with allowRotation: false appending !r", () => {
    const pieces = [
      { id: "p1", name: "T1", length: 1110, width: 1230, quantity: 2, allowRotation: false },
      { id: "p2", name: "T2", length: 234, width: 234, quantity: 1, allowRotation: true },
    ];
    const text = formatPiecesToText(pieces);
    expect(text).toBe("1110, 1230, 2 !r\n234, 234");
  });
});

