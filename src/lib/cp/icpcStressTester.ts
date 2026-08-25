import {
  StockSheetInput,
  RequiredPieceInput,
  CalculationConfig,
  PieceOrientation,
} from "@/types/woodCut";

export interface ICPCTestCase {
  id: string;
  subtask: number;
  name: string;
  stockSheets: StockSheetInput[];
  pieces: RequiredPieceInput[];
  config: CalculationConfig;
}

// Pseudo-random LCG Generator
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Sinh bộ test chuẩn thi đấu quốc tế ICPC với 5 Subtasks toàn diện
 */
export function generateICPCTestSuite(): ICPCTestCase[] {
  const cases: ICPCTestCase[] = [];
  const standardStock: StockSheetInput[] = [{ id: "std-1", name: "Ván Chuẩn 2440x1220", length: 2440, width: 1220 }];
  const multiStock: StockSheetInput[] = [
    { id: "s-large", name: "Khổ Lớn 3000x1500", length: 3000, width: 1500 },
    { id: "s-std", name: "Khổ Chuẩn 2440x1220", length: 2440, width: 1220 },
    { id: "s-small", name: "Khổ Nhỏ 1200x600", length: 1200, width: 600 },
  ];

  // =========================================================================
  // SUBTASK 1: Corner Cases & Biên Kích Thước Nhỏ (10 Cases)
  // =========================================================================
  cases.push({
    id: "TC-1.1",
    subtask: 1,
    name: "1x1mm micro square",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Micro 1x1", length: 1, width: 1, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.2",
    subtask: 1,
    name: "Exact stock size 2440x1220",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Exact Sheet", length: 2440, width: 1220, quantity: 2, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.3",
    subtask: 1,
    name: "1mm strip along width 1x1220",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Thin Strip W", length: 1, width: 1220, quantity: 5, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.4",
    subtask: 1,
    name: "1mm strip along length 2440x1",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Thin Strip L", length: 2440, width: 1, quantity: 5, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.5",
    subtask: 1,
    name: "Off-by-one length 2441x1220",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Off-by-1 L", length: 2441, width: 1220, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.6",
    subtask: 1,
    name: "Off-by-one width 2440x1221",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Off-by-1 W", length: 2440, width: 1221, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.7",
    subtask: 1,
    name: "Off-by-kerf (2440+3)x(1220+3)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Off-by-kerf", length: 2443, width: 1223, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.8",
    subtask: 1,
    name: "50 tiny squares 10x10mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Tiny 10x10", length: 10, width: 10, quantity: 50, allowRotation: true }],
    config: { kerf: 2, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.9",
    subtask: 1,
    name: "Zero kerf (kerf=0) exact quadrant cuts",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Quadrant", length: 1220, width: 610, quantity: 4, allowRotation: true }],
    config: { kerf: 0, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-1.10",
    subtask: 1,
    name: "Heavy kerf (kerf=20mm)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Block", length: 600, width: 400, quantity: 4, allowRotation: true }],
    config: { kerf: 20, minSubPieceSize: 50 },
  });

  // =========================================================================
  // SUBTASK 2: Tỷ Lệ Cạnh Cực Đoan / Needle & Extreme Aspect Ratio (10 Cases)
  // =========================================================================
  cases.push({
    id: "TC-2.1",
    subtask: 2,
    name: "Ultra-long needle 20000x50mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Long 20m", length: 20000, width: 50, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.2",
    subtask: 2,
    name: "Ultra-long needle 50000x100mm (50 meters)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Long 50m", length: 50000, width: 100, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.3",
    subtask: 2,
    name: "Ultra-tall needle 100x30000mm (30 meters)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Tall 30m", length: 100, width: 30000, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.4",
    subtask: 2,
    name: "Needle ratio 1:1000 (15x15000mm)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Ratio 1:1000", length: 15, width: 15000, quantity: 2, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.5",
    subtask: 2,
    name: "Vertical needle 10000x60mm with allowRotation=false",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Vertical Needle", length: 10000, width: 60, quantity: 1, orientation: "vertical", allowRotation: false }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.6",
    subtask: 2,
    name: "Horizontal needle 10000x60mm with orientation=horizontal",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Horizontal Needle", length: 10000, width: 60, quantity: 1, orientation: "horizontal", allowRotation: false }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.7",
    subtask: 2,
    name: "Multiple needle planks 40000x80mm (q=4)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Plank 40m", length: 40000, width: 80, quantity: 4, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.8",
    subtask: 2,
    name: "Varied needle planks [5000, 8000, 12000]x60mm",
    stockSheets: standardStock,
    pieces: [
      { id: "p1", name: "Plank 5m", length: 5000, width: 60, quantity: 2, allowRotation: true },
      { id: "p2", name: "Plank 8m", length: 8000, width: 60, quantity: 2, allowRotation: true },
      { id: "p3", name: "Plank 12m", length: 12000, width: 60, quantity: 1, allowRotation: true },
    ],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.9",
    subtask: 2,
    name: "Needle planks on Multi-Stock sheets",
    stockSheets: multiStock,
    pieces: [{ id: "p1", name: "MultiStock Needle", length: 25000, width: 120, quantity: 2, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-2.10",
    subtask: 2,
    name: "Needle border trims 4 sides of large room",
    stockSheets: standardStock,
    pieces: [
      { id: "p1", name: "North Trim", length: 18000, width: 70, quantity: 1, allowRotation: true },
      { id: "p2", name: "South Trim", length: 18000, width: 70, quantity: 1, allowRotation: true },
      { id: "p3", name: "East Trim", length: 12000, width: 70, quantity: 1, allowRotation: true },
      { id: "p4", name: "West Trim", length: 12000, width: 70, quantity: 1, allowRotation: true },
    ],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  // =========================================================================
  // SUBTASK 3: Tấm Đại Vượt Khổ & Số Nguyên Tố Lẻ (Massive Panels & Primes - 20 Cases)
  // =========================================================================
  // Ca test đặc biệt của người dùng!
  cases.push({
    id: "TC-3.1",
    subtask: 3,
    name: "User Benchmark Case: 4002x12210 (q=12) on 2440x1220",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Mặt Gỗ Lớn", length: 4002, width: 12210, quantity: 12, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-3.2",
    subtask: 3,
    name: "Big Prime Dimensions: 10007x5003mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Prime Panel 1", length: 10007, width: 5003, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-3.3",
    subtask: 3,
    name: "Big Prime Dimensions: 7919x13007mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Prime Panel 2", length: 7919, width: 13007, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-3.4",
    subtask: 3,
    name: "Square Hall Stage: 15000x15000mm (q=2)",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Hall Stage", length: 15000, width: 15000, quantity: 2, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-3.5",
    subtask: 3,
    name: "Giant Wall Partition: 8000x24000mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Giant Wall", length: 8000, width: 24000, quantity: 1, allowRotation: true }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  // Sinh thêm 15 ca tấm đại với kích thước lẻ khác nhau
  const primesL = [3141, 4787, 6197, 8887, 11113, 14249, 17579, 21011, 25013, 29989, 33331, 37003, 41011, 45007, 49999];
  const primesW = [2718, 3889, 5449, 7129, 9923, 12347, 15121, 18223, 21997, 24889, 28001, 31013, 35023, 39019, 42013];

  for (let i = 0; i < 15; i++) {
    cases.push({
      id: `TC-3.${6 + i}`,
      subtask: 3,
      name: `Massive Panel #${i + 1}: ${primesL[i]}x${primesW[i]}mm`,
      stockSheets: standardStock,
      pieces: [{ id: `p-${i}`, name: `Panel-${i + 1}`, length: primesL[i], width: primesW[i], quantity: (i % 3) + 1, allowRotation: true }],
      config: { kerf: 3, minSubPieceSize: 50 },
    });
  }

  // =========================================================================
  // SUBTASK 4: Khóa Vân Gỗ & Tổ Hợp Nhiều Khổ Ván Gốc (20 Cases)
  // =========================================================================
  cases.push({
    id: "TC-4.1",
    subtask: 4,
    name: "Vertical Grain Lock on 5000x8000mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Locked Vertical", length: 5000, width: 8000, quantity: 1, orientation: "vertical", allowRotation: false }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-4.2",
    subtask: 4,
    name: "Horizontal Grain Lock on 5000x8000mm",
    stockSheets: standardStock,
    pieces: [{ id: "p1", name: "Locked Horizontal", length: 5000, width: 8000, quantity: 1, orientation: "horizontal", allowRotation: false }],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  cases.push({
    id: "TC-4.3",
    subtask: 4,
    name: "Mixed Grain Orientations with Massive Panels",
    stockSheets: multiStock,
    pieces: [
      { id: "p1", name: "Vert Giant", length: 6000, width: 4000, quantity: 1, orientation: "vertical", allowRotation: false },
      { id: "p2", name: "Horiz Giant", length: 6000, width: 4000, quantity: 1, orientation: "horizontal", allowRotation: false },
      { id: "p3", name: "Free Giant", length: 6000, width: 4000, quantity: 1, orientation: "auto", allowRotation: true },
    ],
    config: { kerf: 3, minSubPieceSize: 50 },
  });

  for (let i = 0; i < 17; i++) {
    const orient: PieceOrientation = i % 3 === 0 ? "vertical" : i % 3 === 1 ? "horizontal" : "auto";
    cases.push({
      id: `TC-4.${4 + i}`,
      subtask: 4,
      name: `Multi-Stock Mixed #${i + 1} (${orient})`,
      stockSheets: multiStock,
      pieces: [
        { id: `p1-${i}`, name: `Main ${i}`, length: 4500 + i * 500, width: 3200 + i * 300, quantity: 1, orientation: orient, allowRotation: orient === "auto" },
        { id: `p2-${i}`, name: `Side ${i}`, length: 800, width: 400, quantity: 4, allowRotation: true },
      ],
      config: { kerf: (i % 5) * 2 + 1, minSubPieceSize: 50 },
    });
  }

  // =========================================================================
  // SUBTASK 5: ICPC Random Stress Fuzzer (200 Seeded Cases)
  // =========================================================================
  for (let i = 0; i < 200; i++) {
    const rng = new SeededRandom(10000 + i);
    const pieceCount = rng.nextInt(1, 4);
    const testPieces: RequiredPieceInput[] = [];

    for (let p = 0; p < pieceCount; p++) {
      const isOversized = rng.next() > 0.4;
      const length = isOversized ? rng.nextInt(3000, 35000) : rng.nextInt(50, 2400);
      const width = isOversized ? rng.nextInt(1500, 25000) : rng.nextInt(50, 1200);
      const quantity = rng.nextInt(1, 6);
      const orientRoll = rng.next();
      const orientation: PieceOrientation = orientRoll > 0.6 ? "auto" : orientRoll > 0.3 ? "vertical" : "horizontal";

      testPieces.push({
        id: `p-${i}-${p}`,
        name: `RndPiece-${p + 1}`,
        length,
        width,
        quantity,
        orientation,
        allowRotation: orientation === "auto",
      });
    }

    const useMulti = rng.next() > 0.5;
    const kerf = rng.nextInt(0, 8);

    cases.push({
      id: `TC-5.${i + 1}`,
      subtask: 5,
      name: `ICPC Fuzzer Case #${i + 1} (Seed ${10000 + i})`,
      stockSheets: useMulti ? multiStock : standardStock,
      pieces: testPieces,
      config: { kerf, minSubPieceSize: 50 },
    });
  }

  return cases;
}
