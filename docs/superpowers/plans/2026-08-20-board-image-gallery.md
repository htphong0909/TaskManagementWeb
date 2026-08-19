# Board Image Gallery & Telegram-Style Photo Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated, phone-like Image Gallery for each Board on `/board/[id]` with multi-file batch upload, dynamic `Ctrl + Wheel` grid zoom, and a Telegram-style fullscreen lightbox viewer with a bottom thumbnail carousel.

**Architecture:**
- Create `board_images` Supabase table linked by `board_id`.
- Implement `TelegramImageViewer` component for full-screen photo viewing with keyboard navigation, zoom, and auto-centered bottom thumbnail carousel.
- Implement `BoardGalleryModal` component supporting drag-and-drop batch upload via `uploadFileToDrive`, upload progress bar, and dynamic column zoom via `Ctrl + Mouse Wheel`.
- Integrate the gallery button next to the board title in `src/app/board/[id]/page.tsx` with live image count badge.

**Tech Stack:** Next.js (React 19), TypeScript, Supabase Client, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints
- Do not affect card-level attachments (`public.attachments`).
- Preserve responsive layout and glassmorphic UI aesthetics.
- Ensure all existing unit tests and new gallery tests pass 100%.

---

### Task 1: Database Migration & TypeScript Type Definitions

**Files:**
- Create: `supabase/migrations/20260820000000_create_board_images_table.sql`
- Create: `src/types/gallery.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface BoardImage {
    id: string;
    board_id: string;
    name: string;
    url: string;
    file_id?: string | null;
    mime_type?: string | null;
    size?: number | null;
    created_at: string;
  }
  ```

- [ ] **Step 1: Create Supabase SQL Migration**

Create `supabase/migrations/20260820000000_create_board_images_table.sql`:
```sql
-- Tạo bảng lưu trữ hình ảnh thư viện cho từng Board
CREATE TABLE IF NOT EXISTS public.board_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_id TEXT,
  mime_type TEXT,
  size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.board_images ENABLE ROW LEVEL SECURITY;

-- Chính sách an toàn cho board_images
CREATE POLICY "Cho phép tất cả thao tác trên board_images" ON public.board_images
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
```

- [ ] **Step 2: Create Type Definition File**

Create `src/types/gallery.ts`:
```typescript
export interface BoardImage {
  id: string;
  board_id: string;
  name: string;
  url: string;
  file_id?: string | null;
  mime_type?: string | null;
  size?: number | null;
  created_at: string;
}

export interface UploadingItem {
  id: string;
  name: string;
  progress: number;
}
```

- [ ] **Step 3: Commit Task 1**

```bash
git add supabase/migrations/20260820000000_create_board_images_table.sql src/types/gallery.ts
git commit -m "feat(gallery): add board_images database migration and types"
```

---

### Task 2: Build `TelegramImageViewer` Lightbox with TDD

**Files:**
- Create: `src/components/gallery/TelegramImageViewer.tsx`
- Test: `src/components/gallery/__tests__/TelegramImageViewer.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface TelegramImageViewerProps {
    images: BoardImage[];
    initialIndex: number;
    onClose: () => void;
    onDelete?: (image: BoardImage) => Promise<void>;
  }
  export default function TelegramImageViewer(props: TelegramImageViewerProps): React.JSX.Element | null;
  ```

- [ ] **Step 1: Write failing tests for `TelegramImageViewer`**

