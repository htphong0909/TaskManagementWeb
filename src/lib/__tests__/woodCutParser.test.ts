import { describe, it, expect } from "vitest";
import { parseRequiredPiecesText, formatPiecesToText } from "../woodCutParser";

describe("woodCutParser", () => {
  it("parses comma-separated dimensions accurately", () => {
    const input = "1110, 1230\n234, 234";
    const result = parseRequiredPiecesText(input);
    expect(result.errors).toHaveLength(0);
    expect(result.pieces).toHaveLength(2);
    expect(result.pieces[0]).toMatchObject({ length: 1110, width: 1230, quantity: 1, orientation: "auto", allowRotation: true });
    expect(result.pieces[1]).toMatchObject({ length: 234, width: 234, quantity: 1, orientation: "auto", allowRotation: true });
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
      { id: "p1", name: "T1", length: 1110, width: 1230, quantity: 2, orientation: "auto" as const, allowRotation: true },
      { id: "p2", name: "T2", length: 234, width: 234, quantity: 1, orientation: "auto" as const, allowRotation: true },
    ];
    const text = formatPiecesToText(pieces);
    expect(text).toContain("1110, 1230, 2");
    expect(text).toContain("234, 234");
  });

  it("parses vertical orientation tags (!doc, !d, !v, !r, norot, lock)", () => {
    const input = `
1110, 1230 !doc
234, 234 x2 !d
500x600 !v
800x400 !r
400x400 norot
300x300 lock
    `.trim();

    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(6);
    pieces.forEach((p) => {
      expect(p.orientation).toBe("vertical");
      expect(p.allowRotation).toBe(false);
    });
  });

  it("parses horizontal orientation tags (!ngang, !n, !h, !horiz)", () => {
    const input = `
1110, 1230 !ngang
234, 234 x2 !n
500x600 !h
800x400 !horiz
    `.trim();

    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(4);
    pieces.forEach((p) => {
      expect(p.orientation).toBe("horizontal");
      expect(p.allowRotation).toBe(false);
    });
  });

  it("parses auto / rotate tags (!xoay, !auto)", () => {
    const input = `
1110, 1230 !xoay
234, 234 x2 !auto
    `.trim();

    const { pieces, errors } = parseRequiredPiecesText(input);
    expect(errors).toHaveLength(0);
    expect(pieces).toHaveLength(2);
    pieces.forEach((p) => {
      expect(p.orientation).toBe("auto");
      expect(p.allowRotation).toBe(true);
    });
  });

  it("formats pieces with orientation tags (!doc, !ngang)", () => {
    const pieces = [
      { id: "p1", name: "T1", length: 1110, width: 1230, quantity: 2, orientation: "vertical" as const, allowRotation: false },
      { id: "p2", name: "T2", length: 500, width: 600, quantity: 1, orientation: "horizontal" as const, allowRotation: false },
      { id: "p3", name: "T3", length: 234, width: 234, quantity: 1, orientation: "auto" as const, allowRotation: true },
    ];
    const text = formatPiecesToText(pieces);
    expect(text).toBe("1110, 1230, 2 !doc\n500, 600 !ngang\n234, 234");
  });
});
