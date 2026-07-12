# Spec: Cấu trúc Board & Trình chuyển đổi dạng Excel (Board Switcher)

Tài liệu này đặc tả thiết kế hệ thống dữ liệu và giao diện người dùng cho tính năng quản lý Board (dạng Excel sheet tab) và tương tác Kanban board có hiển thị chi tiết khi hover chuột.

## 1. Cấu trúc Cơ sở dữ liệu (Supabase Schema)

### Bảng `boards`
- `id`: `uuid` (Khóa chính, tự động tạo)
- `title`: `text` (Tên Board, không được để trống)
- `background`: `text` (Tên dải màu pastel, mặc định: `from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]`)
- `user_id`: `uuid` (Tham chiếu đến `auth.users.id` để phân quyền)
- `created_at`: `timestamp`

### Bảng `lists` (Cột danh sách)
- `id`: `uuid` (Khóa chính)
- `board_id`: `uuid` (Tham chiếu đến `boards.id` với thuộc tính CASCADE delete)
- `title`: `text` (Tên cột)
- `position`: `float` (Thứ tự sắp xếp của cột, giúp kéo thả mượt mà)
- `created_at`: `timestamp`

### Bảng `cards` (Thẻ công việc)
- `id`: `uuid` (Khóa chính)
- `list_id`: `uuid` (Tham chiếu đến `lists.id` với thuộc tính CASCADE delete)
- `title`: `text` (Tiêu đề thẻ, hiển thị ở cột Kanban)
- `content`: `text` (Nội dung chi tiết thẻ, hiển thị khi hover chuột)
- `position`: `float` (Thứ tự sắp xếp của thẻ trong cột)
- `created_at`: `timestamp`

---

## 2. Giao diện Người dùng & Bố cục (Layout)

### Bố cục chung (Workspace Layout)
- Ứng dụng chạy toàn màn hình (`h-screen overflow-hidden flex flex-col`).
- Nền trang: Gradient chuyển màu pastel mịn màng.
- **Khu vực làm việc chính (Kanban Board):**
  - Chiếm 92% chiều cao màn hình.
  - Bố cục flex row, cuộn ngang (`overflow-x-auto flex-nowrap gap-6 p-6 pb-2`).
  - Mỗi cột có độ rộng cố định khoảng 20% chiều rộng màn hình (`min-w-[250px] w-[20vw] flex-shrink-0`).
- **Thanh điều hướng dưới (Bottom Switcher Bar):**
  - Chiếm 8% chiều cao màn hình, cố định ở dưới cùng.
  - **Góc trái dưới:** Danh sách các tab Board xếp cạnh nhau dẹt như Excel.
    - Tab hoạt động: Nền trắng đục mờ kính, viền nổi bật.
    - Tab không hoạt động: Nền trong suốt hơn, hơi tối nhẹ, hover vào sẽ sáng lên.
    - Nút `+` ở cuối thanh tab để nhanh chóng thêm Board mới qua một popup nhập tên nhanh.
  - **Góc phải dưới:** Thông tin tài khoản người dùng và nút Đăng xuất.

---

## 3. Tương tác đặc biệt: Hover Card Detail Popover

- **Hành vi:**
  - Ở màn hình Board, mỗi Card chỉ hiển thị Tiêu đề (`title`).
  - Khi người dùng di chuyển chuột (hover) vào Tiêu đề Card: Một khung Popup chi tiết chứa `content` sẽ xuất hiện ngay cạnh Card đó.
- **Thuật toán xác định vị trí:**
  - Khi hover, đo kích thước Card bằng `getBoundingClientRect()`.
  - Tính toán khoảng trống bên phải Card đến viền phải màn hình:
    - Nếu khoảng trống này lớn hơn chiều rộng của Popup (`320px`), hiển thị Popup ở **bên phải** Card.
    - Nếu không đủ chỗ, hiển thị Popup ở **bên trái** Card.
  - Sử dụng hiệu ứng mờ kính nhẹ nhàng (`bg-white/90 backdrop-blur-md shadow-2xl rounded-xl border border-white/40 p-4 w-80 absolute z-50 transition-all duration-150`).