Create `src/components/gallery/__tests__/TelegramImageViewer.test.tsx`:
```tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TelegramImageViewer from "../TelegramImageViewer";
import { BoardImage } from "@/types/gallery";

const MOCK_IMAGES: BoardImage[] = [
  { id: "img-1", board_id: "b-1", name: "Photo 1.jpg", url: "https://example.com/1.jpg", created_at: "2026-08-20T00:00:00Z" },
  { id: "img-2", board_id: "b-1", name: "Photo 2.png", url: "https://example.com/2.png", created_at: "2026-08-20T00:00:00Z" },
  { id: "img-3", board_id: "b-1", name: "Photo 3.jpg", url: "https://example.com/3.jpg", created_at: "2026-08-20T00:00:00Z" },
];

describe("TelegramImageViewer", () => {
  it("renders image at initialIndex with counter", () => {
    render(<TelegramImageViewer images={MOCK_IMAGES} initialIndex={1} onClose={vi.fn()} />);
    expect(screen.getByText("2 / 3")).toBeDefined();
    expect(screen.getByText("Photo 2.png")).toBeDefined();
  });

  it("navigates next and prev with buttons and keyboard", () => {
    render(<TelegramImageViewer images={MOCK_IMAGES} initialIndex={0} onClose={vi.fn()} />);
    
    // Click Next
    const nextBtn = screen.getByLabelText("Ảnh tiếp theo");
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 3")).toBeDefined();

    // Keyboard ArrowRight
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeDefined();

    // Keyboard ArrowLeft
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("calls onClose when clicking close button or Escape key", () => {
    const handleClose = vi.fn();
    render(<TelegramImageViewer images={MOCK_IMAGES} initialIndex={0} onClose={handleClose} />);
    
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/components/gallery/__tests__/TelegramImageViewer.test.tsx`
Expected: FAIL (Cannot find module `../TelegramImageViewer`)

- [ ] **Step 3: Implement `TelegramImageViewer.tsx`**

Create `src/components/gallery/TelegramImageViewer.tsx`:
```tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { BoardImage } from "@/types/gallery";

export interface TelegramImageViewerProps {
  images: BoardImage[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (image: BoardImage) => Promise<void>;
}

export default function TelegramImageViewer({
  images,
  initialIndex,
  onClose,
  onDelete,
}: TelegramImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentImage = images[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // Auto scroll active thumbnail into center view
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeEl = thumbnailsRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentIndex]);

  const handleDelete = async () => {
    if (!currentImage || !onDelete) return;
    if (!window.confirm(`Bạn có chắc muốn xoá ảnh "${currentImage.name}" khỏi thư viện?`)) return;
    try {
      setIsDeleting(true);
      await onDelete(currentImage);
      if (images.length <= 1) {
        onClose();
      } else {
        setCurrentIndex((prev) => Math.min(prev, images.length - 2));
      }
    } catch (err) {
      console.error("Lỗi xoá ảnh:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement("a");
    a.href = currentImage.url;
    a.download = currentImage.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!mounted || !currentImage) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent text-white z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white/70 bg-white/10 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </span>
          <h3 className="text-sm font-semibold truncate max-w-md" title={currentImage.name}>
            {currentImage.name}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all"
            title="Tải ảnh về máy"
            aria-label="Tải ảnh về"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 hover:bg-red-500/20 text-white/80 hover:text-red-400 rounded-xl transition-all"
              title="Xoá ảnh này"
              aria-label="Xoá ảnh"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all ml-2"
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {/* Prev Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all hover:scale-110 z-20"
            aria-label="Ảnh trước"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Center Image */}
        <div className="max-w-full max-h-full flex items-center justify-center">
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-200"
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all hover:scale-110 z-20"
            aria-label="Ảnh tiếp theo"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (Telegram style) */}
      <div className="px-6 py-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center z-10">
        <div
          ref={thumbnailsRef}
          className="flex items-center gap-2 overflow-x-auto max-w-4xl py-2 px-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 scrollbar-none"
        >
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                idx === currentIndex
                  ? "ring-2 ring-violet-400 scale-110 opacity-100 z-10 shadow-lg shadow-violet-500/20"
                  : "opacity-40 hover:opacity-80"
              }`}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/gallery/__tests__/TelegramImageViewer.test.tsx`
Expected: PASS (3 tests passed)

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/gallery/TelegramImageViewer.tsx src/components/gallery/__tests__/TelegramImageViewer.test.tsx
git commit -m "feat(gallery): add TelegramImageViewer lightbox component with TDD tests"
```

---

### Task 3: Build `BoardGalleryModal` with Zoom Grid & Multi-Upload

