import { RequiredPieceInput, PieceOrientation } from "@/types/woodCut";

const VERTICAL_REGEX = /(?:^|\s+)(!doc|!d|!v|!r|norot|no-rot|lock|r=0|r:0|rot=0)(?:\s+|$)/i;
const HORIZONTAL_REGEX = /(?:^|\s+)(!ngang|!n|!h|!horiz|!horizontal)(?:\s+|$)/i;
const AUTO_REGEX = /(?:^|\s+)(!xoay|!auto|!rot|r=1|r:1|rot=1)(?:\s+|$)/i;

export function parseRequiredPiecesText(text: string): { pieces: RequiredPieceInput[]; errors: string[] } {
  const lines = text.split("\n");
  const pieces: RequiredPieceInput[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    let orientation: PieceOrientation = "auto";

    if (VERTICAL_REGEX.test(trimmed)) {
      orientation = "vertical";
      trimmed = trimmed.replace(VERTICAL_REGEX, " ").trim();
    } else if (HORIZONTAL_REGEX.test(trimmed)) {
      orientation = "horizontal";
      trimmed = trimmed.replace(HORIZONTAL_REGEX, " ").trim();
    } else if (AUTO_REGEX.test(trimmed)) {
      orientation = "auto";
      trimmed = trimmed.replace(AUTO_REGEX, " ").trim();
    }

    const allowRotation = orientation === "auto";

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
      orientation,
      allowRotation,
    });
  });

  return { pieces, errors };
}

export function formatPiecesToText(pieces: RequiredPieceInput[]): string {
  return pieces
    .map((p) => {
      let tag = "";
      const orient = p.orientation || (p.allowRotation === false ? "vertical" : "auto");
      if (orient === "vertical") tag = " !doc";
      else if (orient === "horizontal") tag = " !ngang";

      return `${p.length}, ${p.width}${p.quantity > 1 ? `, ${p.quantity}` : ""}${tag}`;
    })
    .join("\n");
}

