# Kế Hoạch Triển Khai: Xem Phóng To (Zoom & Pan) & Thước Đo CAD Cho Mô Phỏng Ván Phôi & Mặt Gỗ Cần Làm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng click xem phóng to toàn màn hình với điều khiển Zoom/Pan mượt mà (sử dụng `DiagramZoomModal`), hiển thị thước đo kích thước chuẩn CAD (đường gióng, mũi tên đo), hoa văn thớ gỗ sắc nét và diện tích tính theo $m^2$ cho cả 2 khung: **Mô phỏng ván phôi (`StockSheetVisualizer`)** và **Mô phỏng mặt gỗ cần làm (`RequiredPiecesVisualizer`)**.

**Architecture:** Tái sử dụng component [`DiagramZoomModal`](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/wood-cut/DiagramZoomModal.tsx) hiện có. Trên các thẻ card thumbnail ở 2 visualizer, bổ sung trạng thái hover, huy hiệu `🔍 Xem lớn` và bắt sự kiện click để mở modal. Trong modal, tạo hàm vẽ SVG chuyên dụng với vùng đệm `padding = 70`, bổ sung các đường gióng kích thước ngoài (dimension lines) với mũi tên hai đầu (`marker-start`, `marker-end`), nhãn kích thước `Dài: [L] mm` và `Rộng: [W] mm`, cùng thẻ hiển thị diện tích ($m^2$) và huy hiệu hướng thớ gỗ.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, SVG Vector Graphics, Vitest, React Testing Library.

## Global Constraints

- Không làm gián đoạn hoặc phá vỡ các tính năng tính toán cắt gỗ, xếp ván hiện tại.
- Tuân thủ nghiêm ngặt chuẩn Glass-Pastel theme.
- ViewBox SVG trong modal phải co giãn tỷ lệ chuẩn và hỗ trợ chuột lăn zoom từ 0.2x đến 6.0x và kéo rê (drag & pan) không giật lag.
- Toàn bộ 27 test files hiện hữu phải tiếp tục PASS 100%. Linter 0 error, build production exit code 0.

---

### Task 1: Nâng Cấp `StockSheetVisualizer.tsx` với Zoom Modal & Thước Đo Kích Thước CAD

**Files:**
- Modify: `src/components/wood-cut/StockSheetVisualizer.tsx`
- Test: `src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx`

**Interfaces:**
- Consumes:
  - `StockSheetInput`, `WoodGrain` từ `@/types/woodCut`
  - `DiagramZoomModal` từ `./DiagramZoomModal`
- Produces:
  - `StockSheetVisualizer` có hỗ trợ click mở `DiagramZoomModal` với SVG bản vẽ kỹ thuật chi tiết.

- [ ] **Step 1: Viết test kiểm tra tương tác mở Modal và hiển thị thước đo/diện tích**

Cập nhật file `src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx` bổ sung test:
```tsx
it("opens DiagramZoomModal on card click with dimensions, area and grain badge", () => {
  const stockSheets: StockSheetInput[] = [
    { id: "s1", name: "Ván Chuẩn 1", length: 1200, width: 600 },
  ];
  render(<StockSheetVisualizer stockSheets={stockSheets} stockGrain="vertical" />);

  // Kiểm tra huy hiệu 'Xem lớn'
  expect(screen.getByText(/Xem lớn/i)).toBeInTheDocument();

  // Click vào card
  fireEvent.click(screen.getByText(/Ván Chuẩn 1/i));

  // Kiểm tra modal xuất hiện
  expect(screen.getByText(/Ván Phôi: Ván Chuẩn 1/i)).toBeInTheDocument();
  expect(screen.getByText(/0.720 m²/i)).toBeInTheDocument();
  expect(screen.getByText(/Dài: 1200 mm/i)).toBeInTheDocument();
  expect(screen.getByText(/Rộng: 600 mm/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (Red phase)**

Chạy:
```bash
npx vitest run src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx
```

- [ ] **Step 3: Cập nhật `StockSheetVisualizer.tsx` (Green phase)**

1. Quản lý state:
```tsx
const [activeSheet, setActiveSheet] = useState<StockSheetInput | null>(null);
```
2. Cập nhật thẻ thumbnail:
- Bổ sung `cursor-pointer group hover:shadow-md hover:border-violet-400 hover:scale-[1.008] transition-all`.
- Bổ sung `onClick={() => setActiveSheet(s)}`.
- Thêm huy hiệu `🔍 Xem lớn` ở góc trên:
```tsx
<span className="text-[10px] font-bold text-slate-500 group-hover:text-violet-700 bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-200 shadow-xs flex items-center gap-1">
  🔍 Xem lớn
</span>
```
3. Thêm hàm `renderModalSvg(sheet: StockSheetInput)`:
- `padding = 70`, `viewBoxWidth = sheet.length + padding * 2`, `viewBoxHeight = sheet.width + padding * 2`.
- Thêm marker mũi tên: `<marker id="dim-arrow-stock" ...>`
- Đường đo chiều dài ở đỉnh: từ `(padding, padding - 25)` tới `(padding + sheet.length, padding - 25)`. Đường gióng ở 2 đầu `x=padding` và `x=padding+sheet.length`. Chữ `Dài: ${sheet.length} mm`.
- Đường đo chiều rộng ở cạnh trái: từ `(padding - 25, padding)` tới `(padding - 25, padding + sheet.width)`. Chữ `Rộng: ${sheet.width} mm`.
- Hình chữ nhật ván phôi ở `(padding, padding)` kích thước `sheet.length × sheet.width`.
- Lớp hoa văn vân gỗ chạy theo `stockGrain` (dọc, ngang hoặc không có).
- Thẻ thông tin trọng tâm (Center Info Badge) hiển thị:
  - Tên ván
  - Kích thước: `${sheet.length} × ${sheet.width} mm`
  - Diện tích: `${(sheet.length * sheet.width / 1e6).toFixed(3)} m²`
  - Hướng vân: `↕️ Vân dọc` / `↔️ Vân ngang` / `🚫 Không vân`
4. Mount `<DiagramZoomModal>` khi `activeSheet !== null`.

- [ ] **Step 4: Chạy lại test xác nhận thành công (Green phase)**

Chạy:
```bash
npx vitest run src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx
```

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/wood-cut/StockSheetVisualizer.tsx src/components/wood-cut/__tests__/StockSheetVisualizer.test.tsx
git commit -m "feat(wood-cut): add zoom modal with CAD dimension lines to StockSheetVisualizer"
```

