# Spec: Tái thiết kế màn hình Đăng nhập (Auth Page Redesign)

Đặc tả này tập trung vào việc tái thiết kế màn hình đăng nhập/đăng ký của ứng dụng `my-task-app` theo phong cách Premium Glass-Pastel và xóa bỏ tạm thời giao diện bảng công việc để chờ thiết kế chi tiết sau.

## 1. Mục tiêu
- Áp dụng triệt để phong cách giao diện sáng Glass-Pastel cho màn hình đăng nhập.
- Loại bỏ giao diện Kanban board cũ và các chức năng CRUD nhiệm vụ trong `page.tsx` để giảm thiểu độ phức tạp của code trong giai đoạn này.
- Hiển thị màn hình chào mừng đơn giản kèm nút Đăng xuất khi người dùng đăng nhập thành công.

## 2. Giao diện Đăng nhập (Centered Floating Card)
- **Nền trang:** Gradient pastel xéo mịn màng (`#fff5f5` sang `#f3f0ff` sang `#e6f0fa`), có các đốm màu phát sáng mờ ảo ở nền phía sau.
- **Form đăng nhập:** Thẻ kính mờ (`backdrop-blur-xl bg-white/70 border-white/50 shadow-xl rounded-2xl`).
- **Input Fields:** Bo góc 12px (`rounded-xl`), viền sáng nhẹ, khi focus đổi sang viền tím nhạt phát sáng (`focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40`).
- **Submit Button:** Nút gradient tím-indigo (`bg-gradient-to-r from-violet-600 to-indigo-600`), bo góc 12px, có hiệu ứng shadow-violet nhẹ.

## 3. Giao diện Chào mừng (Welcome View - Logged In)
- Hiển thị email người dùng đã đăng nhập.
- Hiển thị lời nhắn chờ: "Hệ thống quản lý công việc của bạn đang được thiết lập. Hãy quay lại sau!"
- Nút "Đăng xuất" (`border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2`).

## 4. Xác minh (Verification)
- Đảm bảo luồng đăng ký, đăng nhập và đăng xuất với Supabase hoạt động bình thường trên UI mới.
- Chạy test unit kiểm thử xem form đăng nhập hiển thị chính xác.
- Chạy lint và build để đảm bảo không lỗi cú pháp.
