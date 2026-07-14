# Google Drive Resumable Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition file uploads from a server-mediated payload to client-direct resumable uploads to bypass Vercel's 4.5MB size limit.

**Architecture:** 
1. **API Endpoints**: The upload API route will serve two commands:
   - Initiation (`POST /api/attachments/upload` with JSON body): Requests an upload session URL from Google Drive and returns it to the client.
   - Completion (`POST /api/attachments/upload?action=complete` with JSON body): Sets file permissions on Google Drive so anyone with the link can view it.
2. **Client Components**: The file attachment handlers in `CardPopover.tsx` and `CardDetailModal.tsx` will fetch the session URL, perform a binary `PUT` directly to Google Drive (tracking progress via XHR), set public permissions, and save the link to Supabase.

---

### Task 1: Update API Route for Resumable Uploads

**Files:**
- Modify: `src/app/api/attachments/upload/route.ts`

**Interfaces:**
- Consumes: JSON `{ name, mimeType, size }` or query action `complete` with `{ fileId }`.
- Produces: Google Drive session URL or confirmation of permission completion.

- [ ] **Step 1: Inspect route.ts code**
  Verify the current import statements and main `POST` method body of `src/app/api/attachments/upload/route.ts`.

- [ ] **Step 2: Update route.ts POST logic**
  Replace `POST` implementation in `src/app/api/attachments/upload/route.ts` (approx. lines 26-139) to handle initiation and completion:
  ```typescript
  export async function POST(request: Request) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      const urlObj = new URL(request.url);
      const action = urlObj.searchParams.get("action");

      // 1. Completion Action: Set Permissions
      if (action === "complete") {
        const { fileId } = await request.json();
        if (!fileId) {
          return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
        }

        // Mock mode bypass for completion
        if (!clientId || !clientSecret || !refreshToken) {
          return NextResponse.json({ success: true });
        }

        const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: "reader",
              type: "anyone",
            }),
          }
        );
        return NextResponse.json({ success: true });
      }

      // 2. Initiation Action: Create Session URL
      const { name, mimeType, size } = await request.json();
      if (!name || size === undefined) {
        return NextResponse.json({ error: "Missing name or size in request body" }, { status: 400 });
      }

      // Developer Mock Mode Fallback if config is missing
      if (!clientId || !clientSecret || !refreshToken) {
        console.warn("Missing Google Refresh Token configuration. Running in API Mock Mode.");
        return NextResponse.json({
          uploadUrl: "mock",
          mock: true,
          name,
          mimeType
        });
      }

      const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

      // Request resumable upload session from Google Drive
      const metadata: Record<string, unknown> = {
        name,
        mimeType: mimeType || "application/octet-stream",
      };
      if (folderId) {
        metadata.parents = [folderId];
      }

      const initResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,mimeType",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Upload-Content-Type": mimeType || "application/octet-stream",
            "X-Upload-Content-Length": size.toString(),
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initResponse.ok) {
        const errText = await initResponse.text();
        throw new Error(`Google Drive session initiation failed: ${errText}`);
      }

      const uploadUrl = initResponse.headers.get("Location");
      if (!uploadUrl) {
        throw new Error("Google Drive did not return a Location header for upload session");
      }

      return NextResponse.json({ uploadUrl });
    } catch (error: unknown) {
      console.error("API Upload error:", error);
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 3: Run project build**
  Verify the route changes compile fine by running `npm run build`.

- [ ] **Step 4: Commit changes**
  ```bash
  git add src/app/api/attachments/upload/route.ts
  git commit -m "feat: rewrite upload API route to support resumable uploads"
  ```

---

### Task 2: Implement Direct Upload in CardPopover

**Files:**
- Modify: `src/components/CardPopover.tsx`

**Interfaces:**
- Consumes: Direct upload API route from Task 1.
- Produces: Client-direct upload trigger with progress tracking in CardPopover.

- [ ] **Step 1: Modify file attach logic in CardPopover.tsx**
  Update the attachment upload routine inside `handleFileAttach` (approx. lines 453-503):
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
    // 2. Thực hiện tải tệp trực tiếp lên Google Drive qua PUT
    finalFileData = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadingFile(prev => prev ? { ...prev, progress: percent } : null);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Lỗi phân tích phản hồi máy chủ Google"));
          }
        } else {
          reject(new Error(xhr.statusText || "Lỗi tải tệp lên Google Drive"));
        }
      };

      xhr.onerror = () => reject(new Error("Lỗi mạng kết nối đến Google"));
      
      xhr.open("PUT", initData.uploadUrl);
      xhr.send(file);
    });

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
  
  // Chuyển đổi định dạng để phù hợp với DB schema
  const attachmentData = {
    name: finalFileData.name,
    url: finalFileData.webViewLink || finalFileData.url,
    fileId: finalFileData.id || finalFileData.fileId,
    mimeType: finalFileData.mimeType,
  };

  await handleAddAttachment(attachmentData);
  ```

- [ ] **Step 2: Commit changes**
  ```bash
  git add src/components/CardPopover.tsx
  git commit -m "feat: implement resumable direct upload in CardPopover"
  ```

---

### Task 3: Implement Direct Upload in CardDetailModal

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Interfaces:**
- Consumes: Direct upload API route from Task 1.
- Produces: Client-direct upload trigger in CardDetailModal.

- [ ] **Step 1: Add stage state support to setUploadingFile call**
  In `CardDetailModal.tsx` (approx. line 543), since the popover uses an object state `{ progress: number, stage: string }` but `CardDetailModal` currently uses a simple boolean state:
  Let's check if `uploadingFile` in `CardDetailModal` is typed as a boolean. If it's a boolean, we can either keep it as a boolean (just set it to true/false), or enrich it. Keeping it as a boolean is simpler:
  Replace upload code in `handleFileAttach` (approx. lines 546-569):
  ```typescript
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
      // 2. Thực hiện tải tệp trực tiếp lên Google Drive qua PUT
      finalFileData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error("Lỗi phân tích phản hồi máy chủ Google"));
            }
          } else {
            reject(new Error(xhr.statusText || "Lỗi tải tệp lên Google Drive"));
          }
        };

        xhr.onerror = () => reject(new Error("Lỗi mạng kết nối đến Google"));
        
        xhr.open("PUT", initData.uploadUrl);
        xhr.send(file);
      });

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
  ```

- [ ] **Step 2: Run verification and check tests**
  Run: `npm run test` and `npm run build`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/components/CardDetailModal.tsx
  git commit -m "feat: implement resumable direct upload in CardDetailModal"
  ```
