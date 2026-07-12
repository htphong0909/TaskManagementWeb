# Spec: Hệ thống Thiết kế UI/UX Premium Glass-Pastel

Tài liệu này đặc tả phong cách thiết kế giao diện sáng (Light Theme) lấy cảm hứng từ Trello nhưng nâng cấp lên giao diện hiện đại, sử dụng hiệu ứng kính mờ (Glassmorphism) và tông màu pastel mềm mại.

## 1. Bảng màu & Hiệu ứng (Color Palette & Effects)

* **Background chính:** Gradient chéo mượt mà.
  * Tailwind: `bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]`
* **Cột danh sách (Board Columns):** Glassmorphism nhẹ nhàng để hiển thị nội dung phía sau.
  * Tailwind: `bg-white/50 backdrop-blur-lg border border-white/30 shadow-sm`
* **Thẻ công việc (Task Cards):** Màu nền trắng đục sắc nét nổi bật trên nền mờ của cột.
  * Tailwind: `bg-white border border-slate-100/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)]`
* **Màu nhấn Pastel (Accent Colors):**
  * Xanh Lavender: `#8b5cf6` (Nền nhạt: `#ede9fe`)
  * Hồng phấn: `#f472b6` (Nền nhạt: `#fce7f3`)
  * Xanh Mint: `#2dd4bf` (Nền nhạt: `#ccfbf1`)
  * Vàng sữa: `#fbbf24` (Nền nhạt: `#fef3c7`)

## 2. Hình khối & Khoảng cách (Shapes & Spacing)

* **Bo góc (Border Radius):**
  * Cột danh sách: `rounded-2xl` (16px)
  * Thẻ công việc: `rounded-xl` (12px)
  * Nút bấm & Input: `rounded-xl` (12px)
* **Khoảng cách (Spacing):**
  * Gap giữa các cột: `gap-6` (24px)
  * Padding trong cột: `p-5`
  * Padding trong thẻ: `p-4`

## 3. Tương tác vi mô (Micro-animations)

* **Hover Thẻ (Card Hover):**
  * Rê chuột: Nổi nhẹ lên, đổ bóng rộng hơn, viền chuyển sang sắc tím nhạt.
  * Tailwind: `transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(139,92,246,0.06)] hover:border-violet-200/80`
* **Trạng thái Focus (Inputs/Selects):**
  * Viền khi focus: Tím pastel nhẹ.
  * Tailwind: `focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 outline-none transition-all`
