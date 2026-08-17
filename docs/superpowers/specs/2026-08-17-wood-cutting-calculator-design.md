# Đặc Tả Thiết Kế: Trang Tính Toán & Tối Ưu Cắt Ghép Ván Gỗ (Wood Cutting & Joining Optimizer)

- **Ngày tạo:** 17/08/2026
- **Trạng thái:** Đã thống nhất thiết kế với người dùng

---

## 1. Mục Tiêu & Tổng Quan

Xây dựng trang web mới hoàn toàn `/wood-cut` tích hợp trong ứng dụng Next.js hiện tại, cung cấp công cụ tính toán tối ưu số lượng ván gỗ gốc cần mua để hoàn thiện danh sách các mặt gỗ chữ nhật với yêu cầu:
1. Hỗ trợ cả mặt gỗ nhỏ hơn và mặt gỗ lớn hơn khổ ván gốc (tự động ghép nối tấm lớn).
2. Tối thiểu hóa số lượng ván gốc cần mua và diện tích hao hụt.
3. Tối thiểu hóa số đường cắt/mối nối, ưu tiên các tấm con ghép có kích thước lớn, hạn chế tối đa các mẩu vụn ghép.
4. Hỗ trợ tùy chỉnh độ dày mạch cưa (Blade Kerf) và bật/tắt xoay chiều vân gỗ cho từng chi tiết.
5. Điều hướng chuyển đổi mượt mà qua lại giữa trang Quản lý công việc (Board) và trang Tính ván gỗ ở góc trên bên phải.
6. Trực quan hóa sơ đồ cắt từng tấm ván gốc và sơ đồ ghép chi tiết lớn bằng hình vẽ SVG tương tác tỷ lệ chuẩn.

---

## 2. Cấu Trúc Điều Hướng & Routing

### 2.1 Các Tuyến Đường (Routes)
* `/board/[id]` và `/`: Trang Quản lý bảng công việc hiện tại.
* `/wood-cut`: Trang Công cụ tính toán và tối ưu cắt ghép ván gỗ mới.

### 2.2 Nút Chuyển Đổi Điều Hướng (Top-Right Header)
* **Tại `src/app/board/[id]/page.tsx`:**
  - Vị trí: Header phía trên bên phải, cạnh badge người dùng `✨ HTPhongNAThy`.
  - Nút: `[ 🪚 Tính ván gỗ ]` với phong cách Glassmorphism đồng bộ (`bg-violet-50/80 hover:bg-violet-100 text-violet-700 border border-violet-200/80 rounded-xl px-3.5 py-1.5 font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5`).
  - Hành động: Điều hướng tới `/wood-cut`.
* **Tại `src/app/wood-cut/page.tsx`:**
  - Vị trí: Header phía trên bên phải.
  - Nút: `[ 📋 Quản lý công việc ]`.
  - Hành động: Quay lại board gần nhất (lưu trong `localStorage` hoặc mặc định `/`).

---

## 3. Kiến Trúc Dữ Liệu & Giao Diện Người Dùng (UI/UX)

### 3.1 Mô Hình Dữ Liệu (Data Models)

```typescript
export interface StockSheetInput {
  id: string;
  name?: string;
  length: number; // mm
  width: number;  // mm
  quantity?: number; // số lượng có sẵn (hoặc undefined = mua mới không giới hạn)
  cost?: number;     // đơn giá (tuỳ chọn)
}

export interface RequiredPieceInput {
  id: string;
  name: string;
  length: number; // mm
  width: number;  // mm
  quantity: number;
  allowRotation: boolean; // true = cho phép xoay 90 độ, false = giữ hướng vân gỗ
}

export interface CalculationConfig {
  kerf: number;            // Độ dày mạch cưa (mm), mặc định 3mm
  minSubPieceSize: number; // Kích thước tối thiểu của tấm ghép để tránh mẩu vụn (mm), mặc định 50mm
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
```

### 3.2 Bố Cục Trang `/wood-cut`
Giao diện tuân thủ chuẩn thiết kế **Glass-Pastel** (Tailwind CSS v4):
1. **Header:**
   - Tiêu đề: `🪚 Tối Ưu Cắt & Ghép Ván Gỗ` + mô tả ngắn gọn.
   - Nút `[ 📋 Quản lý công việc ]` ở góc phải.
2. **Khu vực Trái (Input Panel - 40% màn hình desktop):**
   - **Thẻ Cài đặt & Ván Gốc (Stock Sheets):**
     - Ô nhập Mạch cưa (Kerf) mm.
     - Bảng kích thước ván gốc có sẵn/cần mua. Nút thêm nhanh các kích thước chuẩn (`1200x600`, `2440x1220`, `2440x1830`).
   - **Thẻ Danh Sách Mặt Gỗ Cần Làm (Required Pieces):**
     - Tabs chuyển đổi: **Chế độ Bảng** (Table Input) và **Chế độ Nhập Nhanh** (Batch Text Paste).
     - Hỗ trợ phân tích chuỗi text linh hoạt: `1110, 1230` hoặc `1110x1230 x2` hoặc `1110 1230`.
     - Nút Thêm dòng, Nhân đôi, Xoá dòng, Checkbox "Cho phép xoay".
   - Nút hành động chính: **`[ ⚡ Bắt đầu tính toán ]`** (Gradient tím-hồng nổi bật, phím tắt Enter).
