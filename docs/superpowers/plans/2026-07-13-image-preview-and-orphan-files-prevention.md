# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc và chi tiết công việc khi chuyển tab, giới hạn chiều cao popover, bẻ dòng URL dài có chọn lọc không bẻ dòng văn bản thường, và mặc định mở tab Preview khi mở Modal.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc và chi tiết công việc, bao gồm dependencies `isDescPreview` và `isPreviewMode`.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto` và biến đổi mô tả công việc thành auto-save khi blur, không dùng nút bấm, render bằng `marked`.
- Cập nhật [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để mô tả công việc và chi tiết công việc hỗ trợ nút Soạn thảo / Xem trước (cả 2 đều mặc định mở Xem trước), render bằng `marked`, bổ sung toolbar chèn ảnh và dán ảnh.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng chọn lọc: Văn bản và textarea bẻ dòng theo từ, chỉ liên kết `a` trong markdown bẻ dòng theo ký tự (`break-all`).

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Cấu hình bẻ dòng văn bản chọn lọc trong globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Cập nhật CSS rules trong globals.css**

Thay đổi cấu trúc bẻ dòng của [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) để tránh break-all cho văn bản thông thường và textarea, chỉ giữ break-all cho link `<a>`:

```css
.markdown-content,
.markdown-content p,
.markdown-content li,
textarea {
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.markdown-content a {
  word-break: break-all !important;
  overflow-wrap: anywhere !important;
}
```

- [ ] **Step 2: Commit globals.css**

```bash
git add src/app/globals.css
git commit -m "style: apply selective word breaking, wrapping URLs without splitting normal text"
```

---

### Task 2: Cập nhật default state và auto-resize dependencies trong CardDetailModal.tsx

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Đặt mặc định isPreviewMode và isDescPreview thành true**

Cập nhật dòng khởi tạo state:

```typescript
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isDescPreview, setIsDescPreview] = useState(true);
```

- [ ] **Step 2: Cập nhật dependencies cho auto-resize useEffects**

Đảm bảo hai `useEffect` co giãn chiều cao có chứa `isDescPreview` và `isPreviewMode` trong dependencies:

```typescript
  // Tự động giãn nở chiều cao textarea Mô tả công việc
  useEffect(() => {
    const textarea = descRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content, isDescPreview]);

  // Tự động giãn nở chiều cao textarea Chi tiết công việc
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [details, isPreviewMode]);
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
git commit -m "feat: default both editors to preview mode and trigger textarea resize on tab switch"
git push
```
