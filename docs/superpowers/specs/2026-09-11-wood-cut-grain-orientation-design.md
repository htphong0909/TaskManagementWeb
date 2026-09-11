# Thiết kế Tính Năng Hướng Vân Gỗ & Trực Quan Hóa (Real-time Grain Orientation & Visualization)

**Ngày lập:** 11/09/2026  
**Trạng thái:** Đã thống nhất thiết kế với người dùng  
**File áp dụng:** `src/types/woodCut.ts`, `src/components/wood-cut/*`, `src/lib/woodCuttingOptimizer.ts`, `src/lib/woodDecomposer.ts`, `src/lib/woodCutParser.ts`, `src/app/wood-cut/page.tsx`

---

## 1. Bối Cảnh & Vấn Đề Cần Giải Quyết

Hiện tại trên trang **Tối Ưu Cắt & Ghép Ván Gỗ** (`/wood-cut`):
- Việc quy ước "Để dọc" / "Để ngang" / "Tự do xoay" còn mang tính trừu tượng, khiến người dùng dễ bị rối khi không biết chiều vân thực tế của tấm ván phôi gốc chạy theo hướng nào và chi tiết cắt ra sẽ có thớ gỗ như thế nào.
- Chưa có khu vực xem trước (preview) hình dạng và hướng vân của ván gốc ngay khi thêm khổ ván.
- Chưa có khu vực xem trước các mặt gỗ cần cắt với hoa văn vân gỗ thực tế.
- Trên sơ đồ cắt và sơ đồ ghép, các hoa văn vân gỗ chưa phản ánh sinh động và linh hoạt theo cấu hình vân được chọn.

### Mục Tiêu Của Thiết Kế Mới
1. **Trực quan hóa 100%:** Người dùng nhìn thấy thớ gỗ thực tế ở mọi khâu (Ván gốc phôi $\to$ Chi tiết cần làm $\to$ Sơ đồ cắt ván $\to$ Sơ đồ ghép tấm lớn).
2. **Quy ước chuẩn mực & dễ hiểu:** Dựa trên trục tọa độ màn hình trực quan (Vân ngang $\leftrightarrow$ theo trục $X$, Vân dọc $\updownarrow$ theo trục $Y$, Không vân $\leftrightarrow$ tự do xoay).
3. **Đồng bộ logic:** Toàn bộ ván gốc tuân theo cùng một cài đặt vân; chỉ cho phép chọn vân ở các mặt gỗ cần làm khi ván gốc có vân.

---

## 2. Kiến Trúc Dữ Liệu & Types (`src/types/woodCut.ts`)

### 2.1. Kiểu Dữ Liệu Vân Gỗ Mới
```typescript
export type WoodGrain = "none" | "horizontal" | "vertical";
```

### 2.2. Mở Rộng Cấu Hình `CalculationConfig`
```typescript
export interface CalculationConfig {
  kerf: number;            // Độ dày mạch cưa (mm)
  minSubPieceSize: number; // Kích thước tối thiểu mảnh ghép (mm)
  stockGrain: WoodGrain;   // Hướng vân ván phôi gốc: "none" | "horizontal" | "vertical" (Mặc định: "horizontal")
  useExactDP?: boolean;
}
```

### 2.3. Cập Nhật `RequiredPieceInput`
```typescript
export interface RequiredPieceInput {
  id: string;
  name: string;
  length: number;          // mm
  width: number;           // mm
  quantity: number;
  grain?: WoodGrain;       // "none" (tự do) | "horizontal" (vân ngang) | "vertical" (vân dọc)
  orientation?: PieceOrientation; // Giữ để tương thích ngược
  allowRotation?: boolean;
}
```

### 2.4. Bổ Sung Thuộc Tính Trên `PlacedPiece` & `SubPiece`
- `appliedGrain?: WoodGrain;`: Hướng vân thực tế hiển thị trên sơ đồ cắt (giúp SVG pattern hiển thị chuẩn xác thớ vân thực tế của mẩu gỗ sau khi cưa).

