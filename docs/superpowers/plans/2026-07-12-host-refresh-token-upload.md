# Lưu trữ bằng Refresh Token của Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay đổi cơ chế xác thực từ Service Account sang Host OAuth Refresh Token ở Backend, viết lại API Route upload tệp tin và tạo hướng dẫn cấu hình chi tiết cho người Host để thu thập Refresh Token.

---

### Task 1: Cập nhật Next.js API Route hỗ trợ làm mới Token bằng Refresh Token

**Files:**
- Modify: `src/app/api/attachments/upload/route.ts`

- [ ] **Step 1: Viết lại API Route**

Cập nhật `src/app/api/attachments/upload/route.ts` để đọc thông số client ID, client secret, refresh token và lấy access token thông qua API refresh token chính thức của Google:

```typescript
import { NextResponse } from "next/server";

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh access token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Developer Mock Mode Fallback if config is missing
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google Refresh Token configuration. Running in API Mock Mode.");
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Google Drive multipart upload
    const metadata: Record<string, unknown> = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

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
  } catch (error: unknown) {
    console.error("API Upload error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/attachments/upload/route.ts
git commit -m "feat: migrate backend upload authentication to Host OAuth Refresh Token flow"
```

---

### Task 2: Hướng dẫn chi tiết lấy Google Refresh Token cho Host

**Files:**
- Create: `docs/superpowers/plans/2026-07-12-google-refresh-token-setup.md`

- [ ] **Step 1: Tạo tài liệu hướng dẫn setup Refresh Token**

Tạo tệp tin `docs/superpowers/plans/2026-07-12-google-refresh-token-setup.md` hướng dẫn Host lấy Client ID/Secret, cấu hình redirect URI của OAuth Playground và làm theo các bước click lấy mã Refresh Token chuẩn xác 100%.

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
