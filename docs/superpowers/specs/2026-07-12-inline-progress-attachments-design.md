# Thiết kế: Đồng bộ tiến trình tải lên và xóa tệp đính kèm trực tiếp (Inline Progress)

Tài liệu này đặc tả kỹ thuật cho giải pháp đồng bộ và theo dõi tiến trình thực tế khi Tải lên (Upload) và Xóa (Delete) tệp đính kèm trực tiếp trên giao diện dòng danh sách của thẻ Kanban (Inline Progress Placeholder).

---

## 1. Thiết kế Giao diện & Trạng thái (UI/UX Design)
- **Tải lên (Upload):**
  - Hiển thị một phần tử "ảo" (Placeholder) ở đầu danh sách tệp đính kèm ngay khi người dùng chọn tệp.
  - Sử dụng đối tượng `XMLHttpRequest` thay thế cho `fetch` để lắng nghe sự kiện `xhr.upload.onprogress`.
  - Phân tách tiến trình thành 2 chặng:
    - **Chặng 1 (uploading):** Hiển thị phần trăm tải thực tế từ trình duyệt khách lên web server (ví dụ: `Đang tải: 45%`).
    - **Chặng 2 (saving):** Khi phần trăm đạt 100%, đổi nhãn hiển thị thành `Đang lưu lên Drive...` để chờ Next.js Server chuyển tệp lên Google Drive của Host và ghi nhận vào cơ sở dữ liệu Supabase.
- **Xóa (Delete):**
  - Khi người dùng nhấn nút xóa `🗑`, nút thùng rác sẽ chuyển sang trạng thái biểu tượng xoay vòng (Spinner) và bị vô hiệu hóa (disabled) để tránh click đúp.
  - Sau khi các API backend và database xóa thành công, dòng tệp đính kèm sẽ trượt biến mất.

---

## 2. Đặc tả dữ liệu (Data & Flow Specification)

### A. Trạng thái trong Component `CardPopover.tsx`
- `uploadingFile`: `null | { name: string; progress: number; stage: 'uploading' | 'saving' }`
- `deletingIds`: `string[]`

### B. Quy trình Tải lên (Upload Flow)
1. Người dùng chọn tệp.
2. Thiết lập trạng thái `uploadingFile` với tiến trình = 0 và giai đoạn = `uploading`.
3. Khởi tạo `XMLHttpRequest`, mở kết nối `POST` tới `/api/attachments/upload`.
4. Lắng nghe `xhr.upload.onprogress` để cập nhật `%` thực tế lên state `uploadingFile.progress`.
5. Khi `onprogress` đạt 100%, cập nhật `uploadingFile.stage` thành `saving`.
6. Nhận phản hồi JSON từ Server, gọi hàm ghi nhận vào Supabase `handleAddAttachment`.
7. Giải phóng `uploadingFile` về `null`.

### C. Quy trình Xóa (Delete Flow)
1. Người dùng nhấn nút xóa một tệp đính kèm.
2. Thêm ID của tệp đó vào mảng `deletingIds`.
3. Gọi API Route `DELETE /api/attachments/delete?fileId={file_id}`.
4. Chờ API phản hồi, gọi supabase delete để xóa bản ghi.
5. Tải lại danh sách tệp đính kèm.
6. Loại bỏ ID của tệp khỏi mảng `deletingIds`.
