# Spec - Thư Mục Đính Kèm Dạng Vách Ngăn & Sắp Xếp Hợp Nhất (Implicit Partition Attachment Folders & Unified Position Reordering)

Tài liệu thiết kế này đặc tả cơ chế quản lý thư mục và tệp đính kèm dạng **vách ngăn (partition divider)**. Cơ chế này loại bỏ hoàn toàn thuộc tính liên kết ID cứng nhắc (`folder_id`) và menu dropdown chọn thư mục. Thay vào đó, toàn bộ tệp đính kèm và thư mục được sắp xếp chung trong một danh sách hợp nhất duy nhất bằng cột `position`.

---

## 1. Nguyên lý Thiết kế (Design Principles)

1. **Thư mục là vách ngăn (Folders as Dividers)**:
   - Thư mục không phải là một container chứa phần tử con một cách vật lý trong cơ sở dữ liệu. Nó chỉ là một điểm phân giới (vách ngăn) nằm ngang chia cắt danh sách tệp đính kèm.
2. **Quy tắc thuộc về (Membership Rules - Phương án A)**:
   - Các tệp đính kèm nằm phía trên thư mục đầu tiên (nếu có) $\rightarrow$ Không thuộc thư mục nào (được hiển thị phẳng bên ngoài ở phía trên).
   - Các tệp đính kèm nằm dưới Thư mục $i$ và phía trên Thư mục $i+1$ $\rightarrow$ Thuộc Thư mục $i$.
   - Các tệp đính kèm nằm dưới Thư mục cuối cùng (thứ $N$) $\rightarrow$ Thuộc Thư mục cuối cùng.
3. **Phân loại bằng nút di chuyển (Position-based Classification)**:
   - Không còn dropdown chọn thư mục nữa.
   - Để chuyển một tệp tin vào Thư mục X, người dùng chỉ cần nhấn nút `↑` hoặc `↓` trên tệp tin đó cho đến khi nó vượt qua vách ngăn của Thư mục X.

---

## 2. Mô hình Dữ liệu & Giải thuật (Data Model & Algorithms)

### A. Truy vấn & Trộn danh sách (Merging & Sorting)
Khi tải dữ liệu từ database, frontend sẽ truy vấn cả hai bảng:
- `attachments` (sắp xếp theo `position` tăng dần)
- `attachment_folders` (sắp xếp theo `position` tăng dần)

Sau đó trộn thành một danh sách hợp nhất `merged` và sắp xếp theo vị trí:
```typescript
interface MergedItem {
  id: string;
  name: string;
  position: number;
  itemType: "file" | "folder";
  // Các trường khác tương ứng của tệp/thư mục
}

const merged = [
  ...attachments.map(a => ({ ...a, itemType: "file" as const })),
  ...folders.map(f => ({ ...f, itemType: "folder" as const }))
].sort((a, b) => {
  if (a.position !== b.position) {
    return a.position - b.position;
  }
  // Nếu vị trí bằng nhau, thư mục sẽ được ưu tiên xếp trước tệp tin
  if (a.itemType !== b.itemType) {
    return a.itemType === "folder" ? -1 : 1;
  }
  return a.id.localeCompare(b.id);
});
```

### B. Logic Phân nhóm Giao diện (UI Partitioning Logic)
Duyệt mảng `merged` từ đầu đến cuối để xây dựng cấu trúc cây hiển thị động:
- **`topFiles`**: Mảng chứa các tệp đính kèm trước khi gặp thư mục đầu tiên.
- **`folderGroups`**: Danh sách chứa các nhóm thư mục, mỗi nhóm gồm thông tin thư mục và danh sách các tệp nằm dưới nó.

```typescript
const topFiles: Attachment[] = [];
const folderGroups: { folder: AttachmentFolder; files: Attachment[] }[] = [];
let currentGroup: { folder: AttachmentFolder; files: Attachment[] } | null = null;

merged.forEach((item) => {
  if (item.itemType === "folder") {
    currentGroup = { folder: item as AttachmentFolder, files: [] };
    folderGroups.push(currentGroup);
  } else {
    const file = item as Attachment;
    if (currentGroup === null) {
      topFiles.push(file);
    } else {
      currentGroup.files.push(file);
    }
  }
});
```

---

## 3. Các Thao tác & Tương tác (User Actions & Database Sync)

### A. Thêm Tệp đính kèm mới (Upload File)
Khi người dùng tải lên một tệp tin mới, tệp tin đó sẽ mặc định được thêm vào **dưới cùng** của toàn bộ danh sách để tránh làm xáo trộn các thư mục hiện có.
- Vị trí mới: `nextPosition = merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0`.
- Chèn vào DB bảng `attachments` với `position: nextPosition` và `folder_id: null`.

### B. Tạo Thư mục mới (New Folder)
Khi người dùng tạo một thư mục mới, thư mục đó cũng được thêm vào **dưới cùng** của toàn bộ danh sách.
- Vị trí mới: `nextPosition = merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0`.
- Chèn vào DB bảng `attachment_folders` với `position: nextPosition`.

### C. Di chuyển Lên / Xuống (Move Up / Down)
Khi người dùng bấm nút `↑` hoặc `↓` trên một phần tử (bất kể là file hay thư mục):
1. Xác định vị trí `idx` của phần tử đó trong danh sách hợp nhất `merged`.
2. Xác định phần tử liền kề cần hoán đổi:
   - Di chuyển lên (`↑`): `targetIdx = idx - 1`.
   - Di chuyển xuống (`↓`): `targetIdx = idx + 1`.
3. Nếu `targetIdx` nằm ngoài biên mảng, bỏ qua.
4. Thực hiện hoán đổi giá trị `position` của 2 phần tử trong cơ sở dữ liệu:
   - Swap `merged[idx].position` và `merged[targetIdx].position`.
   - Gửi yêu cầu cập nhật lên bảng tương ứng (nếu là file cập nhật `attachments`, nếu là thư mục cập nhật `attachment_folders`).

### D. Xóa Thư mục (Delete Folder)
Khi xóa một thư mục:
- Xóa bản ghi trong bảng `attachment_folders`.
- Không cần xóa file. Các file nằm dưới thư mục bị xóa sẽ tự động thuộc về thư mục phía trên nó (hoặc trở thành tệp "Để ngoài ở trên" nếu thư mục bị xóa là thư mục đầu tiên).

---

## 4. Giao diện Người dùng (UI/UX updates)

- **Gỡ bỏ Dropdown chuyển thư mục**: Loại bỏ thẻ `<select>` khỏi thẻ tệp đính kèm.
- **Hiển thị phẳng tệp tin để ngoài**: Hiển thị các file trong `topFiles` trực tiếp dưới tiêu đề "File đính kèm" mà không có hộp bao quanh hay tiêu đề phụ.
- **Nút di chuyển lên xuống cho mọi phần tử**:
  - Tệp tin ở trên cùng mảng `merged` sẽ ẩn nút `↑`.
  - Tệp tin ở dưới cùng mảng `merged` sẽ ẩn nút `↓`.
  - Thư mục ở trên cùng mảng `merged` sẽ ẩn nút `↑`.
  - Thư mục ở dưới cùng mảng `merged` sẽ ẩn nút `↓`.
