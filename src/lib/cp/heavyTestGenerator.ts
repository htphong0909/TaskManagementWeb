import { StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";
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
  minPieces: 9,
  maxPieces: 11,
  rotationProb: 0.5,
  kerfChoices: [0, 2, 3, 5],
  stockMinLength: 800,
  stockMaxLength: 2440,
  stockMinWidth: 400,
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

  // Sinh kích thước ván gốc hoàn toàn ngẫu nhiên
  const stockLength = randInt(opts.stockMinLength, opts.stockMaxLength);
  const stockWidth = randInt(opts.stockMinWidth, opts.stockMaxWidth);

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
  const pieces: RequiredPieceInput[] = [];

  for (let i = 0; i < numPieces; i++) {
    const shapeType = rand();
    let length = 100;
    let width = 100;

    if (shapeType < 0.25) {
      // 1. Tấm dài mảnh (strip)
      length = randInt(Math.floor(stockLength * 0.3), Math.floor(stockLength * 0.85));
      width = randInt(50, Math.floor(stockWidth * 0.25));
    } else if (shapeType < 0.5) {
      // 2. Ước số ngẫu nhiên
      const divL = randChoice([2, 3, 4]);
      const divW = randChoice([2, 3, 4]);
      length = Math.max(50, Math.floor(stockLength / divL) - kerf);
      width = Math.max(50, Math.floor(stockWidth / divW) - kerf);
    } else if (shapeType < 0.75) {
      // 3. Tấm gần vuông
      const size = randInt(80, Math.floor(Math.min(stockLength, stockWidth) * 0.6));
      length = size;
      width = Math.max(50, size + randInt(-30, 30));
    } else {
      // 4. Kích thước tự do ngẫu nhiên
      length = randInt(60, Math.floor(stockLength * 0.65));
      width = randInt(50, Math.floor(stockWidth * 0.65));
    }

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
