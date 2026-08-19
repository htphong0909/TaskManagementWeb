# Design Spec: Board Image Gallery & Telegram-Style Photo Viewer

## Overview
This specification details the design for a dedicated, phone-like Image Gallery for each Board on the Task Management platform (`/board/[id]`). 
The gallery serves as a centralized photo repository per board (independent of individual card attachments), supporting multi-file batch upload, zoomable photo grid via `Ctrl + Mouse Wheel`, and a full-featured Telegram-style lightbox viewer with bottom thumbnail carousel.

---

## 1. User Requirements & Core Features

1. **Board-Scoped Photo Gallery**:
   - Each board has its own isolated collection of images stored in Supabase table `board_images`.
   - Accessible via a button placed immediately to the right of the main board title in the header: `🖼️ Thư viện ảnh (N)`.

2. **Batch Multi-Upload**:
   - Upload multiple files simultaneously using the file picker (`<input type="file" multiple accept="image/*">`) or via Drag-and-Drop onto the gallery window.
   - Leverages the existing Google Drive upload pipeline (`uploadFileToDrive` in `src/lib/upload.ts`) with upload queue and visual progress bar.

3. **Dynamic Zoomable Grid**:
   - **Ctrl + Mouse Wheel**: Dynamically scales the number of image columns per row (e.g. from 2 large columns to 8-10 dense columns).
   - **Normal Mouse Wheel**: Smooth vertical scrolling through the photo library.
   - **Zoom Slider Toolbar**: Quick slider for adjusting grid density without keyboard.

4. **Telegram-Style Image Viewer (Lightbox)**:
   - Fullscreen dark backdrop (`bg-black/90`).
   - High-resolution centered image with smooth transitions.
   - Navigation: Next / Previous buttons and Keyboard arrows (`ArrowLeft`, `ArrowRight`, `Escape`).
   - **Bottom Thumbnail Carousel**: Horizontal scrollable strip of small thumbnails with the active image highlighted and auto-centered into view.
   - Action controls: Download file, Delete image, Close.

---

## 2. Architecture & Data Model

### 2.1 Database Migration (`supabase/migrations/20260820000000_create_board_images_table.sql`)

```sql
-- Create board_images table
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

-- Enable RLS
ALTER TABLE public.board_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on board_images" ON public.board_images
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
```

### 2.2 TypeScript Type Definitions (`src/types/gallery.ts`)

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

---

## 3. UI Component Architecture

```
src/app/board/[id]/page.tsx
│
├── Header: [Board Title] -> [Gallery Trigger Button: 🖼️ Thư viện ảnh (N)]
│
├── BoardGalleryModal.tsx (Portal Modal)
│   ├── Modal Header & Controls (Count badge, Zoom slider, "+ Thêm ảnh" button, Close X)
│   ├── Upload Progress Bar (Active batch uploads)
│   ├── Drop Zone Overlay (When dragging files over modal)
│   ├── Zoomable Photo Grid (CSS Grid with dynamic column count from 2 to 10)
│   │   └── GalleryImageCard (Thumbnail, Hover actions: View, Download, Delete)
│   │
│   └── TelegramImageViewer.tsx (Fullscreen Lightbox Portal)
│       ├── Top Bar (Index counter e.g. "3 / 15", Image Name, Download & Delete buttons, Close X)
│       ├── Main Image Stage (Centered image, Prev/Next navigation buttons, Arrow keys listener)
│       └── Bottom Thumbnail Carousel (Horizontal strip of thumbnails, auto-scroll to active index)
```

---

## 4. Detailed Component Behaviors

### 4.1 `BoardGalleryModal.tsx`
- **Props**:
  - `boardId: string`
  - `boardTitle: string`
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onImageCountChange?: (count: number) => void`
- **State**:
  - `images: BoardImage[]`
  - `loading: boolean`
  - `columnCount: number` (Default: 4, bounded between 2 and 10)
  - `selectedImageIndex: number | null` (Active index for TelegramImageViewer)
  - `uploadingQueue: { id: string; name: string; progress: number }[]`
- **Ctrl + Wheel Handler**:
  ```ts
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        // Zoom in -> fewer columns (larger images)
        setColumnCount((prev) => Math.max(2, prev - 1));
      } else if (e.deltaY > 0) {
        // Zoom out -> more columns (smaller images)
        setColumnCount((prev) => Math.min(10, prev + 1));
      }
    }
  };
  ```

### 4.2 `TelegramImageViewer.tsx`
- **Props**:
  - `images: BoardImage[]`
  - `initialIndex: number`
  - `onClose: () => void`
  - `onDelete: (image: BoardImage) => Promise<void>`
- **Keyboard Shortcuts**:
  - `ArrowLeft` / `PageUp`: Navigate to previous image.
  - `ArrowRight` / `PageDown`: Navigate to next image.
  - `Escape`: Close viewer.
- **Bottom Thumbnail Strip**:
  - Renders a horizontal flex container with compact `w-14 h-14` or `w-16 h-16` thumbnails.
  - Uses `scrollIntoView({ behavior: 'smooth', inline: 'center' })` to keep the active thumbnail centered whenever the active index changes.

---

## 5. Verification & Testing

1. **Unit Tests**:
   - `BoardGalleryModal.test.tsx`:
     - Test modal open/close.
     - Test Ctrl+Wheel column resizing.
     - Test batch file upload trigger.
   - `TelegramImageViewer.test.tsx`:
     - Test next/previous image navigation via buttons & keyboard.
     - Test bottom thumbnail click navigation and active highlight.
     - Test delete and download triggers.
2. **Integration Verification**:
   - Verify image count sync with board header button.
   - Run complete `npm test` and `npm run build` test suite.
