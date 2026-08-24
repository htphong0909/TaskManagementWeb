import { StockSheetInput, RequiredPieceInput, CalculationConfig } from "@/types/woodCut";

export interface TestCase {
  id: number;
  stockSheets: StockSheetInput[];
  pieces: RequiredPieceInput[];
  config: CalculationConfig;
}

export interface GeneratorOptions {
  minPieces: number;
  maxPieces: number;
  rotationProb: number;
  kerfChoices: number[];
  stockChoices?: { length: number; width: number }[];
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  minPieces: 2,
  maxPieces: 5,
  rotationProb: 0.7,
  kerfChoices: [0, 3, 5],
  stockChoices: [
    { length: 1200, width: 600 },
    { length: 2440, width: 1220 },
    { length: 1000, width: 1000 },
    { length: 800, width: 400 },
  ],
};

// Deterministic PRNG (Mulberry32) for reproducible CP stress testing
export function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomTestCase(
  seed: number,
  customOptions?: Partial<GeneratorOptions>
): TestCase {
  const opts = { ...DEFAULT_OPTIONS, ...customOptions };
  const rand = createPRNG(seed);

  const randInt = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;
  const randChoice = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  const stockTemplate = randChoice(opts.stockChoices || DEFAULT_OPTIONS.stockChoices!);
  const stockSheets: StockSheetInput[] = [
    {
      id: "stock-1",
      name: `Ván ${stockTemplate.length}x${stockTemplate.width}`,
      length: stockTemplate.length,
      width: stockTemplate.width,
    },
  ];

  const kerf = randChoice(opts.kerfChoices);
  const numPieces = randInt(opts.minPieces, opts.maxPieces);
  const pieces: RequiredPieceInput[] = [];

  for (let i = 0; i < numPieces; i++) {
    const mode = rand();
    let length = 100;
    let width = 100;

    if (mode < 0.25) {
      // Dạng 1: Tấm dài mảnh (strip)
      length = randInt(Math.floor(stockTemplate.length * 0.4), Math.floor(stockTemplate.length * 0.9));
      width = randInt(50, Math.floor(stockTemplate.width * 0.25));
    } else if (mode < 0.5) {
      // Dạng 2: Ước số chẵn (exact divisor, ví dụ 1/2, 1/3, 1/4)
      const divL = randChoice([2, 3, 4]);
      const divW = randChoice([2, 3, 4]);
      length = Math.max(50, Math.floor(stockTemplate.length / divL) - kerf);
      width = Math.max(50, Math.floor(stockTemplate.width / divW) - kerf);
    } else if (mode < 0.75) {
      // Dạng 3: Tấm vuông hoặc gần vuông
      const size = randInt(80, Math.min(Math.floor(stockTemplate.length * 0.45), Math.floor(stockTemplate.width * 0.8)));
      length = size;
      width = Math.max(50, size + randInt(-20, 20));
    } else {
      // Dạng 4: Tấm kích thước ngẫu nhiên tự do
      length = randInt(60, Math.floor(stockTemplate.length * 0.7));
      width = randInt(50, Math.floor(stockTemplate.width * 0.7));
    }

    // Đảm bảo không vượt quá kích thước ván gốc theo cả 2 chiều
    const allowRotation = rand() < opts.rotationProb;
    if (!allowRotation) {
      length = Math.min(length, stockTemplate.length);
      width = Math.min(width, stockTemplate.width);
    } else {
      if (
        (length > stockTemplate.length || width > stockTemplate.width) &&
        (length > stockTemplate.width || width > stockTemplate.length)
      ) {
        length = Math.min(length, stockTemplate.length);
        width = Math.min(width, stockTemplate.width);
      }
    }

    pieces.push({
      id: `p-${i + 1}`,
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
