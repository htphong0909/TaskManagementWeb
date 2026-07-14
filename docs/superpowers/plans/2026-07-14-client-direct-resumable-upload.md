# Google Drive Resumable Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition file uploads from a server-mediated payload to client-direct resumable uploads to bypass Vercel's 4.5MB size limit.

**Architecture:** 
1. **API Endpoints**: The upload API route will serve two commands:
   - Initiation (`POST /api/attachments/upload` with JSON body): Requests an upload session URL from Google Drive and returns it to the client.
   - Completion (`POST /api/attachments/upload?action=complete` with JSON body): Sets file permissions on Google Drive so anyone with the link can view it.
2. **Client Components**: The file attachment handlers in `CardPopover.tsx` and `CardDetailModal.tsx` will fetch the session URL, perform a binary `PUT` directly to Google Drive (tracking progress via XHR), set public permissions, and save the link to Supabase.

---

### Task 1: Update API Route for Chunk Uploads

**Files:**
- Modify: `src/app/api/attachments/upload/route.ts`

**Interfaces:**
- Consumes: Raw binary body on `PUT` with custom headers.
- Produces: JSON confirmation of chunk upload status.

- [ ] **Step 1: Update route.ts to support PUT method**
  Add a `PUT` handler to `src/app/api/attachments/upload/route.ts` that delegates to `POST`:
  ```typescript
  export async function PUT(request: Request) {
    return POST(request);
  }
  ```

- [ ] **Step 2: Update route.ts POST logic for chunk processing**
  Insert the chunk handling logic in the `POST` handler in `src/app/api/attachments/upload/route.ts` (approx. line 68, between step 1 completion and step 2 initiation):
  ```typescript
    // 2. Chunk Upload Action
    if (action === "chunk") {
      const uploadUrl = request.headers.get("x-upload-url");
      const contentRange = request.headers.get("x-content-range");
      const contentType = request.headers.get("content-type") || "application/octet-stream";

      if (!uploadUrl || !contentRange) {
        return NextResponse.json({ error: "Missing x-upload-url or x-content-range headers" }, { status: 400 });
      }

      // Read binary chunk from request body
      const chunkBuffer = Buffer.from(await request.arrayBuffer());

      const googleResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": contentRange,
          "Content-Type": contentType,
        },
        body: chunkBuffer,
      });

      // Google returns 308 Resume Incomplete for successful intermediate chunk uploads
      if (googleResponse.status !== 308 && !googleResponse.ok) {
        const errText = await googleResponse.text();
        throw new Error(`Google Drive chunk upload failed with status ${googleResponse.status}: ${errText}`);
      }

      if (googleResponse.status === 200 || googleResponse.status === 201) {
        const data = await googleResponse.json();
        return NextResponse.json({ completed: true, data });
      }

      return NextResponse.json({ completed: false });
    }
  ```

- [ ] **Step 3: Run project build**
  Verify the changes compile cleanly using `npm run build`.

- [ ] **Step 4: Commit changes**
  ```bash
  git add src/app/api/attachments/upload/route.ts
  git commit -m "feat: add chunk upload proxy logic to upload API route"
  ```

---

### Task 2: Implement Chunked Upload in CardPopover

**Files:**
- Modify: `src/components/CardPopover.tsx`

**Interfaces:**
- Consumes: Chunk upload API route from Task 1.
- Produces: Sequential chunked upload flow with progress tracking.

- [ ] **Step 1: Replace file upload logic in CardPopover.tsx**
  Update the attachment upload routine inside `handleFileChange` (approx. lines 460-520):
  ```typescript
      // 1. Khởi tạo session upload
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

      let finalFileData;

      if (initData.mock) {
        // Chế độ mô phỏng (Mock Mode)
        for (let percent = 10; percent <= 100; percent += 30) {
          setUploadingFile(prev => prev ? { ...prev, progress: percent } : null);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        finalFileData = {
          name: file.name,
          url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
          fileId: "mock-server-" + Date.now(),
          mimeType: file.type || "application/octet-stream"
        };
      } else {
        // 2. Thực hiện tải tệp theo từng chunk
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

          const percent = Math.round((offset / totalSize) * 100);
          setUploadingFile(prev => prev ? { ...prev, progress: percent } : null);

          if (result.completed) {
            completedData = result.data;
          }
        }

        if (!completedData) {
          throw new Error("Không nhận được phản hồi hoàn tất từ Google Drive");
        }

        finalFileData = completedData;

        // 3. Cập nhật quyền xem tệp thành công khai
        const completeRes = await fetch("/api/attachments/upload?action=complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: finalFileData.id }),
        });

        if (!completeRes.ok) {
          console.warn("Không thể tự động chia sẻ tệp công khai");
        }
      }

      setUploadingFile(prev => prev ? { ...prev, progress: 100, stage: "saving" } : null);
      
      const attachmentData = {
        name: finalFileData.name,
        url: finalFileData.webViewLink || finalFileData.url || "",
        fileId: finalFileData.id || finalFileData.fileId || "",
        mimeType: finalFileData.mimeType,
      };

      await handleAddAttachment(attachmentData);
  ```

