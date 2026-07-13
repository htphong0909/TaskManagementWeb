# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc và chi tiết công việc khi chuyển tab, giới hạn chiều cao popover, bẻ dòng URL dài có chọn lọc không bẻ dòng văn bản thường, mặc định mở tab Preview khi mở Modal, tăng tốc độ đóng/mở popover, và chèn hộp thoại xem ảnh phóng to Lightbox có hỗ trợ zoom phím Control và render qua React Portal.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc và chi tiết công việc, bao gồm dependencies `isDescPreview` và `isPreviewMode`.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto` và biến đổi mô tả công việc thành auto-save khi blur, không dùng nút bấm, render bằng `marked`, loại bỏ class transition để hiển thị tức thì, hỗ trợ phóng to ảnh qua Lightbox được render bằng Portal và bắt click ảnh bằng event delegation. Điều chỉnh `isBusy` để chặn đóng khi Lightbox đang hiển thị.
- Cập nhật [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) rút ngắn thời gian timeout chờ đóng popover từ `200ms` xuống `100ms`.
- Cập nhật [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) để mô tả công việc và chi tiết công việc hỗ trợ nút Soạn thảo / Xem trước (cả 2 đều mặc định mở Xem trước), render bằng `marked`, bổ sung toolbar chèn ảnh và dán ảnh. Thêm Lightbox modal (hỗ trợ scale + zoom bằng phím Ctrl) được render bằng Portal và bắt click ảnh bằng event delegation trên các preview divs, hỗ trợ nhấp ảnh đính kèm để mở Lightbox.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng chọn lọc.

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Cập nhật CardPopover.tsx hỗ trợ Lightbox bằng React Portal và Zoom phím Control

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Import createPortal từ react-dom**

Sửa đổi phần import ở đầu tệp:

```typescript
import { createPortal } from "react-dom";
```

- [ ] **Step 2: Định nghĩa state lightboxImageUrl, scale và ref lightboxRef**

Thêm các state và ref vào đầu component:

```typescript
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const lightboxRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Thêm useEffect lắng nghe sự kiện wheel không passive để zoom ảnh bằng Control key**

```typescript
  // Zoom ảnh bằng phím Control + cuộn chuột
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 0.15;
        setScale((prev) => {
          let newScale = prev + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
          return Math.max(0.5, Math.min(newScale, 5));
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [lightboxImageUrl]);

  // Reset scale khi đóng/mở ảnh
  useEffect(() => {
    setScale(1);
  }, [lightboxImageUrl]);
```

- [ ] **Step 4: Cập nhật isBusy để bao gồm cả lightboxImageUrl**

```typescript
  const isBusy = uploadingFile !== null || deletingIds.length > 0 || lightboxImageUrl !== null;
```

- [ ] **Step 5: Render Lightbox Modal bằng React Portal**

```tsx
      {/* Lightbox Modal */}
      {lightboxImageUrl && typeof document !== "undefined" && createPortal(
        <div 
          ref={lightboxRef}
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
              style={{ transform: `scale(${scale})`, transition: "transform 0.1s ease-out" }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white/70 text-[10px] bg-black/30 px-3 py-1 rounded-full whitespace-nowrap">
              Giữ phím Ctrl + Cuộn chuột để phóng to/thu nhỏ
            </div>
          </div>
        </div>,
        document.body
      )}
```

- [ ] **Step 6: Commit thay đổi CardPopover.tsx**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: render popover lightbox using portal and support ctrl-scroll zoom"
```

---

### Task 2: Cập nhật CardDetailModal.tsx hỗ trợ Lightbox bằng React Portal và Zoom phím Control

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Import createPortal từ react-dom**

Sửa đổi phần import ở đầu tệp:

```typescript
import { createPortal } from "react-dom";
```

- [ ] **Step 2: Định nghĩa state scale và ref lightboxRef**

Thêm các state và ref vào đầu component:

```typescript
  const [scale, setScale] = useState(1);
  const lightboxRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Thêm useEffect lắng nghe sự kiện wheel không passive để zoom ảnh bằng Control key**

```typescript
  // Zoom ảnh bằng phím Control + cuộn chuột trong Modal
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 0.15;
        setScale((prev) => {
          let newScale = prev + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
          return Math.max(0.5, Math.min(newScale, 5));
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [lightboxImageUrl]);

  // Reset scale khi đóng/mở ảnh
  useEffect(() => {
    setScale(1);
  }, [lightboxImageUrl]);
```

- [ ] **Step 4: Cập nhật Render Lightbox Modal bằng React Portal**

```tsx
      {/* Lightbox Modal */}
      {lightboxImageUrl && typeof document !== "undefined" && createPortal(
        <div 
          ref={lightboxRef}
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
              style={{ transform: `scale(${scale})`, transition: "transform 0.1s ease-out" }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white/70 text-[10px] bg-black/30 px-3 py-1 rounded-full whitespace-nowrap">
              Giữ phím Ctrl + Cuộn chuột để phóng to/thu nhỏ
            </div>
          </div>
        </div>,
        document.body
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
git commit -m "feat: render modal lightbox using portal and support ctrl-scroll zoom"
git push
```