---

## 3. Thiết Kế Giao Diện & Component Trực Quan Hóa (UI/UX)

### 3.1. Khung Ván Gỗ Gốc (`StockSheetForm.tsx`)
1. **Bộ chọn vân ván gốc (Header Segment Control):**
   - Đặt nổi bật tại phần tiêu đề của card Ván Gỗ Gốc:
     - `[ 🚫 Không vân ]`
     - `[ ↔️ Vân ngang ]`
     - `[ ↕️ Vân dọc ]`
   - Chuyển đổi trạng thái mượt mà (smooth transitions), màu sắc violet/indigo chủ đạo, lưu vào `config.stockGrain`.
2. **Khung Preview Ván Gốc (ngay dưới nút "+ Thêm ván gốc"):**
   - Hiển thị danh thiếp preview cho từng khổ ván phôi trong danh sách.
   - **Tỉ lệ thu nhỏ chuẩn (Aspect ratio):** Giữ đúng tỉ lệ Dài $\times$ Rộng thực tế, chiều cao tối đa co giãn vừa vặn (~120-140px).
   - **Chất liệu vân gỗ SVG:**
     - Nếu `stockGrain === "horizontal"`: Đường sóng vân gỗ SVG màu be ấm chạy ngang ↔.
     - Nếu `stockGrain === "vertical"`: Đường sóng vân gỗ SVG chạy dọc ↕.
     - Nếu `stockGrain === "none"`: Bề mặt gỗ sáng phẳng mịn, không vân.
   - **Nhãn hiển thị:** Tên ván, kích thước thực tế (ví dụ: `1200 × 600 mm`) và badge chỉ hướng vân.

### 3.2. Khung Mặt Gỗ Cần Làm (`RequiredPiecesForm.tsx`)
1. **Dropdown chọn vân tại từng dòng:**
   - Các lựa chọn:
     - `↔️ Vân ngang`
     - `↕️ Vân dọc`
     - `🔄 Không vân (Tự do)`
   - **Tự động vô hiệu hóa (Disabled State):** Khi `config.stockGrain === "none"`, dropdown này tự động chuyển về `🔄 Không vân` và bị khóa mờ (disabled) kèm chú thích nhẹ: *"Ván phôi không vân nên chi tiết tự do xoay tối ưu diện tích"*.
   - Mục *"Đổi hướng tất cả"* và *"Nhập nhanh (Paste)"* (`woodCutParser.ts`) cập nhật để hỗ trợ các từ khóa: `!ngang`, `!doc`, `!xoay`, `!none`.
2. **Khung Preview Mặt Gỗ Cần Làm (ngay dưới bảng nhập liệu):**
   - Tiêu đề: `👁️ Xem trước mặt gỗ thành phẩm & hướng vân`.
   - Lưới danh thiếp thu nhỏ (Responsive Cards):
     - Hiển thị từng chi tiết với đúng tỉ lệ Dài $\times$ Rộng.
     - Viền và nền mang mã màu pastel riêng biệt của chi tiết (khớp với màu trên sơ đồ cắt bên dưới).
     - Hoa văn thớ vân SVG chạy theo đúng lựa chọn của chi tiết (`horizontal` $\to$ vân ngang, `vertical` $\to$ vân dọc, `none` $\to$ nền phẳng không vân).
     - Nhãn tên chi tiết, số lượng $\times$ kích thước `mm`.

### 3.3. Sơ Đồ Cắt Từng Tấm Ván Gốc (`CuttingDiagram.tsx`)
1. **Nền ván gốc:**
   - SVG Pattern vân gỗ của nền ván phôi xoay tự động theo `config.stockGrain` (chạy ngang, chạy dọc hoặc ẩn khi không vân).
2. **Từng chi tiết cắt trên ván (`PlacedPiece`):**
   - Phủ lớp hoa văn thớ vân gỗ SVG thực tế theo đúng thớ gỗ vật lý của tấm ván phôi.
   - Nhãn thông số trực quan:
     - Tên chi tiết + kích thước thực tế cắt trên ván.
     - Huy hiệu định hướng: `↔️ Vân ngang` hoặc `↕️ Vân dọc (Đã xoay 90° để khớp thớ)` hoặc `(Tự do xoay)`.

