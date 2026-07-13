# Design Spec: Sửa Lỗi Hiển Thị Ảnh Drive & Đồng Bộ Xóa File Đính Kèm Tránh File Mồ Côi

Biện pháp cải tiến giao diện chi tiết thẻ (Card) liên quan đến hiển thị hình ảnh và cơ chế quản lý file đính kèm nhằm tránh tình trạng tệp mồ côi (orphan files) trên bộ lưu trữ Google Drive.

---

## 1. Vấn đề hiện tại
- **Lỗi hiển thị ảnh Drive:** Định dạng URL `https://docs.google.com/uc?export=view&id={fileId}` bị chặn hiển thị bởi các trình duyệt hiện đại (như Chrome/Safari) do các chính sách hạn chế cookie của bên thứ ba (Third-party cookie restrictions).
- **Nguy cơ tồn tại file mồ côi:** 
  - Khi người dùng tải ảnh lên qua Markdown Editor, ảnh được tải trực tiếp lên Google Drive nhưng thông tin metadata không được lưu vào bảng `attachments`. Do đó, người dùng không biết file đó đang nằm ở đâu để quản lý hay xóa.
  - Khi xóa file đính kèm trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx), giao diện chỉ gọi lệnh xóa record trong Database của Supabase mà chưa gọi API `/api/attachments/delete` để xóa file vật lý trên Google Drive, làm lãng phí không gian lưu trữ và tạo ra file mồ côi.

---

## 2. Giải pháp kỹ thuật

### 2.1 Định dạng URL ảnh xem trước mới
Thay thế hoàn toàn định dạng link xem trước trong Markdown editor khi tải ảnh lên bằng URL thumbnail tối đa 1600px của Google Drive:
```text
https://drive.google.com/thumbnail?id={fileId}&sz=w1600
```
Định dạng này cho phép tải ảnh nhúng không cần cookie của bên thứ ba trên mọi trình duyệt.

### 2.2 Tự động đồng bộ ảnh tải lên qua Markdown vào danh sách File đính kèm
Trong các hàm xử lý upload ảnh (nút tải ảnh và dán ảnh từ clipboard), tiến hành ghi thêm bản ghi vào bảng `attachments` của Supabase:
```typescript
await supabase.from("attachments").insert([{
  card_id: cardId,
  name: fileData.name,
  url: directUrl,
  file_id: fileData.fileId,
  mime_type: fileData.mimeType
}]);
```
Nhờ đó, bất kỳ tệp ảnh nào xuất hiện trong khung chi tiết công việc cũng sẽ hiển thị ở danh sách "File đính kèm" bên cột phải.

### 2.3 Thực hiện xóa tệp vật lý trên Google Drive khi xóa File đính kèm
Cập nhật nút xóa file đính kèm trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx). Trước khi xóa bản ghi khỏi Supabase, gửi yêu cầu API xóa file trên Drive:
```typescript
if (att.file_id) {
  await fetch(`/api/attachments/delete?fileId=${att.file_id}`, {
    method: "DELETE"
  });
}
```

---

## 3. Kế hoạch kiểm thử & Xác minh
- Tải thử tệp tin ảnh qua Markdown editor bằng cách nhấn nút "Chèn ảnh từ máy" và kiểm tra xem:
  1. Hình ảnh hiển thị bình thường trong chế độ Preview.
  2. Hình ảnh xuất hiện trong danh sách "File đính kèm" bên cột phải.
- Dán thử ảnh từ clipboard để kiểm tra tính năng đồng bộ tương tự.
- Click nút xóa (thùng rác 🗑) ở một file đính kèm của card, kiểm tra API logs để chắc chắn API `/api/attachments/delete` được gọi và xóa file thành công trên Google Drive.
