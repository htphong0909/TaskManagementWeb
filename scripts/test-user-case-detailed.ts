import { parseRequiredPiecesText } from "../src/lib/woodCutParser";
import { calculateWoodCut } from "../src/lib/woodCuttingOptimizer";
import { solveGroundTruthDP } from "../src/lib/cp/dpGroundTruthOptimizer";
import { StockSheetInput } from "../src/types/woodCut";

const rawInput = `1600, 2700
410, 2700
1250, 800
60, 1700
400, 1830, 2
400, 1250`;

const { pieces } = parseRequiredPiecesText(rawInput);

const stockConfigs: { name: string; stocks: StockSheetInput[] }[] = [
  {
    name: "1. Ván tiêu chuẩn công nghiệp VN (2440 x 1220 mm)",
    stocks: [{ id: "s-2440-1220", name: "Ván 2440x1220", length: 2440, width: 1220 }],
  },
  {
    name: "2. Ván khổ lớn (2740 x 1830 mm)",
    stocks: [{ id: "s-2740-1830", name: "Ván 2740x1830", length: 2740, width: 1830 }],
  },
  {
    name: "3. Ván công nghiệp (2400 x 1200 mm)",
    stocks: [{ id: "s-2400-1200", name: "Ván 2400x1200", length: 2400, width: 1200 }],
  },
];

console.log("================================================================================");
console.log("   PHÂN TÍCH CHI TIẾT BỘ TEST MẶT GỖ CẦN LÀM (HEURISTIC vs DP GROUND TRUTH)");
console.log("================================================================================");
console.log("Danh sách chi tiết yêu cầu:");
pieces.forEach((p, i) => {
  const area = ((p.length * p.width * p.quantity) / 1e6).toFixed(3);
  console.log(`  #${i + 1}. [${p.name}] Kích thước: ${p.length} x ${p.width} mm | SL: ${p.quantity} | Diện tích: ${area} m² | Xoay: ${p.allowRotation ? "Có" : "Không"}`);
});
const totalReqArea = pieces.reduce((sum, p) => sum + (p.length * p.width * p.quantity) / 1e6, 0);
console.log(`  => TỔNG DIỆN TÍCH GỖ YÊU CẦU: ${totalReqArea.toFixed(3)} m²\n`);

