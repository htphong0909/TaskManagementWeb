# Thiết Kế Kỹ Thuật: Xem Phóng To (Zoom & Pan) & Thước Đo CAD Cho Mô Phỏng Ván Phôi & Mặt Gỗ Cần Làm

Tài liệu này đặc tả kiến trúc, giao diện người dùng và giải pháp kỹ thuật cho tính năng **Xem phóng to (Zoom & Pan), thước đo kích thước (CAD dimension markers) và hiển thị diện tích** cho hai khung trực quan hóa: **Mô phỏng ván phôi (`StockSheetVisualizer`)** và **Mô phỏng mặt gỗ cần làm (`RequiredPiecesVisualizer`)**.

---

## 1. Mục Tiêu & Yêu Cầu Người Dùng

1. **Xem chi tiết khổ lớn:** Người dùng có thể bấm vào từng tấm ván phôi hoặc từng chi tiết mặt gỗ cần làm để phóng to toàn màn hình, kiểm tra thớ vân và tỷ lệ kích thước.
2. **Khả năng tương tác Pan & Zoom chuyên nghiệp:** Đồng bộ với trải nghiệm của *Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ* (`JoinedPieceDiagramView`) và *Sơ Đồ Cắt Ván Gốc* (`CuttingDiagram`), bao gồm:
   - Lăn chuột phóng to / thu nhỏ mượt mà (tỷ lệ từ 0.2x đến 6.0x).
   - Giữ chuột trái kéo rê (Pan & Drag) tự do.
   - Nút bấm zoom `[+]`, `[-]`, và nút đặt lại `[↺ 1:1]`.
   - Phím tắt `Escape` hoặc nút `✕` để đóng modal nhanh.
3. **Thước đo kích thước chuẩn CAD (Dimension Lines & Arrows):**
   - Vẽ đường gióng và mũi tên đo kích thước dọc theo 2 cạnh (Dài và Rộng).
   - Nhãn hiển thị kích thước chuẩn `mm`.
4. **Thông tin diện tích & hướng vân:**
   - Tính toán và hiển thị diện tích ($m^2$) thực tế.
   - Đối với chi tiết có số lượng $> 1$, hiển thị cả diện tích 1 tấm và tổng diện tích tất cả các tấm.
   - Hiển thị la bàn / huy hiệu hướng thớ gỗ tương ứng.

---

## 2. Kiến Trúc & Component Giao Diện

### 2.1. Thẻ Xem Trước Thu Nhỏ (Thumbnail Preview Cards)
Áp dụng cho:
- [`StockSheetVisualizer.tsx`](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/wood-cut/StockSheetVisualizer.tsx)
- [`RequiredPiecesVisualizer.tsx`](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/wood-cut/RequiredPiecesVisualizer.tsx)

**Quy cách hiển thị:**
- Thẻ card có `cursor-pointer group hover:shadow-md hover:border-violet-400 hover:scale-[1.008] transition-all`.
- Góc trên bên phải trang bị huy hiệu gợi ý tương tác:
  ```tsx
  <span className="text-[10px] font-bold text-slate-500 group-hover:text-violet-700 bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-200 shadow-xs flex items-center gap-1">
    🔍 Xem lớn
  </span>
  ```
- Nhấp chuột vào bất kỳ vị trí nào trên thẻ hoặc nút "🔍 Xem lớn" đều kích hoạt mở Zoom Modal.

### 2.2. Tích Hợp Modal Phóng To ([`DiagramZoomModal.tsx`](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/wood-cut/DiagramZoomModal.tsx))

Mỗi visualizer lưu trạng thái phần tử đang được xem:
- `StockSheetVisualizer`:
  ```tsx
  const [activeSheet, setActiveSheet] = useState<StockSheetInput | null>(null);
  ```
- `RequiredPiecesVisualizer`:
  ```tsx
  const [activePiece, setActivePiece] = useState<RequiredPieceInput | null>(null);
  ```

**Header của Modal:**
- **Ván phôi:**
  - `title`: `Ván Phôi: ${activeSheet.name || "Ván phôi"} (${activeSheet.length} × ${activeSheet.width} mm)`
  - `subtitle`: `Hướng thớ gỗ: ${grainLabel} • Diện tích: ${(activeSheet.length * activeSheet.width / 1e6).toFixed(3)} m²`
  - `badge`: `Ván phôi`
- **Mặt gỗ cần làm:**
  - `title`: `Chi Tiết: ${activePiece.name} (${activePiece.length} × ${activePiece.width} mm)`
  - `subtitle`: `Số lượng: ${activePiece.quantity} tấm • Hướng thớ: ${grainLabel} • Diện tích: 1 tấm = ${singleArea} m²${activePiece.quantity > 1 ? ` (Tổng: ${totalArea} m²)` : ""}`
  - `badge`: `Mặt gỗ cần làm`

