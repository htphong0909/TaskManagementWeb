# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị ảnh Google Drive và đồng bộ hóa tải lên/xóa hình ảnh vào danh sách File đính kèm để tránh tệp mồ côi trên Drive.

**Architecture:** Cập nhật logic trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để sử dụng link thumbnail Google Drive, lưu tệp ảnh tải lên vào bảng `attachments`, và gọi API xóa Drive khi xóa tệp đính kèm.

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Không phá vỡ chức năng kéo thả hoặc dán ảnh sẵn có.

---

### Task 1: Cập nhật hàm tải hình ảnh và liên kết ảnh trong CardDetailModal.tsx

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Cập nhật hàm handleImageAttach**

Sửa đổi phần logic tải ảnh lên từ máy để lưu bản ghi vào `attachments` và đổi cấu trúc URL ảnh:

```typescript
  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload ảnh thất bại");
      const fileData = await res.json();

      // Convert Google Drive Link sang Thumbnail Direct Link
      const directUrl = `https://drive.google.com/thumbnail?id=${fileData.fileId}&sz=w1600`;
      const imageMarkdown = `\n![${fileData.name}](${directUrl})\n`;

      // 1. Lưu metadata vào bảng attachments để quản lý và tránh file mồ côi
      const { error: dbError } = await supabase
        .from("attachments")
        .insert([{
          card_id: cardId,
          name: fileData.name,
          url: directUrl,
          file_id: fileData.fileId,
          mime_type: fileData.mimeType,
        }]);
      if (dbError) throw dbError;

      // 2. Chèn vào vị trí con trỏ chuột
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newDetails = details.substring(0, start) + imageMarkdown + details.substring(end);
        setDetails(newDetails);
        await saveField("details", newDetails);
      } else {
        const newDetails = details + imageMarkdown;
        setDetails(newDetails);
        await saveField("details", newDetails);
      }
      
      // 3. Cập nhật lại thông tin thẻ
      fetchCardData();
    } catch (err) {
      alert("Lỗi chèn ảnh: " + err);
    } finally {
      setUploadingImage(false);
    }
  };
```

- [ ] **Step 2: Cập nhật sự kiện dán ảnh (handlePaste) trong useEffect**

Sửa đổi logic trong khối `handlePaste` của `useEffect` để đồng bộ lưu vào `attachments` và sửa cấu trúc URL ảnh:

```typescript
            const directUrl = `https://drive.google.com/thumbnail?id=${fileData.fileId}&sz=w1600`;
            const imageMarkdown = `\n![Pasted Image](${directUrl})\n`;

            // 1. Lưu metadata vào bảng attachments
            const { error: dbError } = await supabase
              .from("attachments")
              .insert([{
                card_id: cardId,
                name: fileData.name,
                url: directUrl,
                file_id: fileData.fileId,
                mime_type: fileData.mimeType,
              }]);
            if (dbError) throw dbError;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newDetails = details.substring(0, start) + imageMarkdown + details.substring(end);
            setDetails(newDetails);
            await saveField("details", newDetails);

            // 2. Cập nhật lại thông tin thẻ
            fetchCardData();
```

- [ ] **Step 3: Commit các sửa đổi tải ảnh lên**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: sync markdown uploaded images with attachments list and fix drive image preview URL"
```

---

### Task 2: Đồng bộ gọi API xóa Drive khi click nút xóa file đính kèm

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Cập nhật sự kiện click nút xóa File đính kèm trong JSX**

Sửa đổi nút xóa file đính kèm để gọi API xóa file trên Drive:

```tsx
                      {/* Xóa file đính kèm */}
                      <button
                        onClick={async () => {
                          if (att.file_id) {
                            // Gọi API xóa file vật lý trên Google Drive
                            const res = await fetch(`/api/attachments/delete?fileId=${att.file_id}`, {
                              method: "DELETE"
                            });
                            if (!res.ok) {
                              console.warn("Thất bại khi xóa file trên Google Drive");
                            }
                          }
                          const { error } = await supabase.from("attachments").delete().eq("id", att.id);
                          if (!error) fetchCardData();
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        🗑
                      </button>
```

- [ ] **Step 2: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 3: Commit và push toàn bộ thay đổi**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: delete physical files from Google Drive when deleting attachments"
git push
```