for (const sc of stockConfigs) {
  console.log("--------------------------------------------------------------------------------");
  console.log(`🔷 ${sc.name}`);
  console.log("--------------------------------------------------------------------------------");

  // 1. Heuristic
  const t0 = performance.now();
  const heurRes = calculateWoodCut(sc.stocks, pieces, { kerf: 3, minSubPieceSize: 50 });
  const t1 = performance.now();
  const heurTime = t1 - t0;

  // 2. DP Ground Truth
  const t2 = performance.now();
  const dpRes = solveGroundTruthDP(sc.stocks, pieces, { kerf: 3, minSubPieceSize: 50 });
  const t3 = performance.now();
  const dpTime = t3 - t2;

  console.log("\n📊 BẢNG SO SÁNH CHỈ SỐ:");
  console.log(`┌──────────────────────────────┬──────────────────────┬──────────────────────┬─────────────┐`);
  console.log(`│ Chỉ số đánh giá              │ Heuristic Ensemble   │ DP Ground Truth (Opt)│ Chênh lệch  │`);
  console.log(`├──────────────────────────────┼──────────────────────┼──────────────────────┼─────────────┤`);
  console.log(`│ Số ván gốc cần dùng          │ ${String(heurRes.summary.totalStockSheets + " tấm").padEnd(20)} │ ${String(dpRes.summary.totalStockSheets + " tấm").padEnd(20)} │ ${(heurRes.summary.totalStockSheets - dpRes.summary.totalStockSheets === 0 ? "0 (Tối ưu)" : `+${heurRes.summary.totalStockSheets - dpRes.summary.totalStockSheets}`).padEnd(11)} │`);
  console.log(`│ Hiệu suất sử dụng ván        │ ${String(heurRes.summary.efficiencyPercent + " %").padEnd(20)} │ ${String(dpRes.summary.efficiencyPercent + " %").padEnd(20)} │ ${(heurRes.summary.efficiencyPercent - dpRes.summary.efficiencyPercent).toFixed(1).padEnd(11)} │`);
  console.log(`│ Tổng diện tích ván mua       │ ${String(heurRes.summary.totalStockArea.toFixed(3) + " m²").padEnd(20)} │ ${String(dpRes.summary.totalStockArea.toFixed(3) + " m²").padEnd(20)} │ 0.000       │`);
  console.log(`│ Diện tích gỗ thừa (Waste)    │ ${String(heurRes.summary.totalWasteArea.toFixed(3) + " m²").padEnd(20)} │ ${String(dpRes.summary.totalWasteArea.toFixed(3) + " m²").padEnd(20)} │ 0.000       │`);
  console.log(`│ Tổng số vết cắt xẻ ván       │ ${String(heurRes.summary.totalCutsCount + " nhát").padEnd(20)} │ ${String(dpRes.summary.totalCutsCount + " nhát").padEnd(20)} │ ${(heurRes.summary.totalCutsCount - dpRes.summary.totalCutsCount === 0 ? "Bằng nhau" : `${heurRes.summary.totalCutsCount - dpRes.summary.totalCutsCount}`).padEnd(11)} │`);
  console.log(`│ Số mối nối ghép gỗ (Seams)   │ ${String(heurRes.summary.totalSeamsCount + " mối").padEnd(20)} │ ${String(dpRes.summary.totalSeamsCount + " mối").padEnd(20)} │ 0           │`);
  console.log(`│ Thời gian thực thi (Latency) │ ${String(heurTime.toFixed(2) + " ms").padEnd(20)} │ ${String(dpTime.toFixed(2) + " ms").padEnd(20)} │ ${(dpTime / Math.max(0.001, heurTime)).toFixed(1)}x nhanh hơn │`);
  console.log(`└──────────────────────────────┴──────────────────────┴──────────────────────┴─────────────┘`);

  // Chi tiết ghép gỗ
  if (heurRes.joinedPieces && heurRes.joinedPieces.length > 0) {
    console.log("\n🪵 PHƯƠNG ÁN PHÂN RÃ & GHÉP GỖ (CHO CÁC TẤM QUÁ KHỔ):");
    heurRes.joinedPieces.forEach((jp) => {
      console.log(`  • ${jp.parentName} (${jp.targetLength} x ${jp.targetWidth} mm): Ghép từ ${jp.subPieces.length} mảnh (${jp.seamCount} mối ghép)`);
      jp.subPieces.forEach((sp, sIdx) => {
        console.log(`      - Mảnh con ${sIdx + 1} (id: ${sp.id}): ${sp.length} x ${sp.width} mm -> Nằm ở Ván #${sp.stockSheetIndex}`);
      });
    });
  } else {
    console.log("\n🪵 GHÉP GỖ: Không có tấm nào vượt kích thước ván gốc (0 mối ghép)");
  }

  // Chi tiết sắp xếp trên từng tấm ván của Heuristic
  console.log("\n📋 SẮP XẾP TRÊN TỪNG TẤM VÁN GỐC (Heuristic Layout):");
  heurRes.stockSheetsUsed.forEach((sheet) => {
    console.log(`  [Ván #${sheet.sheetIndex}] Loại: ${sheet.length}x${sheet.width} mm | Hiệu suất: ${sheet.efficiency}% | Cắt: ${sheet.cutsCount} nhát`);
    sheet.placedPieces.forEach((p) => {
      console.log(`    + [${p.name}] ${p.length}x${p.width} mm tại (x=${p.x}, y=${p.y})${p.rotated ? " [ĐÃ XOAY 90°]" : ""}`);
    });
  });
  console.log("\n");
}
