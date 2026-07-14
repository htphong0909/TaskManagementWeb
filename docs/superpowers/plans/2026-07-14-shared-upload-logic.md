# Centralized File Upload and Paste Image Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize resumable Google Drive file upload logic into a shared utility file, and use it to fix clipboard image pasting and task description image uploads.

**Architecture:** Create a new utility function `uploadFileToDrive` in `src/lib/upload.ts` wrapping Google Drive's resumable session initiation, chunk uploading (PUT), and public sharing permission completion. Update the frontend components `CardDetailModal.tsx` and `CardPopover.tsx` to call this utility function instead of duplicate code and obsolete POST requests.

**Tech Stack:** Next.js, React, Supabase client.

## Global Constraints
- Do not introduce breaking changes to existing Google Drive upload API endpoints.
- Maintain existing Supabase attachment insertion patterns and field naming conventions.

---

### Task 1: Create Shared Upload Utility

**Files:**
- Create: `src/lib/upload.ts`

**Interfaces:**
- Produces: `uploadFileToDrive(file: File, onProgress?: (percent: number) => void): Promise<UploadedFileResponse>`

- [ ] **Step 1: Write implementation for `uploadFileToDrive`**
  Create `src/lib/upload.ts` with the following content:
  ```typescript
  export interface UploadedFileResponse {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    url?: string;
    fileId?: string;
  }

  export async function uploadFileToDrive(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<UploadedFileResponse> {
    // 1. Initiate upload session
    const initRes = await fetch("/api/attachments/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(errText || "Không thể khởi tạo phiên tải lên");
    }

    const initData = await initRes.json();

    if (initData.mock) {
      // Mock Mode for developer fallback
      if (onProgress) {
        for (let percent = 10; percent <= 100; percent += 30) {
          onProgress(percent);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      return {
        name: file.name,
        url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
        fileId: "mock-server-" + Date.now(),
        id: "mock-server-" + Date.now(),
        mimeType: file.type || "application/octet-stream"
      };
    }

    // 2. Perform chunked upload
    const totalSize = file.size;
    let offset = 0;
    let completedData = null;
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

    while (offset < totalSize) {
      const end = Math.min(offset + CHUNK_SIZE, totalSize);
      const chunk = file.slice(offset, end);
      
      const res = await fetch("/api/attachments/upload?action=chunk", {
        method: "PUT",
        headers: {
          "x-upload-url": initData.uploadUrl,
          "x-content-range": `bytes ${offset}-${end - 1}/${totalSize}`,
          "content-type": file.type || "application/octet-stream",
        },
        body: chunk,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Tải phần tệp tại ${offset} thất bại: ${errText}`);
      }

      const result = await res.json();
      offset = end;

      if (onProgress) {
        const percent = Math.round((offset / totalSize) * 100);
        onProgress(percent);
      }

      if (result.completed) {
        completedData = result.data;
      }
    }

    if (!completedData) {
      throw new Error("Không nhận được phản hồi hoàn tất từ Google Drive");
    }

    // 3. Complete Permissions (make file public)
    const completeRes = await fetch("/api/attachments/upload?action=complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: completedData.id }),
    });

    if (!completeRes.ok) {
      console.warn("Không thể tự động chia sẻ tệp công khai");
    }

    return completedData;
  }
  ```

- [ ] **Step 2: Commit utility function**
  Run: `git add src/lib/upload.ts`
  Run: `git commit -m "feat: create centralized uploadFileToDrive utility function"`

---

### Task 2: Refactor `CardPopover.tsx`

**Files:**
- Modify: `src/components/CardPopover.tsx`

**Interfaces:**
- Consumes: `uploadFileToDrive` from `src/lib/upload`

- [ ] **Step 1: Replace chunked upload logic in `CardPopover.tsx`**
  Modify `src/components/CardPopover.tsx` to import and call `uploadFileToDrive`.
  Insert import:
  ```typescript
  import { uploadFileToDrive } from "../lib/upload";
  ```
  Replace lines 460-545 with:
  ```typescript
      try {
        const finalFileData = await uploadFileToDrive(file, (percent) => {
          setUploadingFile(prev => prev ? { ...prev, progress: percent } : null);
        });
  ```

- [ ] **Step 2: Verify and Commit**
  Run: `git add src/components/CardPopover.tsx`
  Run: `git commit -m "refactor: use shared upload utility in CardPopover"`

---

### Task 3: Refactor `CardDetailModal.tsx`

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Interfaces:**
- Consumes: `uploadFileToDrive` from `src/lib/upload`

- [ ] **Step 1: Add import and update image / file attachment logic**
  Modify `src/components/CardDetailModal.tsx` to import `uploadFileToDrive` from `../lib/upload`.
  Replace file upload, attachment, description upload, and paste handlers to call `uploadFileToDrive`.
  - In `handleFileAttach` (lines 548-627), replace with:
    ```typescript
        const finalFileData = await uploadFileToDrive(file);
    ```
  - In `handleImageAttach` (lines 655-734), replace with:
    ```typescript
        const finalFileData = await uploadFileToDrive(file);
    ```
  - In `handleDescImageAttach` (lines 781-790), replace with:
    ```typescript
        const fileData = await uploadFileToDrive(file);
        const fileId = fileData.id || fileData.fileId;
        const directUrl = `/api/attachments/proxy?fileId=${fileId}`;
        const imageMarkdown = `\n![${fileData.name}](${directUrl})\n`;
    ```
  - In `createPasteHandler` (lines 850-859), replace with:
    ```typescript
              const fileData = await uploadFileToDrive(file);
              const fileId = fileData.id || fileData.fileId;
              const directUrl = `/api/attachments/proxy?fileId=${fileId}`;
              const imageMarkdown = `\n![Pasted Image](${directUrl})\n`;
    ```

- [ ] **Step 2: Verify build and Commit**
  Run: `npm run build`
  Run: `git add src/components/CardDetailModal.tsx`
  Run: `git commit -m "fix: use shared upload utility in CardDetailModal and resolve paste image bug"`