3. **Khu vực Phải (Result & Diagram Panel - 60% màn hình desktop):**
   - **Thẻ Tổng quan Thống kê (Metrics Overview):**
     - Thẻ số lượng ván gốc cần mua (phân loại rõ từng kích thước).
     - Tỷ lệ tận dụng gỗ (Efficiency %).
     - Tổng diện tích gỗ và số đường cắt.
   - **Sơ đồ cắt trực quan SVG từng tấm ván (Interactive Stock Cutting Layout):**
     - Vẽ từng tấm ván gốc theo tỷ lệ chuẩn.
     - Các chi tiết cắt có mã màu pastel phân biệt, nhãn tên, kích thước `DxR`.
     - Vùng thừa (Scrap) hiển thị màu xám mờ và kích thước mẩu thừa.
     - Hiển thị đường nét cưa guillotine.
   - **Sơ đồ ghép ván lớn (Joined Panels Diagram):**
     - Hiển thị riêng bản vẽ ghép cho các mặt gỗ lớn vượt khổ ván, chỉ rõ vị trí đường ghép nối (seam) và kích thước từng tấm con cấu thành.
   - **Nút tiện ích:** Tải ảnh sơ đồ / In kết quả / Sao chép danh sách mua vật tư (BOM).

---

## 4. Thuật Toán Cắt & Ghép Ván (Algorithm Specification)

Module được cài đặt độc lập tại `src/lib/woodCuttingOptimizer.ts`.

### 4.1 Giai Đoạn 1: Phân Rã & Ghép Ván Lớn (Decomposition)
- **Kiểm tra khả năng chứa đơn (Single-sheet containment):**
  Một mặt gỗ $(W_{req}, H_{req})$ vừa vặn một tấm ván gốc $(W_{stk}, H_{stk})$ nếu:
  - $(W_{req} \le W_{stk} \land H_{req} \le H_{stk})$ hoặc (nếu cho phép xoay: $W_{req} \le H_{stk} \land H_{req} \le W_{stk}$).
- **Xử lý mặt gỗ vượt khổ (Oversized Pieces):**
  - Tìm kích thước lớn nhất có thể của các ván gốc có sẵn: $MaxL_{stk}, MaxW_{stk}$.
  - Xác định phương chia tối ưu:
    * Ưu tiên chia 1 chiều (theo chiều dài hoặc chiều rộng) để số đường nối $= \lceil Kích\_thước / Khổ\_gốc \rceil - 1$ là tối thiểu.
    * Tối đa hóa kích thước tấm nguyên: Cắt các tấm có kích thước cực đại trước ($Max\_Dim$).
    * Cân bằng mẩu nhỏ: Nếu mẩu ghép cuối cùng $< minSubPieceSize$ (ví dụ 50mm), tự động cân bằng lại kích thước các tấm ghép gần đều nhau (ví dụ: thay vì `600 + 600 + 30`, chia thành `600 + 315 + 315` hoặc theo cấu hình tối ưu).
  - Gán nhãn `parentId`, tên gốc, toạ độ $(relX, relY)$ cho từng tấm con `SubPiece`.

### 4.2 Giai Đoạn 2: Xếp Ván 2D Guillotine Packing (Cutting Stock Engine)
- **Danh sách đầu vào:** Gom tất cả các tấm nguyên và tấm con ghép, tạo danh sách các phần tử cần xếp.
- **Sắp xếp ưu tiên (Best-Fit Decreasing):**
  - Sắp xếp giảm dần theo: $\text{Diện tích} \rightarrow \max(\text{Dài}, \text{Rộng}) \rightarrow \text{Dài}$.
- **Quy tắc Guillotine Split:**
  - Mỗi tấm ván gốc khởi tạo với 1 hình chữ nhật tự do toàn phần $(0, 0, W_{stk}, H_{stk})$.
  - Thuật toán tìm vị trí tốt nhất trong các khoảng trống tự do hiện có trên tất cả các tấm ván đang mở (Best Short Side Fit - BSSF).
  - Nếu không tấm nào vừa, mở thêm 1 tấm ván gốc mới tối ưu theo kích thước.
  - Khi đặt 1 chi tiết $(w, h)$ vào khoảng trống $(W, H)$ có tính mạch cưa $k$:
    - Khoảng trống còn lại được phân tách thành 2 hình chữ nhật tự do theo kỹ thuật **Shorter Axis Split**:
      * Đường cưa 1: Chia theo trục ngắn hơn để giữ lại mảng ván thừa lớn nhất.
      * Cập nhật danh sách các khoảng trống tự do (Free Rectangles).
- **Hỗ trợ xoay ván:** Nếu `allowRotation = true`, thử cả $(w, h)$ và $(h, w)$ để chọn cấu hình có độ vừa vặn cao nhất.

---

## 5. Kế Hoạch Kiểm Thử (Testing & Quality Assurance)

### 5.1 Unit Tests (`src/lib/__tests__/woodCuttingOptimizer.test.ts`)
1. **Test cơ bản:** Cắt các tấm nhỏ hơn ván gốc, kiểm tra số lượng ván gốc và diện tích.
2. **Test mạch cưa (Kerf):** Kiểm tra khi có mạch cưa $3\text{ mm}$, khoảng cách giữa các tấm được bảo toàn chính xác.
3. **Test xoay ván (Rotation):** Kiểm tra khi tắt xoay ván (giữ vân) vs khi bật xoay ván.
4. **Test phân rã ghép ván lớn:** Kiểm tra mặt gỗ ví dụ của người dùng (`1110x1230` trên ván gốc `1200x600`), kiểm tra số mối ghép là tối thiểu, các tấm con ghép đúng toạ độ.
5. **Test nhập liệu Batch Text Parser:** Kiểm tra các định dạng chuỗi phân tích chính xác thành mảng dữ liệu.

### 5.2 Kiểm Thử Giao Diện & Điều Hướng
- Chuyển đổi qua lại giữa `/board/[id]` và `/wood-cut` mượt mà, không giật lag.
- Tự động lưu và khôi phục trạng thái từ `localStorage`.
- Hiển thị sắc nét sơ đồ SVG trên cả desktop và mobile.
