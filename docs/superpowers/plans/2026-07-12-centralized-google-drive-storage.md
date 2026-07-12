# Lưu trữ tệp tin tập trung trên Google Drive của Người host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai API Route phía Backend để xác thực bằng Google Service Account, tự động tải file đính kèm của người dùng lên một thư mục Google Drive tập trung của người host, và tinh giản frontend không cần đăng nhập Google OAuth.

---

### Task 1: Xây dựng Next.js API Route tải file lên Drive của Host

**Files:**
- Create: `src/app/api/attachments/upload/route.ts`

- [ ] **Step 1: Tạo mới API Route**

Tạo tệp tin `src/app/api/attachments/upload/route.ts` chứa code xác thực Service Account JWT bằng thư viện built-in `crypto` và thực hiện REST API upload multipart lên Google Drive:

```typescript
import { NextResponse } from "next/server";
import crypto from "crypto";

function generateJWT(email: string, privateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const signatureInput = `${base64Header}.${base64Claim}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signatureInput}.${signature}`;
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = generateJWT(email, privateKey);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to get OAuth token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let saPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Developer Mock Mode Fallback if config is missing
    if (!saEmail || !saPrivateKey || !folderId) {
      console.warn("Missing Google Service Account configuration. Running in API Mock Mode.");
      // Đọc thông tin file để giả lập trả về
      const formData = await request.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      await new Promise(resolve => setTimeout(resolve, 800));
      return NextResponse.json({
        name: file.name,
        url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
        fileId: "mock-server-" + Date.now(),
        mimeType: file.type || "application/octet-stream"
      });
    }

    if (saPrivateKey.includes("\\n")) {
      saPrivateKey = saPrivateKey.replace(/\\n/g, "\n");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const accessToken = await getAccessToken(saEmail, saPrivateKey);

    // Google Drive multipart upload
    const metadata = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      parents: [folderId],
    };

    const uploadForm = new FormData();
    uploadForm.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    uploadForm.append("file", file);

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: uploadForm,
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error(`Failed to upload to Google Drive: ${errText}`);
    }

    const data = await uploadResponse.json();

    // Set permission to anyone with link can read
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
      console.warn("Failed to set file permission:", e);
    }

    return NextResponse.json({
      name: data.name,
      url: data.webViewLink,
      fileId: data.id,
      mimeType: data.mimeType,
    });
  } catch (error: any) {
    console.error("API Upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/attachments/upload/route.ts
git commit -m "feat: implement centralized server-side Google Drive upload API route using Service Account RS256 JWT auth"
```

---

### Task 2: Cập nhật CardPopover gọi API tải tệp thẳng lên Host Drive

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Cập nhật giao diện `CardPopover.tsx`**

Thay đổi logic tải file: thay vì gọi SDK Google OAuth phía Client, chuyển sang gọi POST tới API Route `/api/attachments/upload`. Rút gọn giao diện chỉ còn 1 nút "📎 Đính kèm tệp tin" duy nhất, không yêu cầu người dùng đăng nhập Google:

```typescript
// Sửa đổi trong CardPopover.tsx:
// 1. Loại bỏ các code liên quan đến useGooglePicker hook, mockFiles và showMockPicker state.
// 2. Chuyển đổi handleFileChange thành:
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  setUploadPercent(20);

  try {
    const formData = new FormData();
    formData.append("file", file);

    setUploadPercent(50);
    const res = await fetch("/api/attachments/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Lỗi kết nối tải tệp");
    }

    setUploadPercent(90);
    const fileData = await res.json();
    if (fileData.error) {
      throw new Error(fileData.error);
    }

    await handleAddAttachment(fileData);
    setIsUploading(false);
    setUploadPercent(null);
  } catch (err: any) {
    console.error("Lỗi upload file:", err);
    setIsUploading(false);
    setUploadPercent(null);
    alert("Lỗi tải tệp lên Google Drive: " + (err.message || err));
  } finally {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};
```

*(Mã nguồn hoàn chỉnh sẽ được cập nhật chi tiết trong tệp tin)*

- [ ] **Step 2: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: simplify CardPopover attachments UI to fetch Next.js server-side upload route directly"
```

---

### Task 3: Hướng dẫn cấu hình Google Service Account (Host Setup)

**Files:**
- Create: `docs/superpowers/plans/2026-07-12-google-service-account-setup.md`

- [ ] **Step 1: Tạo file hướng dẫn cấu hình chi tiết**

Tạo tài liệu `docs/superpowers/plans/2026-07-12-google-service-account-setup.md` hướng dẫn host tạo Service Account trên Cloud Console, tải file JSON credentials và share folder trên Drive để bắt đầu chạy thực tế.

---

### Task 4: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Chạy build sản phẩm**

Run: `npm run build`
Expected: PASS
