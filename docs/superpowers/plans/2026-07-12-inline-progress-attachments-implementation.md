# Đồng bộ tiến trình tải lên và xóa tệp đính kèm trực tiếp (Inline Progress) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cơ chế hiển thị tiến trình tải lên và xóa tệp đính kèm trực tiếp (inline) trong component `CardPopover` nhằm đem lại trải nghiệm mượt mà, trực quan.

**Architecture:** Sử dụng XMLHttpRequest để theo dõi sự kiện tải lên ở Client, quản lý các trạng thái tải lên (`uploadingFile`) và danh sách ID đang bị xóa (`deletingIds`) để cập nhật giao diện thời gian thực.

**Tech Stack:** React, TypeScript, XMLHttpRequest API, Supabase client-side JS SDK.

---

## Global Constraints
- **Không chặn luồng dữ liệu:** Lỗi trong chặng xóa Drive không được ngăn cản việc xóa bản ghi trong database Supabase.
- **Biên dịch sạch:** Không được có cảnh báo hoặc lỗi TypeScript trong CardPopover.

---

### Task 1: Cập nhật hàm xử lý tải lên và xóa tệp trong CardPopover

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Định nghĩa các State mới**

Sửa đổi phần khai báo state của `CardPopover` trong `src/components/CardPopover.tsx` để hỗ trợ `uploadingFile` và `deletingIds`:

```typescript
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Quản lý file đang trong tiến trình upload
  const [uploadingFile, setUploadingFile] = useState<{
    name: string;
    progress: number;
    stage: "uploading" | "saving";
  } | null>(null);

  // Quản lý danh sách ID các file đang được xóa
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
```

- [ ] **Step 2: Cập nhật hàm `handleFileChange` dùng XMLHttpRequest**

Sửa đổi hàm `handleFileChange` trong `src/components/CardPopover.tsx` để gửi file qua XMLHttpRequest và cập nhật state `%` tiến trình chính xác:

```typescript
  // Xử lý upload khi chọn file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile({
      name: file.name,
      progress: 0,
      stage: "uploading"
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const fileData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadingFile(prev => prev ? { ...prev, progress: percent } : null);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Lỗi phân tích phản hồi máy chủ"));
            }
          } else {
            reject(new Error(xhr.statusText || "Lỗi tải tệp lên máy chủ"));
          }
        };

        xhr.onerror = () => reject(new Error("Lỗi mạng kết nối"));
        
        xhr.open("POST", "/api/attachments/upload");
        xhr.send(formData);
      });

      if (fileData.error) {
        throw new Error(fileData.error);
      }

      setUploadingFile(prev => prev ? { ...prev, progress: 100, stage: "saving" } : null);

      await handleAddAttachment(fileData);
    } catch (err) {
      console.error("Lỗi upload:", err);
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra trong quá trình tải lên");
    } finally {
      setUploadingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
```

- [ ] **Step 3: Cập nhật hàm `handleDeleteAttachment`**

Sửa đổi hàm `handleDeleteAttachment` trong `src/components/CardPopover.tsx` để cập nhật `deletingIds` khi bắt đầu và kết thúc quá trình xóa:

```typescript
  // Xóa file đính kèm
  const handleDeleteAttachment = async (id: string) => {
    setDeletingIds(prev => [...prev, id]);

    try {
      const attachmentToDelete = attachments.find(att => att.id === id);
      if (attachmentToDelete && attachmentToDelete.file_id) {
        // Gọi API backend xóa file trên Google Drive trước
        const res = await fetch(`/api/attachments/delete?fileId=${attachmentToDelete.file_id}`, {
          method: "DELETE"
        });
        if (!res.ok) {
          console.warn("Failed to delete file from Google Drive");
        }
      }

      const { error } = await supabase
        .from("attachments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchAttachments();
    } catch (err) {
      console.error("Lỗi xóa tệp đính kèm:", err);
    } finally {
      setDeletingIds(prev => prev.filter(item => item !== id));
    }
  };
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: implement XHR progress listener and deletion state tracking inside CardPopover"
```

---

### Task 2: Cập nhật giao diện JSX trong CardPopover

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Thêm Placeholder Upload ở đầu danh sách tệp đính kèm**

Tìm vị trí render danh sách tệp đính kèm trong `src/components/CardPopover.tsx` (dòng chứa `{attachments.map((att) => ...}`) và chèn đoạn JSX hiển thị placeholder upload ngay trước đó:

```tsx
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {uploadingFile && (
            <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 border-dashed p-2 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-violet-600 font-medium truncate flex-1">
                <svg className="animate-spin h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="truncate">{uploadingFile.name}</span>
              </div>
              <span className="text-violet-500 font-semibold ml-2 whitespace-nowrap">
                {uploadingFile.stage === "uploading" 
                  ? `Đang tải: ${uploadingFile.progress}%` 
                  : "Đang lưu lên Drive..."}
              </span>
            </div>
          )}

          {attachments.map((att) => (
```

- [ ] **Step 2: Cập nhật nút xóa hiển thị Spinner**

Tìm nút bấm xóa tệp đính kèm `🗑` trong `src/components/CardPopover.tsx` và sửa đổi để hiển thị biểu tượng Spinner quay tròn và vô hiệu hóa click khi file đó đang trong danh sách `deletingIds`:

```tsx
              <button
                onClick={() => handleDeleteAttachment(att.id)}
                disabled={deletingIds.includes(att.id)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 transition duration-150 ml-2"
              >
                {deletingIds.includes(att.id) ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
```

- [ ] **Step 3: Loại bỏ progress bar cũ**

Tìm và xóa khối hiển thị thanh tiến trình tĩnh cũ ở phía cuối dialog Popover (thường nằm gần khối `isUploading && ...`):

```typescript
// Xóa toàn bộ khối UI liên quan tới `isUploading` và `uploadPercent` cũ.
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: upgrade CardPopover JSX to display inline upload and delete progress statuses"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
