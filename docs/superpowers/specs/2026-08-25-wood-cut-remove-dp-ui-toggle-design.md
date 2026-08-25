# Thiết kế Tinh Gọn Giao Diện: Gỡ Bỏ Box Tích DP trên Trang Wood-Cut

## 1. Tổng quan & Mục tiêu

Sau khi thuật toán **Hybrid Multi-Stage Heuristic Engine** được tối ưu hóa toàn diện (đạt 98% độ chính xác tối ưu toán học so với DP và tốc độ phản hồi chỉ 5ms), việc duy trì công tắc lựa chọn "🎯 Chuẩn 100% (DP)" trên giao diện người dùng không còn cần thiết và có thể gây phân tâm cho thợ mộc/người dùng cuối.

**Mục tiêu:**
- Gỡ bỏ hoàn toàn checkbox "🎯 Chuẩn 100% (DP)" và các badge trạng thái DP khỏi giao diện người dùng (`StockSheetForm.tsx`).
- Đơn giản hóa luồng tính toán trong `src/app/wood-cut/page.tsx`, luôn sử dụng duy nhất động cơ Heuristic siêu nhanh và mượt mà.
- Giữ lại module DP trong `src/lib/cp/` để phục vụ các bài test stress benchmark và đối soát nội bộ của nhà phát triển.

---

## 2. Chi tiết Thay đổi Thiết Kế

### 2.1. Giao diện Người dùng (`src/components/wood-cut/StockSheetForm.tsx`)
- Xóa bỏ khối `<label>` chứa input checkbox `useExactDP`.
- Xóa bỏ badge `⚡ Heuristic (N > 12)`.
- Xóa bỏ prop `totalPiecesCount` không còn sử dụng.
- Header của khu vực "Ván Gỗ Gốc" chỉ hiển thị:
  - Tiêu đề: `📦 Ván Gỗ Gốc (Khổ ván mua/có sẵn)`
  - Điều chỉnh mạch cưa: `Lưỡi cưa (Kerf): [ 3 ] mm`

### 2.2. Luồng Tính Toán & State (`src/app/wood-cut/page.tsx`)
- Gỡ bỏ import `solveGroundTruthDP`.
- Gỡ bỏ `useExactDP` khỏi `INITIAL_CONFIG` và đơn giản hóa việc đọc/ghi `localStorage`.
- `handleCalculate` chỉ gọi trực tiếp `calculateWoodCut(stockSheets, pieces, config)`.

---

## 3. Kế Hoạch Kiểm Thử
- Chạy toàn bộ test suite `npm test` để xác nhận tất cả 19 test files đều PASS 100%.
