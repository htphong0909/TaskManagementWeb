export type WoodGrain = "none" | "horizontal" | "vertical";
export type PieceOrientation = "auto" | "vertical" | "horizontal";

export interface StockSheetInput {
  id: string;
  name?: string;
  length: number; // mm
  width: number;  // mm
  quantity?: number; // số lượng có sẵn (undefined/null = vô hạn)
  cost?: number;
}

export interface RequiredPieceInput {
  id: string;
  name: string;
  length: number; // mm
  width: number;  // mm
  quantity: number;
  grain?: WoodGrain;              // "none" (Tự do xoay) | "horizontal" (Vân ngang) | "vertical" (Vân dọc)
  orientation?: PieceOrientation; // "auto" (Tự do xoay) | "vertical" (Để dọc) | "horizontal" (Để ngang)
  allowRotation?: boolean;        // true = cho phép xoay 90 độ, false = giữ hướng vân gỗ
}

export interface CalculationConfig {
  kerf: number;            // Độ dày mạch cưa (mm), mặc định 3mm
  minSubPieceSize: number; // Kích thước tối thiểu của tấm ghép (mm), mặc định 50mm
  stockGrain?: WoodGrain;  // Hướng vân ván phôi gốc: "none" | "horizontal" | "vertical" (Mặc định: "horizontal")
  useExactDP?: boolean;    // true = sử dụng thuật toán Quy hoạch động chính xác tuyệt đối
}

export interface SubPiece {
  id: string;
  parentId: string;
  parentName: string;
  relX: number; // Toạ độ X trên tấm lớn
  relY: number; // Toạ độ Y trên tấm lớn
  length: number;
  width: number;
  allowRotation: boolean;
  orientation?: PieceOrientation;
  grain?: WoodGrain;
  appliedGrain?: WoodGrain;
  stockSheetIndex?: number; // Số thứ tự tấm ván gốc cắt ra mẩu này (1, 2...)
  stockSheetName?: string;  // Tên ván gốc (Ván 1, Ván 2...)
  rotatedOnSheet?: boolean; // true nếu mẩu này khi cắt trên ván gốc bị xoay 90 độ
}

export interface PlacedPiece {
  id: string;
  name: string;
  isSubPiece: boolean;
  parentId?: string;
  parentName?: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated: boolean;
  color: string;
  appliedGrain?: WoodGrain;
}

export interface FreeRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedStockSheet {
  sheetIndex: number;
  stockType: StockSheetInput;
  length: number;
  width: number;
  placedPieces: PlacedPiece[];
  usedArea: number;
  wasteArea: number;
  efficiency: number; // %
  cutsCount: number;
}

export interface JoinedPieceDiagram {
  parentId: string;
  parentName: string;
  targetLength: number;
  targetWidth: number;
  subPieces: SubPiece[];
  seamCount: number;
}

export interface CalculationResult {
  stockSheetsUsed: PlacedStockSheet[];
  joinedPieces: JoinedPieceDiagram[];
  summary: {
    totalStockSheets: number;
    sheetBreakdown: { [key: string]: number }; // ví dụ: {"1200x600": 3, "2440x1220": 1}
    totalRequiredArea: number; // m2
    totalStockArea: number;    // m2
    totalUsedArea: number;     // m2
    totalWasteArea: number;    // m2
    efficiencyPercent: number; // %
    totalCutsCount: number;
    totalSeamsCount: number;
  };
}
