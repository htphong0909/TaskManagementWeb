# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc và chi tiết công việc khi chuyển tab, giới hạn chiều cao popover, bẻ dòng URL dài có chọn lọc không bẻ dòng văn bản thường, mặc định mở tab Preview khi mở Modal, tăng tốc độ đóng/mở popover, và chèn hộp thoại xem ảnh phóng to Lightbox.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc và chi tiết công việc, bao gồm dependencies `isDescPreview` và `isPreviewMode`.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto` và biến đổi mô tả công việc thành auto-save khi blur, không dùng nút bấm, render bằng `marked`, loại bỏ class transition để hiển thị tức thì, hỗ trợ phóng to ảnh qua Lightbox và bắt click ảnh bằng event delegation.
- Cập nhật [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) rút ngắn thời gian timeout chờ đóng popover từ `200ms` xuống `100ms`.
- Cập nhật [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để mô tả công việc và chi tiết công việc hỗ trợ nút Soạn thảo / Xem trước (cả 2 đều mặc định mở Xem trước), render bằng `marked`, bổ sung toolbar chèn ảnh và dán ảnh. Thêm Lightbox modal và bắt click ảnh bằng event delegation trên các preview divs, hỗ trợ nhấp ảnh đính kèm để mở Lightbox.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng chọn lọc.

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Cập nhật CardPopover.tsx hỗ trợ Lightbox phóng to ảnh

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Định nghĩa state lightboxImageUrl**

Thêm state vào đầu component:

```typescript
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
```

- [ ] **Step 2: Cập nhật danh sách file đính kèm trong CardPopover JSX**

Hiển thị nút `<button>` mở Lightbox nếu tệp tin đính kèm là ảnh:

```tsx
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 p-2 rounded-xl text-xs transition duration-150">
              {att.mime_type?.startsWith("image/") ? (
                <button
                  onClick={() => setLightboxImageUrl(att.url)}
                  className="flex items-center gap-2 text-slate-650 hover:text-violet-650 font-medium truncate flex-1 text-left cursor-pointer"
                >
                  <span>{getFileIcon(att.mime_type)}</span>
                  <span className="truncate">{att.name}</span>
                </button>
              ) : (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-violet-650 font-medium truncate flex-1"
                >
                  <span>{getFileIcon(att.mime_type)}</span>
                  <span className="truncate">{att.name}</span>
                </a>
              )}
```

- [ ] **Step 3: Cập nhật Markdown Preview click handler và render Lightbox ở cuối CardPopover JSX**

Bổ sung click delegation cho preview div của Mô tả:

```tsx
        ) : (
          <div
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === "IMG") {
                e.stopPropagation();
                setLightboxImageUrl((target as HTMLImageElement).src);
              } else {
                setIsEditingDesc(true);
              }
            }}
            className="p-3 rounded-xl border border-slate-100 hover:border-violet-200 bg-slate-50/20 hover:bg-white transition cursor-pointer text-xs font-normal markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(card.content || "") }}
          />
        )}
```

Và thêm render Lightbox JSX vào cuối tệp:

```tsx
      {/* Lightbox Modal */}
      {lightboxImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 text-sm font-semibold flex items-center gap-1 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              ✕ Đóng
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={lightboxImageUrl} 
              alt="Zoomed" 
              className="rounded-xl object-contain max-w-[90vw] max-h-[80vh] shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
```

- [ ] **Step 4: Commit thay đổi CardPopover.tsx**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: add image lightbox zoom feature to CardPopover description and attachments"
```

---

### Task 2: Cập nhật CardDetailModal.tsx hỗ trợ Lightbox phóng to ảnh

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Định nghĩa state lightboxImageUrl**

Thêm state vào đầu component:

```typescript
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
```

- [ ] **Step 2: Cập nhật click delegation cho preview div của Mô tả và Chi tiết**

Mô tả:
```tsx
                ) : (
                  <div
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === "IMG") {
                        e.stopPropagation();
                        setLightboxImageUrl((target as HTMLImageElement).src);
                      } else {
                        setIsDescPreview(false);
                      }
                    }}
                    className="border border-slate-200 rounded-lg p-3 bg-white min-h-16 max-w-none text-xs markdown-content cursor-pointer hover:bg-slate-50/30 transition duration-150"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                )}
```

Chi tiết:
```tsx
                ) : (
                  <div
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === "IMG") {
                        e.stopPropagation();
                        setLightboxImageUrl((target as HTMLImageElement).src);
                      } else {
                        setIsPreviewMode(false);
                      }
                    }}
                    className="border border-slate-200 rounded-lg p-4 bg-white min-h-[260px] max-w-none text-xs markdown-content cursor-pointer hover:bg-slate-50/30 transition duration-150"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(details) }}
                  />
                )}
```

- [ ] **Step 3: Cập nhật danh sách file đính kèm trong CardDetailModal JSX**

Hiển thị nút `<button>` mở Lightbox nếu tệp tin đính kèm là ảnh:

```tsx
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg text-xs">
                      {att.mime_type?.startsWith("image/") ? (
                        <button
                          onClick={() => setLightboxImageUrl(att.url)}
                          className="text-slate-650 hover:text-violet-650 truncate max-w-[130px] font-medium text-left cursor-pointer"
                        >
                          {att.name}
                        </button>
                      ) : (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-slate-650 hover:text-violet-650 truncate max-w-[130px] font-medium">
                          {att.name}
                        </a>
                      )}
```

- [ ] **Step 4: Thêm render Lightbox JSX vào cuối CardDetailModal JSX**

Thêm render Lightbox JSX ở cuối tệp:

```tsx
      {/* Lightbox Modal */}
      {lightboxImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 text-sm font-semibold flex items-center gap-1 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              ✕ Đóng
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={lightboxImageUrl} 
              alt="Zoomed" 
              className="rounded-xl object-contain max-w-[90vw] max-h-[80vh] shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
```

- [ ] **Step 5: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 6: Commit và push toàn bộ thay đổi**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: add image lightbox zoom feature to CardDetailModal description, details and attachments"
git push
```
