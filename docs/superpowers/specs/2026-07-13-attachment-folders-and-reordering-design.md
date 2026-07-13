# Spec - Thư Mục Đính Kèm & Sắp Xếp Kéo Thả Tệp Tin (Attachment Folders & Drag Reordering)

Tính năng này giúp người dùng phân loại tệp đính kèm trong các thẻ công việc thành các thư mục tự tạo (luôn mở rộng), đồng thời cho phép sắp xếp vị trí các thư mục và tệp bằng cách kéo thả trực quan trên cả **Card Detail Modal** và **Card Popover**.

---

## 1. Cơ sở dữ liệu (Database Schema)

Chúng ta đã tạo bảng `attachment_folders` và bổ sung các trường vào bảng `attachments`:

```sql
-- Thư mục chứa tệp đính kèm của thẻ
CREATE TABLE public.attachment_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tệp đính kèm
ALTER TABLE public.attachments 
  ADD COLUMN folder_id UUID REFERENCES public.attachment_folders(id) ON DELETE SET NULL,
  ADD COLUMN position FLOAT DEFAULT 0;
```

---

## 2. Thiết kế Giao diện người dùng (UI/UX Design)

### Kích thước tệp lớn hơn (Larger Files Display)
Do có tương tác kéo thả tệp tin qua lại giữa các thư mục, các file đính kèm sẽ được hiển thị dưới dạng thẻ lớn hơn (chiều cao ~56px) với thiết kế thanh lịch:
- Viền màu sắc tương ứng loại file (`border-slate-200`, `border-rose-200` cho PDF, v.v.).
- Shadow nhẹ, bo góc `rounded-xl`, nền màu trắng, hover sáng nhẹ.
- Hỗ trợ kéo thả bằng cách thêm thuộc tính `draggable` và nút chỉ thị kéo thả (Drag Handle - 6 chấm nhỏ) ở đầu thẻ để tương tác trực quan.

### Giao diện Thư mục (Always-Open Folders)
- Thư mục được thiết kế hiển thị dạng nhóm danh sách với Header là thanh thư mục màu xám nhạt/tím nhạt bo góc.
- Luôn mở rộng (luôn hiện tệp đính kèm bên trong, không có đóng/mở để tăng tính trực quan khi kéo thả).
- Có nút xóa thư mục (khi xóa thư mục, các file bên trong sẽ trở thành **"Chưa phân loại"** thay vì bị xóa mất).
- Có trường đổi tên thư mục nhanh (Double click vào tên thư mục để sửa hoặc click nút bút chì).

### Khu vực tệp "Chưa phân loại" (Uncategorized Files)
- Nằm ở trên cùng của danh sách tài liệu đính kèm.
- Chứa các file có `folder_id` là `null`.

### Nút tạo thư mục mới
- Thiết kế một thanh input nhỏ gọn và nút "+ Thư mục" ở dưới cùng khu vực Attachments giúp tạo nhanh thư mục mới cho thẻ.

---

## 3. Hành vi kéo thả (Drag & Drop Mechanics)

Chúng ta sử dụng HTML5 Drag and Drop API:

### A. Kéo thả Thư mục (Folder Reordering)
- Phần header của thư mục có thuộc tính `draggable`.
- Khi kéo thư mục: `e.dataTransfer.setData("text/folder-id", folderId)`.
- Khi rê thư mục qua thư mục khác: Tính toán tương quan vị trí và hoán đổi vị trí thứ tự cục bộ (Instant preview).
- Khi thả chuột: Lưu vị trí `position` mới xuống Supabase.

### B. Kéo thả File đính kèm (File Reordering & Folder Categorization)
- Mỗi thẻ file có thuộc tính `draggable`.
- Khi kéo file: `e.dataTransfer.setData("text/attachment-id", attachmentId)`.
- **Hoán đổi thứ tự trong cùng thư mục (hoặc cùng Uncategorized):**
  - Rê file A qua file B trong cùng nhóm: Tráo đổi vị trí của A và B (Hysteresis 20%-80% tương tự như kéo card).
- **Di chuyển file sang thư mục khác:**
  - Rê file A vào vùng trống của Thư mục X hoặc rê qua một file B đang nằm trong Thư mục X:
    - Cập nhật `folder_id` của file A thành `X` (hoặc `null` nếu rê vào vùng Uncategorized).
    - Cập nhật vị trí của file A vào danh sách tệp của thư mục mới (Instant preview).
- **Thả chuột (onDrop):**
  - Đồng bộ và lưu lại `folder_id` cùng `position` của các file bị thay đổi xuống Supabase.

---

## 4. Đồng bộ giữa Card Detail Modal và Card Popover
- Cả hai component đều sử dụng chung một cấu trúc dữ liệu (`folders` và `attachments`).
- Khi có bất kỳ hành động kéo thả hay sửa đổi thư mục nào trên Popover hoặc Modal, state sẽ được cập nhật cục bộ và lưu DB. Popover sẽ tự động load lại dữ liệu đính kèm mới nhất khi mở ra để đảm bảo dữ liệu đồng bộ hoàn hảo.
