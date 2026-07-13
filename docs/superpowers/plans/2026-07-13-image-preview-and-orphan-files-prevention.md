# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc, giới hạn chiều cao popover và bẻ dòng văn bản tránh tràn viền, đồng thời chuyển đổi mô tả công việc thành Markdown kèm auto-save.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc và chi tiết công việc.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto` và biến đổi mô tả công việc thành auto-save khi blur, không dùng nút bấm, render bằng `marked`.
- Cập nhật [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để mô tả công việc hỗ trợ nút Soạn thảo / Xem trước (mặc định mở Xem trước), render bằng `marked`, bổ sung toolbar chèn ảnh và dán ảnh.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng cho `.markdown-content` và các `textarea` dùng `break-all` và `anywhere`.

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Cấu hình bẻ dòng văn bản triệt để trong globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Cập nhật CSS rules trong globals.css**

Cập nhật file [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) để bổ sung bẻ dòng triệt để cho `markdown-content` và `textarea`:

```css
.markdown-content,
.markdown-content * {
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}

textarea {
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}
```

- [ ] **Step 2: Commit globals.css**

```bash
git add src/app/globals.css
git commit -m "style: enforce aggressive word breaking for textareas and markdown preview"
```

---

### Task 2: Cập nhật CardDetailModal.tsx với 2 bộ soạn thảo đồng bộ và tự động co giãn chiều cao

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Cập nhật logic chèn ảnh từ máy cho Mô tả công việc**

Bổ sung thêm hàm `handleDescImageAttach` cho Mô tả công việc (tương tự như Chi tiết công việc):

```typescript
  const handleDescImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload ảnh thất bại");
      const fileData = await res.json();

      const directUrl = `/api/attachments/proxy?fileId=${fileData.fileId}`;
      const imageMarkdown = `\n![${fileData.name}](${directUrl})\n`;

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

      const textarea = descRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);
        setContent(newContent);
        await saveField("content", newContent);
      } else {
        const newContent = content + imageMarkdown;
        setContent(newContent);
        await saveField("content", newContent);
      }
      fetchCardData();
    } catch (err) {
      alert("Lỗi chèn ảnh: " + err);
    } finally {
      setUploadingImage(false);
    }
  };
```

- [ ] **Step 2: Cập nhật sự kiện dán ảnh (handlePaste) cho cả Mô tả và Chi tiết**

Điều chỉnh `useEffect` sự kiện `paste` để gán sự kiện cho cả `textareaRef` và `descRef`, phân biệt lưu vào `details` hay `content`:

```typescript
  // Thêm sự kiện paste ảnh trực tiếp vào cả 2 textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    const descTextarea = descRef.current;

    const createPasteHandler = (
      targetRef: React.RefObject<HTMLTextAreaElement | null>,
      currentVal: string,
      setVal: (v: string) => void,
      fieldName: "details" | "content"
    ) => {
      return async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (!file) continue;

            e.preventDefault();
            setUploadingImage(true);
            try {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
              if (!res.ok) throw new Error("Upload dán ảnh thất bại");
              const fileData = await res.json();

              const directUrl = `/api/attachments/proxy?fileId=${fileData.fileId}`;
              const imageMarkdown = `\n![Pasted Image](${directUrl})\n`;

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

              const el = targetRef.current;
              if (el) {
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const newVal = currentVal.substring(0, start) + imageMarkdown + currentVal.substring(end);
                setVal(newVal);
                await saveField(fieldName, newVal);
              } else {
                const newVal = currentVal + imageMarkdown;
                setVal(newVal);
                await saveField(fieldName, newVal);
              }
              fetchCardData();
            } catch (err) {
              alert("Lỗi dán ảnh: " + err);
            } finally {
              setUploadingImage(false);
            }
          }
        }
      };
    };

    let detailsHandler: ((e: ClipboardEvent) => void) | null = null;
    let contentHandler: ((e: ClipboardEvent) => void) | null = null;

    if (textarea && !isPreviewMode) {
      detailsHandler = createPasteHandler(textareaRef, details, setDetails, "details");
      textarea.addEventListener("paste", detailsHandler);
    }

    if (descTextarea && !isDescPreview) {
      contentHandler = createPasteHandler(descRef, content, setContent, "content");
      descTextarea.addEventListener("paste", contentHandler);
    }

    return () => {
      if (textarea && detailsHandler) {
        textarea.removeEventListener("paste", detailsHandler);
      }
      if (descTextarea && contentHandler) {
        descTextarea.removeEventListener("paste", contentHandler);
      }
    };
  }, [details, content, isPreviewMode, isDescPreview, saveField, cardId, fetchCardData]);
```

- [ ] **Step 3: Thêm logic Auto-resize cho Chi tiết công việc**

Thêm `useEffect` để co giãn chiều cao của `textareaRef` theo `details`:

```typescript
  // Tự động giãn nở chiều cao textarea Chi tiết công việc
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [details]);
```

- [ ] **Step 4: Thêm Input File Ẩn thứ hai và Cấu hình giao diện Soạn thảo của Mô tả công việc**

Thêm một ẩn input ref `descImageInputRef` cho Mô tả công việc:

```typescript
  const descImageInputRef = useRef<HTMLInputElement>(null);
```

Và thêm thẻ `<input>` vào JSX:
```tsx
      <input type="file" ref={descImageInputRef} onChange={handleDescImageAttach} accept="image/*" className="hidden" />
```

Cập nhật khối giao diện Soạn thảo Mô tả công việc trong JSX:
```tsx
                {!isDescPreview ? (
                  <div className="space-y-2">
                    {/* Toolbar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex gap-2 items-center text-xs">
                      <button
                        type="button"
                        onClick={() => descImageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-650 cursor-pointer disabled:opacity-40"
                      >
                        {uploadingImage ? "Đang upload..." : "🖼️ Chèn ảnh từ máy"}
                      </button>
                      <span className="text-[10px] text-slate-400 ml-auto italic">Kéo thả / Dán ảnh trực tiếp</span>
                    </div>

                    <textarea
                      ref={descRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onBlur={() => saveField("content", content)}
                      placeholder="Nhập mô tả tóm tắt..."
                      className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-violet-400 min-h-16 resize-none break-words overflow-hidden"
                    />
                  </div>
                ) : (
                  ...
```

- [ ] **Step 5: Xóa chiều cao min-h cố định của Chi tiết công việc textarea**

Sửa đổi textarea Chi tiết công việc trong JSX để chiều cao là `min-h-[120px] overflow-hidden`:

```tsx
                    <textarea
                      ref={textareaRef}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      onBlur={() => saveField("details", details)}
                      placeholder="Viết chi tiết kế hoạch của bạn ở đây bằng Markdown..."
                      className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-3 min-h-[120px] focus:border-violet-400 outline-none font-mono break-words overflow-hidden"
                    />
```

- [ ] **Step 6: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 7: Commit và push toàn bộ thay đổi**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: synchronize description and details editor with toolbar, auto-resize, paste, and drag-drop image upload"
git push
```