---

## 3. Quy Chuẩn Bản Vẽ Kỹ Thuật SVG Trong Modal

### 3.1. Vùng Đệm & Tọa Độ (ViewBox & Padding)
- Đặt `padding = 70` bao quanh tấm ván/chi tiết để chứa các đường gióng kích thước ngoài mà không bị che khuất.
- Kích thước ViewBox:
  - `viewBoxWidth = length + padding * 2`
  - `viewBoxHeight = width + padding * 2`

### 3.2. Đường Gióng & Mũi Tên Đo Kích Thước (CAD Dimension Ticks)
- **Định nghĩa Marker mũi tên trong `<defs>`:**
  ```xml
  <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748b" />
  </marker>
  ```
- **Đường đo Chiều Dài (Cạnh trên):**
  - Tọa độ Y: `padding - 28`.
  - Đường kẻ ngang từ `padding` đến `padding + length` có `marker-start="url(#dim-arrow)"` và `marker-end="url(#dim-arrow)"`.
  - Đường gióng phụ (extension lines) ở 2 đầu từ mép ván tới đường đo.
  - Chữ hiển thị kích thước: `Dài: [length] mm` đặt chính giữa phía trên đường đo.
- **Đường đo Chiều Rộng (Cạnh trái):**
  - Tọa độ X: `padding - 28`.
  - Đường kẻ dọc từ `padding` đến `padding + width` có 2 đầu mũi tên.
  - Đường gióng phụ ở 2 đầu.
  - Chữ hiển thị kích thước: `Rộng: [width] mm` xoay dọc hoặc đặt sát đường đo.

### 3.3. Bề Mặt & Hoa Văn Vân Gỗ
- **Ván Phôi:**
  - Nền màu gỗ tự nhiên ấm áp `#fbf9f4`, viền `#c8b59d` bo góc `rx=6`.
  - Lớp vân gỗ:
    - Nếu `stockGrain === "vertical"`: Hoa văn sóng vân chạy dọc trục Y.
    - Nếu `stockGrain === "horizontal"`: Hoa văn sóng vân chạy ngang trục X.
    - Nếu `stockGrain === "none"`: Bề mặt phẳng mịn không hoa văn.
- **Mặt Gỗ Cần Làm:**
  - Màu nền pastel riêng biệt tương ứng với màu hiển thị trên sơ đồ cắt.
  - Hoa văn vân gỗ phủ theo đúng cấu hình vân của chi tiết.

### 3.4. Thẻ Thông Tin Trung Tâm (Center Info Badge)
- Đặt tại trung tâm hoặc góc dưới để người xem nắm bắt ngay:
  - Tên tấm / chi tiết.
  - Kích thước: `Dài × Rộng mm`.
  - Diện tích: `... m²`.
  - Huy hiệu hướng vân rõ ràng kèm icon.

---

## 4. Xử Lý Tình Huống Ngoại Lệ (Edge Cases)

1. **Kích thước quá lớn hoặc quá nhỏ:**
   - Với kích thước cực nhỏ (ví dụ $50 \times 50$ mm) hoặc cực lớn ($3000 \times 2000$ mm), tỷ lệ chữ và mũi tên được tính toán theo hàm `Math.min / Math.max` để không bị vỡ bố cục hoặc quá bé.
2. **Nhiều tấm cùng mở:**
   - Mỗi component chỉ mở 1 modal duy nhất tại một thời điểm (`activeSheet` / `activePiece` là giá trị đơn lẻ).
3. **Phím tắt đóng modal:**
   - Bấm `Esc` đóng modal an toàn mà không ảnh hưởng đến các form bên dưới.

---

## 5. Kế Hoạch Kiểm Thử (Verification Plan)

### 5.1. Automated Unit & Component Tests (Vitest & RTL)
1. `src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx`:
   - Xác minh render badge `🔍 Xem lớn` trên card.
   - Giả lập sự kiện click card $\to$ `DiagramZoomModal` mở ra.
   - Kiểm tra nội dung modal: tên ván, kích thước, diện tích $m^2$, đường đo, badge vân gỗ.
   - Kiểm tra đóng modal khi bấm nút đóng hoặc Esc.
2. `src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`:
   - Xác minh click card chi tiết $\to$ mở `DiagramZoomModal`.
   - Kiểm tra hiển thị diện tích 1 tấm và tổng diện tích nếu số lượng $> 1$.
   - Kiểm tra đóng modal.

### 5.2. Toàn Diện Hệ Thống
- Chạy `npm run test` (91 tests hiện có phải 100% PASS).
- Chạy `npm run lint` (0 lỗi).
- Chạy `npm run build` (Next.js build thành công với exit code 0).
