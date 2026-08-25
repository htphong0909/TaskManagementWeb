# Thiết kế Thuật Toán Phân Rã Ván Vượt Khổ Động & Bộ Test Đạt Chuẩn Thi Đấu Lập Trình Quốc Tế (ICPC-Grade)

## 1. Tổng quan & Vấn đề Cần Giải Quyết

### 1.1. Hiện tượng Lỗi Hiện Tại
- **Đầu vào kiểm thử của người dùng**: Ván gốc $2440 \times 1220\text{mm}$, yêu cầu mặt gỗ $4002 \times 12210\text{mm}$, số lượng $q = 12$.
- **Lỗi phát sinh**: Hệ thống chỉ sử dụng đúng 12 tấm ván gốc, và mỗi tấm ván đều bị tràn viền nghiêm trọng (mảnh $4002 \times 12210$ bị đặt nguyên vẹn đè lên tấm $2440 \times 1220$).
- **Nguyên nhân cốt lõi (Root Cause)**:
  - Trong `src/lib/woodDecomposer.ts`, thuật toán phân rã chia lưới 2D đang bị gán cứng giới hạn duyệt $NL \le 4$ và $NW \le 4$.
  - Với chiều rộng $W = 12210\text{mm}$, khi chia tối đa $NW = 4$ thì kích thước mỗi mảnh con là $3052.5\text{mm} > 2440\text{mm}$ (vẫn lớn hơn kích thước ván gốc) $\rightarrow$ Tất cả các nhánh chia đều thất bại (`candidates.length === 0`) $\rightarrow$ Thuật toán rơi vào fallback sai lầm: trả về 1 mảnh nguyên $4002 \times 12210\text{mm}$.
  - Sau đó, 12 mảnh vượt khổ này được chuyển sang `woodCuttingOptimizer.ts`, đặt mỗi mảnh lên 1 tấm ván gốc $\rightarrow$ Kết quả ra đúng 12 tấm ván bị tràn viền 100%.

---

## 2. Giải Pháp Kỹ Thuật: Thuật Toán Phân Rã Động Đa Tầng (Dynamic Decomposition)

### 2.1. Tính Toán Số Lượng Mảnh Chia Động Theo Khổ Ván
Thay vì các vòng lặp cố định nhỏ ($NL, NW \le 4$), thuật toán tự động tính toán cận dưới tối thiểu dựa trên kích thước ván gốc lớn nhất có thể chứa:

1. **Xác định Khổ Ván Cực Đại Phù Hợp (`maxStockL`, `maxStockW`)**:
   - Dựa trên danh sách `stockSheets` và hướng vân gỗ (`orientation`).
2. **Cận Dưới Toán Học (Mathematical Lower Bound)**:
   $$NL_{\min} = \left\lceil \frac{L}{\text{maxStockL}} \right\rceil, \quad NW_{\min} = \left\lceil \frac{W}{\text{maxStockW}} \right\rceil$$
3. **Cửa Sổ Duyệt Động Tối Ưu**:
   - Duyệt $NL \in [NL_{\min}, NL_{\min} + 2]$ và $NW \in [NW_{\min}, NW_{\min} + 2]$.
   - Với mỗi cặp $(NL, NW)$, sinh lưới phân rã cân bằng, kiểm tra `canFitInStock` cho từng mảnh con.
4. **Chiến lược Greedy Tiling (Lát Gạch Khổ Lớn)**:
   - Cắt các mảnh nguyên khổ $S_L \times S_W$ trước, mảnh dư chỉ cắt nếu $\ge \text{minSubPieceSize}$.
5. **Invariant Fallback Tuyệt Đối (Zero Out-of-Bounds Guarantee)**:
   - Nếu không có cấu hình đặc biệt nào vừa, áp dụng thuật toán Canonical Grid Tiling: chia $L$ thành các bước $\le S_L$ và $W$ thành các bước $\le S_W$.
   - **Cam kết:** 100% mảnh con trả về **phải có kích thước $\le$ kích thước ván gốc**. Tuyệt đối không bao giờ trả về mảnh vượt khổ.

