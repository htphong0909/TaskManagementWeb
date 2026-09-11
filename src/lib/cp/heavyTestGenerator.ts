import { StockSheetInput, RequiredPieceInput } from "@/types/woodCut";
import { createPRNG, TestCase } from "./testGenerator";

export interface HeavyGeneratorOptions {
  minPieces: number;
  maxPieces: number;
  rotationProb: number;
  kerfChoices: number[];
  stockMinLength: number;
  stockMaxLength: number;
  stockMinWidth: number;
  stockMaxWidth: number;
}

const DEFAULT_HEAVY_OPTIONS: HeavyGeneratorOptions = {
  minPieces: 1,
  maxPieces: 8,
  rotationProb: 0.5,
  kerfChoices: [0, 2, 3, 5],
  stockMinLength: 900,
  stockMaxLength: 2440,
  stockMinWidth: 500,
  stockMaxWidth: 1220,
};

export function generateHeavyTestCase(
  seed: number,
  customOptions?: Partial<HeavyGeneratorOptions>
): TestCase {
  const opts = { ...DEFAULT_HEAVY_OPTIONS, ...customOptions };
  const rand = createPRNG(seed);

  const randInt = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;
  const randChoice = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  // Kích thước ván gốc hoàn toàn ngẫu nhiên
  const stockLength = randInt(opts.stockMinLength, opts.stockMaxLength);
  const stockWidth = randInt(opts.stockMinWidth, opts.stockMaxWidth);
  const stockArea = stockLength * stockWidth;

  const stockSheets: StockSheetInput[] = [
    {
      id: "stock-heavy",
      name: `Ván ${stockLength}x${stockWidth}`,
      length: stockLength,
      width: stockWidth,
    },
  ];

  const kerf = randChoice(opts.kerfChoices);
  const numPieces = randInt(opts.minPieces, opts.maxPieces);

  // Chọn số tấm ván mục tiêu: 1, 2 hoặc 3 tấm
  const targetSheets = randChoice([1, 2, 2, 3]);
  const targetTotalArea = stockArea * targetSheets * (0.6 + rand() * 0.25);
  const avgPieceArea = targetTotalArea / numPieces;

  const pieces: RequiredPieceInput[] = [];

  for (let i = 0; i < numPieces; i++) {
    const shapeType = rand();
    let length = 100;
    let width = 100;

    // Phân bổ diện tích ngẫu nhiên quanh avgPieceArea (0.4x đến 1.8x)
    const factor = 0.4 + rand() * 1.4;
    const pieceArea = avgPieceArea * factor;

    if (shapeType < 0.3) {
      // 1. Dải dài mảnh (Skinny strip)
      const aspect = 3.0 + rand() * 3.5;
      length = Math.round(Math.sqrt(pieceArea * aspect));
      width = Math.round(pieceArea / length);
    } else if (shapeType < 0.6) {
      // 2. Tấm vuông / gần vuông (Square block)
      const aspect = 1.0 + rand() * 0.4;
      length = Math.round(Math.sqrt(pieceArea * aspect));
      width = Math.round(pieceArea / length);
    } else if (shapeType < 0.8) {
      // 3. Ước số cắt vừa vặn (Exact divisor cut)
      const divL = randChoice([2, 3, 4]);
      const divW = randChoice([2, 3, 4]);
      length = Math.max(50, Math.floor(stockLength / divL) - kerf);
      width = Math.max(50, Math.floor(stockWidth / divW) - kerf);
    } else {
      // 4. Hình chữ nhật tự do (Freeform rectangle)
      const aspect = 1.4 + rand() * 1.2;
      length = Math.round(Math.sqrt(pieceArea * aspect));
      width = Math.round(pieceArea / length);
    }

    // Đảm bảo kích thước tối thiểu và không vượt quá ván gốc
    length = Math.max(50, length);
    width = Math.max(50, width);

    const allowRotation = rand() < opts.rotationProb;
    if (!allowRotation) {
      length = Math.min(length, stockLength);
      width = Math.min(width, stockWidth);
    } else {
      if (
        (length > stockLength || width > stockWidth) &&
        (length > stockWidth || width > stockLength)
      ) {
        length = Math.min(length, stockLength);
        width = Math.min(width, stockWidth);
      }
    }

    pieces.push({
      id: `hp-${i + 1}`,
      name: `Chi tiết ${i + 1}`,
      length: Math.max(50, length),
      width: Math.max(50, width),
      quantity: 1,
      allowRotation,
    });
  }

  return {
    id: seed,
    stockSheets,
    pieces,
    config: {
      kerf,
      minSubPieceSize: 50,
    },
  };
}

