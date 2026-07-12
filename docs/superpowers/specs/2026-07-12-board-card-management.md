# Spec: Quản lý Thẻ công việc (Cards Management)

Tài liệu này đặc tả thiết kế kỹ thuật cho việc hiển thị thẻ, thêm thẻ mới (kèm chọn deadline), sửa tiêu đề thẻ trực tiếp (inline) và xóa thẻ.

## 1. Cấu trúc dữ liệu mở rộng (Supabase Database Update)
- Bổ sung cột `due_date` vào bảng `cards` hiện tại:
  - Tên cột: `due_date`
  - Kiểu dữ liệu: `TIMESTAMP WITH TIME ZONE` (có thể null).
- Script Migration:
  ```sql
  ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
  ```

---

## 2. Giao diện hiển thị của Thẻ (Card UI/UX)
Mỗi thẻ được thiết kế là một Card mờ đục với các trường thông tin:
- **Góc trái trên (Ngày tạo):** Định dạng `DD/MM/YYYY` (ví dụ: `12/07/2026`), font `text-[10px] text-slate-400 font-medium`.
- **Chính giữa (Tiêu đề):** Tiêu đề thẻ (`title`), căn lề trái, `text-xs font-semibold text-slate-700 select-none break-words line-clamp-2`.
- **Góc trái dưới (Deadline):** Nhãn hiển thị ngày giờ cụ thể (`Giờ:Phút - Ngày/Tháng/Năm`).
  - Định dạng hiển thị: `15:30 - 12/07/2026`.
  - Phân loại màu sắc khẩn cấp:
    - *Quá hạn (due_date < hiện tại):* Chữ đỏ, nền hồng nhạt (`text-rose-600 bg-rose-50 border-rose-100`).
    - *Sắp đến hạn (trong vòng 24 giờ tới):* Chữ cam, nền vàng cam nhạt (`text-amber-600 bg-amber-50 border-amber-100`).
    - *Còn nhiều thời gian:* Chữ tím, nền tím nhạt (`text-violet-600 bg-violet-50 border-violet-100`).

---

## 3. Các Tương tác Quản lý Thẻ (Card Operations)

### A. Thêm thẻ mới (Add Card):
- Nút `+ Thêm thẻ` xuất hiện ở cuối mỗi cột. Click vào sẽ mở ra form nhập liệu trực tiếp trong cột:
  - Input 1: Ô nhập Tiêu đề.
  - Input 2: Ô chọn thời hạn Deadline (`input type="datetime-local"`).
  - Nút bấm `Thêm thẻ` và nút hủy `✕`.
- Logic:
  - Khi lưu, tính toán `position` của card bằng `max(position thẻ cũ trong cột) + 1000`.
  - Thực hiện gọi Supabase insert dòng mới.

### B. Sửa tiêu đề thẻ (Double-click to Rename):
- Nhấp đúp chuột (double-click) vào thẻ sẽ chuyển tiêu đề thẻ đó sang dạng `<input>` chỉnh sửa trực tiếp.
- Khi người dùng nhấn `Enter` hoặc click ra ngoài (`onBlur`), lưu tiêu đề mới lên Supabase và quay lại giao diện chữ tĩnh.

### C. Xóa thẻ (Delete Card):
- Khi di chuột (hover) vào thẻ, một nút xóa nhỏ hình chữ `✕` sẽ xuất hiện ở góc trên bên phải của container thẻ.
- Nhấp vào nút xóa sẽ hiển thị một Hộp thoại xác nhận nhỏ (Confirm Portal) hỏi: *"Bạn có chắc chắn muốn xóa thẻ này?"*.
- Nếu đồng ý, gọi API xóa thẻ trên Supabase.
