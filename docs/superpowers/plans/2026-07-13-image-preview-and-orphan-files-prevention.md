# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc, giới hạn chiều cao popover và bẻ dòng văn bản tránh tràn viền, đồng thời chuyển đổi mô tả công việc thành Markdown kèm auto-save.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto` và biến đổi mô tả công việc thành auto-save khi blur, không dùng nút bấm, render bằng `marked`.
- Cập nhật [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để mô tả công việc hỗ trợ nút Soạn thảo / Xem trước (mặc định mở Xem trước), render bằng `marked`.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng cho `.markdown-content`.

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Cấu hình Markdown và Auto-save cho Mô tả trong CardPopover.tsx

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Import marked vào CardPopover.tsx**

Sửa đổi phần import ở đầu tệp [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx):

```typescript
import { marked } from "marked";
```

- [ ] **Step 2: Cập nhật hàm renderMarkdown sử dụng marked**

Thay thế `renderMarkdown` cũ bằng `marked.parse`:

```typescript
  // Trình phân tích markdown using marked
  const renderMarkdown = (text: string) => {
    if (!text) return "<p class='text-slate-400 italic'>Chưa có mô tả công việc.</p>";
    return marked.parse(text, { breaks: true, gfm: true }) as string;
  };
```

- [ ] **Step 3: Cập nhật textarea Mô tả để auto-save khi onBlur**

Thay đổi phần render textarea trong JSX để lưu tự động khi mất focus (`onBlur`), loại bỏ nút Lưu/Hủy:

```tsx
        {isEditingDesc ? (
          <div ref={descEditorRef} className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Nhập mô tả thẻ công việc... (Hỗ trợ Markdown)"
              className="w-full h-32 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-950 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40 font-normal leading-relaxed resize-none break-words"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) handleSaveDescription();
                if (e.key === "Escape") setIsEditingDesc(false);
              }}
            />
          </div>
        ) : (
          <div
            onClick={() => setIsEditingDesc(true)}
            className="p-3 rounded-xl border border-slate-100 hover:border-violet-200 bg-slate-50/20 hover:bg-white transition cursor-pointer text-xs font-normal markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(card.content || "") }}
          />
        )}
```

- [ ] **Step 4: Commit thay đổi CardPopover**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: simplify CardPopover description with marked rendering and auto-save on blur"
```

---

### Task 2: Thêm chế độ Xem trước/Soạn thảo cho Mô tả trong CardDetailModal.tsx

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Định nghĩa state isDescPreview**

Thêm state quản lý chế độ Xem trước của Mô tả (mặc định là `true`):

```typescript
  const [isDescPreview, setIsDescPreview] = useState(true);
```

- [ ] **Step 2: Cập nhật giao diện Mô tả trong JSX với nút Preview/Edit và render bằng marked**

Sửa đổi phần Mô tả công việc:

```tsx
              {/* Mô tả công việc */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">📝 Mô Tả Công Việc (Markdown)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDescPreview(false)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${!isDescPreview ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Soạn thảo
                    </button>
                    <button
                      onClick={() => setIsDescPreview(true)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${isDescPreview ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Xem trước
                    </button>
                  </div>
                </div>

                {!isDescPreview ? (
                  <textarea
                    ref={descRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={() => {
                      saveField("content", content);
                    }}
                    placeholder="Nhập mô tả tóm tắt..."
                    className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-violet-400 min-h-16 resize-none break-words overflow-hidden"
                  />
                ) : (
                  <div
                    onClick={() => setIsDescPreview(false)}
                    className="border border-slate-200 rounded-lg p-3 bg-white min-h-16 max-w-none text-xs markdown-content cursor-pointer hover:bg-slate-50/30 transition duration-150"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                )}
              </div>
```

- [ ] **Step 3: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 4: Commit và push toàn bộ thay đổi**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: add markdown toggle and auto-save on blur for CardDetailModal description"
git push
```
