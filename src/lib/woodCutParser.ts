import { RequiredPieceInput } from "@/types/woodCut";

export function parseRequiredPiecesText(text: string): { pieces: RequiredPieceInput[]; errors: string[] } {
  const lines = text.split("\n");
  const pieces: RequiredPieceInput[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    // Pattern 1: 1110, 1230 or 1110, 1230, 2
    // Pattern 2: 1110x1230 x2 or 1110*1230, 2 or 1110 1230 2
    const sanitized = trimmed.replace(/[xX*]/g, " ").replace(/[,;]/g, " ");
    const parts = sanitized.split(/\s+/).filter(Boolean);

    if (parts.length < 2) {
      errors.push(`Dòng ${index + 1}: Không đúng định dạng kích thước "${line}"`);
      return;
    }

    const length = parseFloat(parts[0]);
    const width = parseFloat(parts[1]);
    let quantity = 1;

    if (parts.length >= 3) {
      const qStr = parts[2].replace(/[xX#]/g, "");
      const parsedQ = parseInt(qStr, 10);
      if (!isNaN(parsedQ) && parsedQ > 0) {
        quantity = parsedQ;
      }
    }

    if (isNaN(length) || isNaN(width) || length <= 0 || width <= 0) {
      errors.push(`Dòng ${index + 1}: Kích thước phải là số dương lớn hơn 0`);
      return;
    }

    pieces.push({
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: `Tấm ${pieces.length + 1}`,
      length: Math.round(length),
      width: Math.round(width),
      quantity,
      allowRotation: true,
    });
  });

  return { pieces, errors };
}

export function formatPiecesToText(pieces: RequiredPieceInput[]): string {
  return pieces
    .map((p) => `${p.length}, ${p.width}${p.quantity > 1 ? `, ${p.quantity}` : ""}`)
    .join("\n");
}