- [ ] **Step 2: Commit changes**
  ```bash
  git add src/components/CardPopover.tsx
  git commit -m "feat: implement chunked proxy upload in CardPopover"
  ```

---

### Task 3: Implement Chunked Upload in CardDetailModal

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Interfaces:**
- Consumes: Chunk upload API route from Task 1.
- Produces: Sequential chunked upload flow for files and images in CardDetailModal.

- [ ] **Step 1: Replace file upload logic in CardDetailModal.tsx**
  Update both `handleFileAttach` and `handleImageAttach` inside `src/components/CardDetailModal.tsx` (approx. lines 543-625) with the chunked upload loop:
  ```typescript
  // File Attachments upload
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      // 1. Khởi tạo session upload
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

      let finalFileData;

      if (initData.mock) {
        // Chế độ mô phỏng (Mock Mode)
        await new Promise(resolve => setTimeout(resolve, 800));
        finalFileData = {
          name: file.name,
          url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
          fileId: "mock-server-" + Date.now(),
          mimeType: file.type || "application/octet-stream"
        };
      } else {
        // 2. Thực hiện tải tệp theo từng chunk
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

          if (result.completed) {
            completedData = result.data;
          }
        }

        if (!completedData) {
          throw new Error("Không nhận được phản hồi hoàn tất từ Google Drive");
        }

        finalFileData = completedData;

        // 3. Cập nhật quyền xem tệp thành công khai
        const completeRes = await fetch("/api/attachments/upload?action=complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: finalFileData.id }),
        });

        if (!completeRes.ok) {
          console.warn("Không thể tự động chia sẻ tệp công khai");
        }
      }

      const { error } = await supabase
        .from("attachments")
        .insert([{
          card_id: cardId,
          name: finalFileData.name,
          url: finalFileData.webViewLink || finalFileData.url,
          file_id: finalFileData.id || finalFileData.fileId,
          mime_type: finalFileData.mimeType,
          position: merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0,
        }]);

      if (error) throw error;
      fetchCardData();
    } catch (err) {
      alert("Lỗi upload file: " + err);
    } finally {
      setUploadingFile(false);
    }
  };

  // Xử lý chèn ảnh vào Markdown
  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      // 1. Khởi tạo session upload
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

      let finalFileData;

      if (initData.mock) {
        // Chế độ mô phỏng (Mock Mode)
        await new Promise(resolve => setTimeout(resolve, 800));
        finalFileData = {
          name: file.name,
          url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
          fileId: "mock-server-" + Date.now(),
          mimeType: file.type || "application/octet-stream"
        };
      } else {
        // 2. Thực hiện tải tệp theo từng chunk
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

          if (result.completed) {
            completedData = result.data;
          }
        }

        if (!completedData) {
          throw new Error("Không nhận được phản hồi hoàn tất từ Google Drive");
        }

        finalFileData = completedData;

        // 3. Cập nhật quyền xem tệp thành công khai
        const completeRes = await fetch("/api/attachments/upload?action=complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: finalFileData.id }),
        });

        if (!completeRes.ok) {
          console.warn("Không thể tự động chia sẻ tệp công khai");
        }
      }

      // Convert Google Drive Link sang API Proxy Link
      const fileId = finalFileData.id || finalFileData.fileId;
      const directUrl = `/api/attachments/proxy?fileId=${fileId}`;
      const imageMarkdown = `\n![${finalFileData.name}](${directUrl})\n`;

      // 1. Lưu metadata vào bảng attachments để quản lý và tránh file mồ côi
      const { error: dbError } = await supabase
        .from("attachments").insert([{
          card_id: cardId,
          name: finalFileData.name,
          url: directUrl,
          file_id: fileId,
          mime_type: finalFileData.mimeType,
          position: merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0,
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

- [ ] **Step 2: Run verification and check tests**
  Run: `npm run test` and `npm run build`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/components/CardDetailModal.tsx
  git commit -m "feat: implement chunked proxy upload in CardDetailModal"
  ```
