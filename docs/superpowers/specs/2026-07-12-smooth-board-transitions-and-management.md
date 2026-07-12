# Spec: Trải nghiệm chuyển đổi Board mượt mà & Quản lý Board nâng cao

Tài liệu này đặc tả thiết kế kỹ thuật loại bỏ hiện tượng nhấp nháy (flickering) khi chuyển board, cùng các tương tác đổi tên board (double-click) và xóa board tích hợp trong Excel Switcher.

## 1. Loại bỏ hiện tượng nhấp nháy (Smooth Transitions)

### Cơ chế hoạt động:
- Thay vì xóa sạch giao diện và hiển thị màn hình xoay tròn loading giữa mỗi lần bấm tab:
  - Dự án sẽ dùng một biến trạng thái `isFetching` (tải nền).
  - Khi người dùng nhấp sang tab Board mới:
    - Giao diện của Board cũ **vẫn được giữ nguyên** trên màn hình.
    - Cột làm việc chính được áp thuộc tính làm mờ nhẹ (`opacity-60 duration-200`) để người dùng nhận biết hệ thống đang tải.
    - Một thanh chạy tải siêu mảnh (`h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-500 absolute top-0 left-0 z-50 animate-pulse`) sẽ xuất hiện chạy ở rìa trên cùng của workspace.
    - Khi Supabase phản hồi dữ liệu của Board mới, dữ liệu mới sẽ tráo đổi vị trí tức thì và `isFetching` đổi thành `false` (giao diện lấy lại độ mờ bình thường).
- Màn hình xoay loading trung tâm (Full-page spinner) chỉ hiển thị duy nhất 1 lần khi người dùng **vừa đăng nhập vào hệ thống** (lần tải đầu tiên).

---

## 2. Quản lý Board (Excel Switcher nâng cao)

### A. Đổi tên Board bằng nhấp đúp chuột (Double-click to Rename):
- Trên mỗi tab Board ở thanh dưới cùng:
  - Thêm sự kiện `onDoubleClick`.
  - Khi người dùng nhấp đúp vào tab:
    - Tab chuyển sang trạng thái chỉnh sửa (`editingBoardId === board.id`).
    - Thay thế text hiển thị bằng một thẻ `<input>` dẹt, không viền, tự động focus (`autoFocus`), hiển thị giá trị tên bảng hiện tại.
  - Khi người dùng nhấn `Enter` hoặc click ra ngoài (`onBlur`):
    - Gửi yêu cầu cập nhật tên bảng `title` lên cơ sở dữ liệu Supabase.
    - Tắt trạng thái chỉnh sửa và hiển thị lại tên mới đã cập nhật.

### B. Xóa Board trực tiếp trên Tab:
- Khi hover chuột vào tab đang hoạt động:
  - Một biểu tượng thùng rác nhỏ (`🗑`) màu đỏ nhạt xuất hiện ở mép phải của tab.
  - Khi nhấp vào biểu tượng xóa:
    - Hiển thị một Modal xác nhận thiết kế Glassmorphism dạng popup nổi lên ở giữa màn hình.
    - Nếu người dùng chọn **Xác nhận xóa**:
      - Gửi yêu cầu xóa Board lên Supabase (do có khóa ngoại CASCADE, tất cả lists và cards liên kết sẽ tự động bị xóa trong database).
      - Sau khi xóa, chuyển hướng người dùng về trang chủ `/` để tự động điều hướng sang các board còn lại hoặc tự động khởi tạo bảng mặc định mới nếu không còn bảng nào khác.