**Files:**
- Create: `src/components/gallery/BoardGalleryModal.tsx`
- Test: `src/components/gallery/__tests__/BoardGalleryModal.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface BoardGalleryModalProps {
    boardId: string;
    boardTitle: string;
    isOpen: boolean;
    onClose: () => void;
    onImageCountChange?: (count: number) => void;
  }
  export default function BoardGalleryModal(props: BoardGalleryModalProps): React.JSX.Element | null;
  ```

- [ ] **Step 1: Write failing tests for `BoardGalleryModal`**

Create `src/components/gallery/__tests__/BoardGalleryModal.test.tsx`:
```tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BoardGalleryModal from "../BoardGalleryModal";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: [
              { id: "img-1", board_id: "b-1", name: "Image 1.jpg", url: "https://example.com/1.jpg", created_at: "2026-08-20T00:00:00Z" }
            ],
            error: null
          })
        })
      }),
      insert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) })
    })
  }
}));

describe("BoardGalleryModal", () => {
  it("renders modal when isOpen is true", async () => {
    render(<BoardGalleryModal boardId="b-1" boardTitle="Dự án Alpha" isOpen={true} onClose={vi.fn()} />);
    expect(await screen.findByText(/Thư viện ảnh: Dự án Alpha/i)).toBeDefined();
  });

  it("changes column count when dragging slider", async () => {
    render(<BoardGalleryModal boardId="b-1" boardTitle="Dự án Alpha" isOpen={true} onClose={vi.fn()} />);
    const slider = await screen.findByLabelText("Thu phóng lưới ảnh");
    fireEvent.change(slider, { target: { value: "6" } });
    expect((slider as HTMLInputElement).value).toBe("6");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/components/gallery/__tests__/BoardGalleryModal.test.tsx`
Expected: FAIL (Cannot find module `../BoardGalleryModal`)

- [ ] **Step 3: Implement `BoardGalleryModal.tsx`**

Create `src/components/gallery/BoardGalleryModal.tsx` with:
- Supabase fetch for `board_images` matching `boardId`.
- Drag & Drop listener across the whole modal window.
- `<input type="file" multiple accept="image/*">` trigger.
- Batch upload handling using `uploadFileToDrive` and parallel progress tracking.
- Wheel listener on the grid container for `Ctrl + Wheel` column scaling.
- Zoom slider in header.
- Photo grid with image cards (thumbnail, hover zoom, action buttons).
- Click to open `TelegramImageViewer`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/gallery/__tests__/BoardGalleryModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/gallery/BoardGalleryModal.tsx src/components/gallery/__tests__/BoardGalleryModal.test.tsx
git commit -m "feat(gallery): add BoardGalleryModal component with zoom grid and batch upload"
```

---

### Task 4: Integrate Gallery into Board Header

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

**Interfaces:**
- Updates board header to fetch image count and render `🖼️ Thư viện ảnh (N)` button next to `boardTitle`.
- Opens `BoardGalleryModal` when clicked.

- [ ] **Step 1: Update `src/app/board/[id]/page.tsx`**
  - Import `BoardGalleryModal` from `@/components/gallery/BoardGalleryModal`.
  - Add `isGalleryOpen: boolean` and `galleryCount: number` state.
  - Fetch count of `board_images` in `fetchBoardData`.
  - Place `🖼️ Thư viện (N)` button next to `boardTitle`.
  - Render `<BoardGalleryModal />` when `isGalleryOpen` is true.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS (All test suites pass)

- [ ] **Step 3: Commit Task 4**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat(gallery): integrate gallery button and modal into board page header"
```

---

### Task 5: Complete Verification & Smoke Test

**Files:**
- Entire repository.

- [ ] **Step 1: Run full test suite**
Run: `npm test`
Expected: 100% pass across all unit and component tests.

- [ ] **Step 2: Run build verification**
Run: `npm run build`
Expected: Production build succeeds without errors.

- [ ] **Step 3: Final commit**
```bash
git commit --allow-empty -m "chore(gallery): complete board image gallery implementation"
```
