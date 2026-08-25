# Thiết kế Chuẩn Hóa Vân Gỗ (Grain Direction) & Đối Soát Song Song với DP Ground Truth

## 1. Tổng quan & Vấn đề Cần Giải Quyết

### 1.1. Hiện tượng Lỗi & Bất Cập Hiện Tại
- Khi người dùng chỉnh qua lại giữa **"Để dọc"** (`vertical`) và **"Để ngang"** (`horizontal`), hệ thống đang hoán đổi trực tiếp `Length` và `Width` ở tầng phân rã (`woodDecomposer.ts`), khiến:
  - Sơ đồ cấu trúc ghép mặt gỗ (`JoinedPieceDiagramView`) bị xoay đổi hình dạng danh định thành phẩm (ví dụ $1000 \times 400$ bị biến thành $400 \times 1000$).
  - Trên sơ đồ cắt ván gốc (`CuttingDiagram`), chi tiết lại không thể hiện rõ là đang cắt xoay ngang 90° so với thớ gỗ của ván gốc.
  - Làm cho việc chọn "Để dọc" hay "Để ngang" trở nên khó hiểu và không đúng chuẩn ngành mộc CNC.

---

## 2. Giải Pháp Kỹ Thuật: Chuẩn Hóa Vân Gỗ Theo Tiêu Chuẩn Ngành Mộc

### 2.1. Định Nghĩa Chuẩn Xác Các Thuộc Tính
1. **Mặt gỗ thành phẩm (Required Piece)**:
   - `Length`: Chiều dài danh định theo thớ/vân gỗ của chi tiết (do người dùng nhập).
   - `Width`: Chiều rộng danh định ngang thớ/vân gỗ của chi tiết (do người dùng nhập).
   - **Bất biến:** Kích thước hiển thị trên BOM và Sơ đồ ghép mặt gỗ **LUÔN LUÔN giữ nguyên $Length \times Width$**.
2. **Ván gỗ gốc (Stock Sheet)**:
   - `Length`: Chiều dài dọc thớ gỗ chính của ván (trục $X$, thường $2440\text{mm}$).
   - `Width`: Chiều rộng ngang thớ gỗ của ván (trục $Y$, thường $1220\text{mm}$).
3. **3 Chế độ đặt vân gỗ (`PieceOrientation`)**:
   - **`vertical` (Để dọc / Cùng chiều vân ván gốc)**:
     - Chiều dài chi tiết song song với chiều dài ván gốc.
     - Kích thước cắt trên ván: `placed.length = item.length`, `placed.width = item.width`.
     - Trạng thái xoay: **`rotated: false`**.
   - **`horizontal` (Để ngang / Xoay vuông góc 90° so với vân ván gốc)**:
     - Chiều dài chi tiết song song với chiều rộng ván gốc.
     - Kích thước cắt trên ván: `placed.length = item.width`, `placed.width = item.length`.
     - Trạng thái xoay: **`rotated: true`**.
   - **`auto` (Tự do xoay)**:
     - Thuật toán tự do thử cả 0° và 90°, chọn hướng tiết kiệm số lượng ván nhất.

---

## 3. Hiển Thị Trực Quan Trên Giao Diện

1. **Sơ đồ Ghép Mặt Gỗ (`JoinedPieceDiagramView.tsx`)**:
   - Khung viền ngoài luôn hiển thị đúng hình dáng mặt gỗ $Length \times Width$.
   - Các mảnh con (`SubPiece`) hiển thị toạ độ và kích thước theo hệ trục của mặt gỗ.
2. **Sơ đồ Cắt Ván Gốc (`CuttingDiagram.tsx`)**:
   - Mỗi chi tiết cắt hiển thị rõ kích thước đặt thực tế trên ván kèm nhãn định hướng:
     - `rotated === true`: Nhãn `⟲ Ngang vân (Xoay 90°)`
     - `rotated === false`: Nhãn `Dọc vân`

---

## 4. Kế Hoạch Đo Kiểm & Đối Soát Song Song với DP Ground Truth

1. **Dual Co-Testing Heuristic vs DP Ground Truth trên Test Nhỏ ($N \le 10$)**:
   - Chạy 50 ca kiểm thử ngẫu nhiên có khóa vân `"vertical"`, `"horizontal"`, `"auto"`.
   - Kiểm tra 100% chi tiết `"vertical"` có `rotated: false` và chi tiết `"horizontal"` có `rotated: true` ở cả 2 thuật toán.
   - Khẳng định Heuristic đạt $\ge 98\%$ số ván tối ưu so với DP.
2. **Kiểm tra tương tác chuyển đổi dọc/ngang**:
   - Test case cụ thể: Tấm $1000 \times 400$ trên ván $2440 \times 1220$:
     - Chuyển `vertical`: đặt $1000 \times 400$, `rotated: false`.
     - Chuyển `horizontal`: đặt $400 \times 1000$, `rotated: true`.
     - Sơ đồ mặt gỗ luôn giữ nguyên $1000 \times 400$.
