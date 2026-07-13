# Thiết kế: Cải tiến Giao diện Chi tiết Thẻ dưới dạng Modal (Card Detail Modal Enhancements)

Tài liệu này đặc tả việc thiết kế và tích hợp thêm tính năng xem/chỉnh sửa chi tiết Thẻ công việc (Card) dưới dạng Modal phủ toàn màn hình khi người dùng nhấn click vào thẻ. Tính năng bao gồm trình soạn thảo Markdown đặc biệt chèn ảnh tự động lưu trên Google Drive, bảng các Stakeholders liên quan, và mục Key Info ghi chú nhanh.

---

## 1. Cơ sở dữ liệu (Database Schema Migration)

Chúng ta cần mở rộng bảng `cards` hiện tại để lưu trữ thêm 3 vùng dữ liệu mới. Bảng `attachments` cũ lưu file PDF/Docx sẽ được giữ nguyên và tích hợp vào sidebar của Modal.

### Các cột bổ sung vào bảng `public.cards`:
- `details` (TEXT): Lưu trữ nội dung "Chi tiết công việc" dưới dạng Markdown (HackMD-style).
- `key_info` (TEXT): Lưu trữ ghi chú/lưu ý nhanh (Key Info).
- `stakeholders` (JSONB, default `'[]'::jsonb`): Lưu trữ mảng đối tượng gồm tên, vai trò và thông tin liên hệ của các stakeholder.
  - Cấu trúc dữ liệu stakeholder:
    ```typescript
    interface Stakeholder {
      id: string; // UUID sinh tự động ở Client
      name: string;
      role: string;
      email: string;
    }
    ```

### SQL Migration Script:
```sql
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS key_info TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS stakeholders JSONB DEFAULT '[]'::jsonb NOT NULL;
```

---

## 2. Thiết kế Giao diện (UI Layout & Components)

Khi click vào thẻ, chúng ta mở Modal `CardDetailModal` nằm đè lên giao diện chính. Để hỗ trợ người dùng cuộn xem nội dung linh hoạt, Modal sẽ có chiều rộng cố định (max-width: 900px), chiều cao co giãn linh hoạt (flex height) và cuộn dọc tự nhiên.

### Sơ đồ Bố cục Giao diện (2 Cột - Tỉ lệ 2:1):

```
+-------------------------------------------------------------------------------+
| [Tiêu đề Thẻ - Click để chỉnh sửa]                             (Button Đóng) |
| Cột chứa: To Do | Tạo ngày: dd/mm/yyyy                                       |
+------------------------------------------------------+------------------------+
| CỘT TRÁI (66% - Nội dung chính)                      | CỘT PHẢI (33% - Ghi chú)|
|                                                      |                        |
| 📝 MÔ TẢ CÔNG VIỆC (Tóm tắt ngắn)                    | 💡 KEY INFO (Lưu ý)   |
| +--------------------------------------------------+ | +--------------------+ |
| | [Textarea biên tập mô tả tóm tắt]                | | | [Textarea màu    | |
| +--------------------------------------------------+ | |  vàng hổ phách,    | |
|                                                      | |  co giãn chiều cao | |
| 📖 CHI TIẾT CÔNG VIỆC (Markdown / HackMD)           | |  thoải mái]        | |
| +--------------------------------------------------+ | +--------------------+ |
| | [Toolbar: Bold, Italic, Link, 🖼️ Chèn Ảnh]       | |                        |
| |                                                  | | 📎 FILE ĐÍNH KÈM     |
| | [Vùng soạn thảo (Textarea) hoặc Preview Tab]     | | +--------------------+ |
| |                                                  | | | - file1.pdf    [x] | |
| |                                                  | | | - file2.pdf    [x] | |
| +--------------------------------------------------+ | | [+ Đính kèm tệp]   | |
|                                                      | | +--------------------+ |
| 👥 STAKEHOLDERS (Các bên liên quan)                 |                        |
| +--------------------------------------------------+ |                        |
| | Tên          | Vai trò     | Email/Liên hệ| Hành | |                        |
| |--------------|-------------|--------------|------| |                        |
| | Nguyễn Văn A | PO          | nva@gmail.com|  [x] | |                        |
| | Trần Thị B   | Developer   | ttb@gmail.com|  [x] | |                        |
| |                                                  | |                        |
| | [+ Thêm người liên quan]                         | |                        |
| +--------------------------------------------------+ |                        |
+------------------------------------------------------+------------------------+
```

---

## 3. Cơ chế Xử lý Hình ảnh (Image Upload & Markdown Embed)

Ở phần **Chi tiết công việc (Markdown)**, người dùng có thể chèn ảnh tương tự HackMD:

1. **Nút "Chèn Ảnh":** Khi click sẽ mở hộp thoại chọn tệp ảnh trên máy tính.
2. **Kéo thả / Dán ảnh:** Cho phép kéo thả trực tiếp file ảnh hoặc dán ảnh từ clipboard (`onPaste` event) vào textarea.
3. **Quy trình Upload:**
   - Client gửi file ảnh lên API endpoint `/api/attachments/upload` hiện có.
   - API upload ảnh lên Google Drive của Host và trả về `fileId` cùng `webViewLink`.
   - Client chuyển đổi `fileId` này thành liên kết tải trực tiếp (direct link) để thẻ `<img>` trong HTML hiển thị được:
     `https://docs.google.com/uc?export=view&id=${fileId}`
   - Chèn cú pháp markdown hình ảnh vào đúng vị trí con trỏ chuột trong textarea soạn thảo:
     `![Tên ảnh](https://docs.google.com/uc?export=view&id=fileId)`
   - Cập nhật tự động nội dung `details` vào Supabase trong background.

---

## 4. Trình phân tích Markdown (Markdown Parser)

Để hiển thị định dạng chi tiết, chúng ta sẽ mở rộng trình render markdown tự chế (hoặc sử dụng thư viện, nhưng vì code hiện tại đang viết helper regex siêu nhẹ để render HTML an toàn, chúng ta sẽ mở rộng helper đó trong component để hỗ trợ thẻ hình ảnh `<img>`):

```javascript
// Hỗ trợ hiển thị ảnh Markdown
html = html.replace(/!\[(.*?)\]\((.*?)\)/g, "<img src='$2' alt='$1' class='max-w-full h-auto rounded-lg my-2 border border-slate-200 shadow-sm' />");
```

---

## 5. Tương tác Người dùng (UX & Interactivity)

- **Xem chi tiết:** Click chuột vào Thẻ công việc (BoardCard) thay vì chỉ hover. Hành vi hover vẫn giữ nguyên như một trình preview nhanh gọn nhẹ nếu người dùng không click.
- **Tự động lưu (Auto-save):**
  - Tất cả các trường như *Mô tả*, *Key Info*, và *Chi tiết công việc* sẽ tự động lưu khi mất focus (`onBlur`) hoặc người dùng nhấn tổ hợp phím `Ctrl + Enter` (hoặc sau một khoảng debounce).
  - Stakeholders được lưu ngay lập tức khi nhấn thêm hoặc xóa một dòng.