### 3.4. Sơ Đồ Ghép Mặt Gỗ Thành Phẩm (`JoinedPieceDiagramView.tsx`)
1. Thể hiện các đường vân gỗ lớn chạy liền mạch theo đúng hướng vân mà người dùng đã chọn cho mặt gỗ đó.
2. Các mẩu ván ghép thể hiện đường viền nét đứt và nhãn số hiệu ván gốc, giúp người thợ hình dung mẩu nào ghép vào đâu để liền thớ gỗ.

---

## 4. Logic Thuật Toán Xếp Ván & Khớp Vân Vật Lý

### 4.1. Quy Tắc Khớp Vân (`woodCuttingOptimizer.ts`)
* Giả sử Ván gốc có hướng vân $S$ (`config.stockGrain`) và Chi tiết có hướng vân $P$ (`item.grain`):
  * **Nếu $S == "none"$:**
    $\to$ Tự do thử cả 2 hướng: $0^\circ$ (không xoay) và $90^\circ$ (xoay) để chọn phương án tối ưu diện tích nhất.
  * **Nếu $S \neq "none"$:**
    * Nếu $P == "none"$: Tự do thử cả $0^\circ$ và $90^\circ$.
    * Nếu $P == S$ (Cùng hướng vân với ván gốc): Bắt buộc $0^\circ$ (`tryNormal = true, tryRotated = false`).
    * Nếu $P \neq S$ và $P \neq "none"$ (Khác hướng vân với ván gốc): Bắt buộc xoay $90^\circ$ (`tryNormal = false, tryRotated = true`).

### 4.2. Phân Rã Tấm Vượt Khổ (`woodDecomposer.ts`)
* Khi phân rã một tấm lớn thành các mảnh nhỏ (`SubPiece`):
  * Toàn bộ mảnh con kế thừa đúng hướng vân của tấm cha.
  * Vết nối (seams) ưu tiên chạy song song với chiều vân gỗ để mối ghép đẹp và liền vân nhất.

---

## 5. Xử Lý Tình Huống Ngoại Lệ (Edge Cases)

1. **Bật/Tắt ván gốc không vân:** Khi chuyển từ có vân sang không vân rồi quay lại có vân, cấu hình vân ban đầu của từng mặt gỗ vẫn được ghi nhớ nguyên vẹn.
2. **Lưu trữ LocalStorage:** Cấu hình `stockGrain` và `pieces[i].grain` được tự động lưu vào `wood_cutting_calculator_state_v1`, duy trì dữ liệu sau khi F5/reload trang.
3. **Kích thước quá khổ sau khi xoay 90°:** Nếu một chi tiết sau khi xoay 90° để lấy vân mà chiều rộng vượt quá khổ ván phôi, module phân rã sẽ xử lý ghép an toàn mà không làm sập ứng dụng.

---

## 6. Kế Hoạch Kiểm Thử (Verification Plan)

1. **Unit Tests (Vitest):**
   - Viết test suite kiểm tra logic xếp vân:
     - Tấm cùng vân với ván gốc $\to 100\%$ không xoay (`rotated: false`).
     - Tấm khác vân với ván gốc $\to 100\%$ xoay $90^\circ$ (`rotated: true`).
     - Ván gốc không vân $\to$ cho phép xoay linh hoạt tối ưu diện tích.
   - Viết test kiểm tra UI component: Render bộ chọn vân, render 2 visualizer, toggle disable trạng thái khi ván gốc không vân.
2. **Hồi quy & Tích hợp:**
   - Chạy `npm run test` để đảm bảo toàn bộ các bài test ICPC stress test, DP invariants hiện có đều PASS $100\%$.
   - Chạy `npm run lint` kiểm tra cú pháp và kiểu dữ liệu.