---

## 3. Bộ Kiểm Thử Đạt Chuẩn Lập Trình Thi Đấu Quốc Tế (ICPC-Grade Test Suite)

Bộ test được tổ chức theo chuẩn các cuộc thi ICPC / Codeforces / Olympiad với 5 Subtasks toàn diện:

### 🧩 Subtask 1: Corner Cases & Biên Kích Thước Nhỏ (10 Cases)
- $1 \times 1\text{mm}$, $1 \times S_W\text{mm}$, $S_L \times 1\text{mm}$.
- Đúng bằng ván gốc ($S_L \times S_W\text{mm}$).
- Lệch biên 1mm / Lệch bù kerf ($S_L + 1 \times S_W$, $S_L + \text{kerf} \times S_W + \text{kerf}$).
- Số lượng cực lớn của mảnh siêu nhỏ ($10 \times 10\text{mm}$, $q = 50$).

### 📏 Subtask 2: Tỷ Lệ Cạnh Cực Đoan / Dạng Kim (Needle & Extreme Aspect Ratio - 10 Cases)
- Dải xà gồ / chỉ nẹp siêu dài: $20000 \times 20\text{mm}$, $50000 \times 50\text{mm}$.
- Tấm vách siêu cao hẹp: $50 \times 30000\text{mm}$.

### 🏗️ Subtask 3: Tấm Đại Vượt Khổ & Số Nguyên Tố Lẻ (Massive Panels & Primes - 20 Cases)
- **Ca của người dùng**: $4002 \times 12210\text{mm}$, $q = 12$ trên ván $2440 \times 1220\text{mm}$ $\rightarrow$ Phân rã thành 264 mảnh, xếp trên $\approx 132$ ván hợp lệ.
- Kích thước số nguyên tố lớn: $10007 \times 5003\text{mm}$, $7919 \times 13007\text{mm}$.
- Sàn hội trường lớn: $15000 \times 15000\text{mm}$, $q = 4$.

### 🔒 Subtask 4: Khóa Vân Gỗ & Tổ Hợp Nhiều Loại Ván Gốc (Multi-Stock & Grain Orientation - 20 Cases)
- Khóa vân dọc `orientation: "vertical"` trên tấm vượt khổ $5000 \times 8000\text{mm}$.
- Khóa vân ngang `orientation: "horizontal"`.
- Đơn hàng hỗn hợp nhiều khổ ván gốc cùng lúc ($2440 \times 1220$, $1200 \times 600$, $3000 \times 1500$).

### ⚡ Subtask 5: ICPC Random Stress Fuzzer (200 Seeded Cases)
- Sinh 200 ca kiểm thử ngẫu nhiên với seed xác định $[1000 \dots 1200]$.
- Phạm vi kích thước ngẫu nhiên: $L \in [10, 50000]$, $W \in [10, 50000]$, $q \in [1, 20]$, $kerf \in [0, 15]$.
- **Tiêu chuẩn chấm bài (Judge Verifier)**: Chạy qua `validateCuttingPlanIntegrity` kiểm tra:
  1. `overlapsCount === 0` (0 lỗi đè hình).
  2. `outOfBoundsCount === 0` (0 lỗi tràn viền).
  3. `orientationViolationsCount === 0` (0 lỗi xoay vân).
  4. `isValid === true` (100% PASS trên tất cả 200 ca).

---

## 4. Kế Hoạch Triển Khai
1. Nâng cấp `src/lib/woodDecomposer.ts` với thuật toán phân rã động toán học.
2. Xây dựng ICPC Test Suite Generator & Validator trong `src/lib/cp/icpcStressTester.ts`.
3. Viết test suite `src/lib/__tests__/woodCuttingICPCStress.test.ts`.
4. Chạy toàn bộ test và commit lên `dev`.