---

### Task 2: Nâng Cấp `RequiredPiecesVisualizer.tsx` với Zoom Modal & Thước Đo Kích Thước CAD

**Files:**
- Modify: `src/components/wood-cut/RequiredPiecesVisualizer.tsx`
- Test: `src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`

**Interfaces:**
- Consumes:
  - `RequiredPieceInput`, `WoodGrain` từ `@/types/woodCut`
  - `DiagramZoomModal` từ `./DiagramZoomModal`
- Produces:
  - `RequiredPiecesVisualizer` có hỗ trợ click mở `DiagramZoomModal` với SVG bản vẽ chi tiết tấm gỗ thành phẩm.

- [ ] **Step 1: Viết test kiểm tra tương tác mở Modal và hiển thị thông số chi tiết**

Cập nhật `src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx`:
```tsx
it("opens DiagramZoomModal on piece card click with dimension lines, single and total area", () => {
  const pieces: RequiredPieceInput[] = [
    {
      id: "p1",
      name: "Cánh Tủ Áo",
      length: 800,
      width: 400,
      quantity: 2,
      grain: "vertical",
      orientation: "vertical",
      allowRotation: false,
    },
  ];
  render(<RequiredPiecesVisualizer pieces={pieces} stockGrain="vertical" />);

  // Kiểm tra nút Xem lớn
  expect(screen.getByText(/Xem lớn/i)).toBeInTheDocument();

  // Click vào card
  fireEvent.click(screen.getByText(/Cánh Tủ Áo/i));

  // Kiểm tra modal hiển thị
  expect(screen.getByText(/Chi Tiết: Cánh Tủ Áo/i)).toBeInTheDocument();
  expect(screen.getByText(/Dài: 800 mm/i)).toBeInTheDocument();
  expect(screen.getByText(/Rộng: 400 mm/i)).toBeInTheDocument();
  expect(screen.getByText(/0.320 m²/i)).toBeInTheDocument();
  expect(screen.getByText(/0.640 m²/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (Red phase)**

Chạy:
```bash
npx vitest run src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx
```

- [ ] **Step 3: Cập nhật `RequiredPiecesVisualizer.tsx` (Green phase)**

1. Thêm state:
```tsx
const [activePiece, setActivePiece] = useState<RequiredPieceInput | null>(null);
```
2. Cập nhật thẻ thumbnail:
- Thêm `cursor-pointer group hover:shadow-md hover:border-violet-400 hover:scale-[1.008] transition-all`.
- Thêm `onClick={() => setActivePiece(p)}`.
- Thêm badge `🔍 Xem lớn`.
3. Thêm hàm `renderModalSvg(piece: RequiredPieceInput)`:
- `padding = 70`, `viewBoxWidth = piece.length + padding * 2`, `viewBoxHeight = piece.width + padding * 2`.
- Marker mũi tên: `<marker id="dim-arrow-piece" ...>`.
- Đường đo chiều dài (cạnh trên) kèm chữ `Dài: ${piece.length} mm`.
- Đường đo chiều rộng (cạnh trái) kèm chữ `Rộng: ${piece.width} mm`.
- Hình chữ nhật chi tiết với màu nền pastel riêng biệt và viền sắc nét.
- Lớp hoa văn vân gỗ SVG phủ theo hướng vân chi tiết.
- Thẻ thông tin trọng tâm (Center Info Badge) hiển thị:
  - Tên chi tiết
  - Kích thước: `${piece.length} × ${piece.width} mm`
  - Số lượng: `× ${piece.quantity} tấm`
  - Diện tích: `1 tấm = ${singleArea} m²` và `Tổng = ${totalArea} m²` (nếu quantity > 1)
  - Hướng vân: `↕️ Vân dọc` / `↔️ Vân ngang` / `🔄 Tự do`
4. Mount `<DiagramZoomModal>` khi `activePiece !== null`.

- [ ] **Step 4: Chạy lại test xác nhận thành công (Green phase)**

Chạy:
```bash
npx vitest run src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx
```

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/wood-cut/RequiredPiecesVisualizer.tsx src/components/wood-cut/__tests__/RequiredPiecesVisualizer.test.tsx
git commit -m "feat(wood-cut): add zoom modal with CAD dimension lines to RequiredPiecesVisualizer"
```

---

### Task 3: Kiểm Thử Toàn Diện, Lint & Build

**Files:**
- Toàn bộ codebase

- [ ] **Step 1: Chạy toàn bộ unit tests**

```bash
npm run test
```
Xác nhận 100% test files (27+ files) đều PASS, 0 failure.

- [ ] **Step 2: Chạy linter**

```bash
npm run lint
```
Xác nhận 0 errors.

- [ ] **Step 3: Chạy production build**

```bash
npm run build
```
Xác nhận Next.js build thành công (exit code 0).

- [ ] **Step 4: Commit và đẩy code lên nhánh `dev`**
