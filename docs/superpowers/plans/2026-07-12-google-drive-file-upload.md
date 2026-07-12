# Tải file lên và xem trực tiếp trên Google Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng cho phép người dùng chọn tệp từ máy tính, tải trực tiếp lên Google Drive cá nhân của họ thông qua Drive API, lưu trữ liên kết chia sẻ vào Supabase và hiển thị trong popover chi tiết.

---

### Task 1: Nâng cấp hook `useGooglePicker.ts` hỗ trợ tải tệp (Upload)

**Files:**
- Modify: `src/hooks/useGooglePicker.ts`

- [ ] **Step 1: Cập nhật mã nguồn `useGooglePicker.ts`**

Mở rộng `useGooglePicker` để xin thêm scope `drive.file` và bổ sung hàm `handleUploadFile` sử dụng API REST gửi tệp tin nhị phân trực tiếp lên Google Drive:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";

interface FilePickedData {
  name: string;
  url: string;
  fileId: string;
  mimeType: string;
}

export function useGooglePicker(onFilePicked: (file: FilePickedData) => void) {
  const [tokenClient, setTokenClient] = useState<any>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  const isConfigured = !!(clientId && apiKey && appId);

  const openPicker = useCallback((accessToken: string) => {
    const g = window as any;
    if (!g.google || !g.google.picker) return;

    const view = new g.google.picker.DocsView(g.google.picker.ViewId.DOCS);
    view.setMimeTypes("image/*,application/pdf,application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    const picker = new g.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === g.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          const fileId = doc[g.google.picker.Document.ID];
          const name = doc[g.google.picker.Document.NAME];
          const url = doc[g.google.picker.Document.URL];
          const mimeType = doc[g.google.picker.Document.MIME_TYPE];
          onFilePicked({ name, url, fileId, mimeType });
        }
      })
      .build();
    picker.setVisible(true);
  }, [apiKey, appId, onFilePicked]);

  // Upload file cục bộ lên Google Drive
  const uploadFileToDrive = useCallback(async (file: File, accessToken: string): Promise<FilePickedData> => {
    const metadata = {
      name: file.name,
      mimeType: file.type,
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      throw new Error("Lỗi tải tệp lên Google Drive");
    }

    const data = await response.json();

    // Thiết lập quyền đọc cho mọi người có liên kết
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${data.id}/permissions`,
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
    } catch (e) {
      console.warn("Lỗi phân quyền xem file, vẫn tiếp tục:", e);
    }

    return {
      name: data.name,
      url: data.webViewLink,
      fileId: data.id,
      mimeType: data.mimeType,
    };
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    // Load api.js
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      const g = window as any;
      if (g.gapi) {
        g.gapi.load("picker", () => {});
      }
    };
    document.body.appendChild(gapiScript);

    // Load gsi/client
    const gisScript = document.createElement("script");
    gisScript.src = "https://accounts.google.com/gsi/client";
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      const g = window as any;
      if (g.google && g.google.accounts && g.google.accounts.oauth2) {
        const client = g.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly",
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error("Auth error:", response);
              return;
            }
            openPicker(response.access_token);
          },
        });
        setTokenClient(client);
      }
    };
    document.body.appendChild(gisScript);

    return () => {
      if (document.body.contains(gapiScript)) document.body.removeChild(gapiScript);
      if (document.body.contains(gisScript)) document.body.removeChild(gisScript);
    };
  }, [clientId, isConfigured, openPicker]);

  const handlePick = useCallback(() => {
    if (!isConfigured) return false;
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: "consent" });
      return true;
    }
    return false;
  }, [tokenClient, isConfigured]);

  // Thực hiện yêu cầu token và tải lên
  const handleUpload = useCallback((file: File, callback: (data: FilePickedData) => void, onError: (err: any) => void) => {
    if (!isConfigured) return false;
    const g = window as any;
    if (g.google && g.google.accounts && g.google.accounts.oauth2) {
      const uploadClient = g.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: async (response: any) => {
          if (response.error !== undefined) {
            onError(response);
            return;
          }
          try {
            const data = await uploadFileToDrive(file, response.access_token);
            callback(data);
          } catch (err) {
            onError(err);
          }
        },
      });
      uploadClient.requestAccessToken({ prompt: "consent" });
      return true;
    }
    return false;
  }, [clientId, isConfigured, uploadFileToDrive]);

  return { isConfigured, handlePick, handleUpload };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGooglePicker.ts
git commit -m "feat: expand useGooglePicker hook with multipart REST file upload and file permission API support"
```

---

### Task 2: Cập nhật CardPopover với giao diện và tính năng Tải file

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Cập nhật mã nguồn `CardPopover.tsx`**

Cập nhật giao diện đính kèm của `CardPopover.tsx` để tích hợp:
- Input ẩn `<input type="file" />`.
- Nút bấm "Tải tệp lên Drive".
- Biểu tượng nạp xoay tròn `isUploading` và quản lý Mock Upload giả lập khi chạy local chưa cấu hình key.

```typescript
// Sửa đổi trong src/components/CardPopover.tsx:
// Thêm state isUploading
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// Cập nhật hook useGooglePicker nhận thêm handleUpload
const { isConfigured, handlePick, handleUpload } = useGooglePicker(handleAddAttachment);

// Xử lý khi chọn file nhị phân từ máy tính
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);

  if (isConfigured) {
    // Tải lên Drive thật thông qua token và REST API
    const launched = handleUpload(
      file,
      async (fileData) => {
        await handleAddAttachment(fileData);
        setIsUploading(false);
      },
      (err) => {
        console.error("Upload error:", err);
        setIsUploading(false);
        alert("Lỗi tải tệp lên Google Drive. Vui lòng kiểm tra quyền xác thực.");
      }
    );
    if (!launched) setIsUploading(false);
  } else {
    // Chế độ mô phỏng Mock Upload
    let percent = 0;
    const interval = setInterval(() => {
      percent += 20;
      if (percent >= 100) {
        clearInterval(interval);
        const mockFile = {
          name: file.name,
          fileId: "mock-" + Date.now(),
          mimeType: file.type || "application/octet-stream",
          url: "https://drive.google.com/file/d/mock-" + Date.now(),
        };
        handleAddAttachment(mockFile).then(() => {
          setIsUploading(false);
        });
      }
    }, 300);
  }
};
```

*(Mã nguồn hoàn chỉnh sẽ được cập nhật chi tiết trong tệp tin)*

- [ ] **Step 2: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: integrate direct local file upload to Google Drive with progress status and mock upload fallback in CardPopover"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Chạy build sản phẩm**

Run: `npm run build`
Expected: PASS
