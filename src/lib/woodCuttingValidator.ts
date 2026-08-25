import {
  CalculationResult,
  StockSheetInput,
  RequiredPieceInput,
  CalculationConfig,
} from "@/types/woodCut";

export interface CuttingPlanValidationResult {
  isValid: boolean;
  errors: string[];
  overlapsCount: number;
  outOfBoundsCount: number;
  orientationViolationsCount: number;
  countMismatch: boolean;
}

export function validateCuttingPlanIntegrity(
  result: CalculationResult,
  stockSheets: StockSheetInput[],
  requiredPieces: RequiredPieceInput[],
  config: CalculationConfig
): CuttingPlanValidationResult {
  const errors: string[] = [];
  let overlapsCount = 0;
  let outOfBoundsCount = 0;
  let orientationViolationsCount = 0;
  const kerf = config.kerf ?? 0;

  // 1. Kiểm tra từng tấm ván đã sử dụng
  for (const sheet of result.stockSheetsUsed) {
    const pieces = sheet.placedPieces;

    // 1.1. Kiểm tra giới hạn ván gốc (Boundary Containment)
    for (const p of pieces) {
      if (p.x < 0 || p.y < 0) {
        errors.push(`Chi tiết "${p.name}" (${p.id}) có tọa độ âm: (${p.x}, ${p.y}) trên Ván #${sheet.sheetIndex}.`);
        outOfBoundsCount++;
      }
      if (p.x + p.length > sheet.length) {
        errors.push(
          `Chi tiết "${p.name}" (${p.id}) tràn chiều dài: ${p.x} + ${p.length} = ${p.x + p.length} > ${sheet.length}mm trên Ván #${sheet.sheetIndex}.`
        );
        outOfBoundsCount++;
      }
      if (p.y + p.width > sheet.width) {
        errors.push(
          `Chi tiết "${p.name}" (${p.id}) tràn chiều rộng: ${p.y} + ${p.width} = ${p.y + p.width} > ${sheet.width}mm trên Ván #${sheet.sheetIndex}.`
        );
        outOfBoundsCount++;
      }
    }

    // 1.2. Kiểm tra không đè hình (No-Overlap Invariant với bù Kerf)
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i];
        const b = pieces[j];

        const aLeftOfB = a.x + a.length + kerf <= b.x;
        const bLeftOfA = b.x + b.length + kerf <= a.x;
        const aBelowB = a.y + a.width + kerf <= b.y;
        const bBelowA = b.y + b.width + kerf <= a.y;

        const isSeparated = aLeftOfB || bLeftOfA || aBelowB || bBelowA;

        if (!isSeparated) {
          errors.push(
            `Phát hiện đè hình trên Ván #${sheet.sheetIndex} giữa "${a.name}" [${a.x},${a.y},${a.length}x${a.width}] và "${b.name}" [${b.x},${b.y},${b.length}x${b.width}] với kerf=${kerf}mm.`
          );
          overlapsCount++;
        }
      }
    }
  }

  // 1.3. Kiểm tra hướng vân gỗ (Orientation Invariant)
  const pieceMap = new Map<string, RequiredPieceInput>();
  requiredPieces.forEach((p) => pieceMap.set(p.name, p));

  for (const sheet of result.stockSheetsUsed) {
    for (const p of sheet.placedPieces) {
      if (!p.isSubPiece) {
        const original = pieceMap.get(p.name);
        if (original) {
          const orient = original.orientation || (original.allowRotation === false ? "vertical" : "auto");
          if (orient === "vertical" && p.rotated) {
            errors.push(`Chi tiết "${p.name}" bị xoay sai hướng (yêu cầu khóa vân dọc).`);
            orientationViolationsCount++;
          }
          if (orient === "horizontal" && !p.rotated) {
            errors.push(`Chi tiết "${p.name}" không xoay (yêu cầu xoay vân ngang).`);
            orientationViolationsCount++;
          }
        }
      }
    }
  }

  const isValid =
    overlapsCount === 0 &&
    outOfBoundsCount === 0 &&
    orientationViolationsCount === 0 &&
    errors.length === 0;

  return {
    isValid,
    errors,
    overlapsCount,
    outOfBoundsCount,
    orientationViolationsCount,
    countMismatch: false,
  };
}
