# Kế hoạch đồng bộ xóa file trên Google Drive khi xóa Attachment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai thêm API Route `/api/attachments/delete` và tích hợp vào component `CardPopover` để khi người dùng xóa file đính kèm, ứng dụng tự động xóa file vật lý tương ứng trên thư mục Google Drive của Host.

---

### Task 1: Xây dựng API Route backend xóa tệp tin (`/api/attachments/delete`)

**Files:**
- [NEW] [route.ts](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/api/attachments/delete/route.ts)

- [ ] **Step 1: Viết API xóa file Google Drive**

Tạo tệp tin `src/app/api/attachments/delete/route.ts` để nhận tham số `fileId` từ query string, dùng Refresh Token lấy Access Token và gửi yêu cầu `DELETE` đến Drive API của Google:

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

export async function DELETE(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "No fileId provided" }, { status: 400 });
    }

    // If configuration is missing, mock delete
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google Refresh Token configuration. Mocking delete.");
      return NextResponse.json({ success: true, message: "Mock delete success" });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const deleteResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errText = await deleteResponse.text();
      // Báo cảnh báo nhưng không ném lỗi ngắt luồng xóa database nếu file không tồn tại trên Drive nữa
      console.warn(`Failed to delete file from Google Drive (fileId: ${fileId}): ${errText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API Delete error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit API Route**

```bash
git add src/app/api/attachments/delete/route.ts
git commit -m "feat: create backend API route to delete Google Drive files using Host credentials"
```

---

### Task 2: Tích hợp gọi API xóa vào giao diện `CardPopover`

**Files:**
- [MODIFY] [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)

- [ ] **Step 1: Cập nhật hàm `handleDeleteAttachment`**

Sửa đổi hàm `handleDeleteAttachment` trong `src/components/CardPopover.tsx` để đọc `file_id` từ đối tượng attachment, gọi API backend xóa file trên Drive trước khi xóa bản ghi trong Supabase:

```typescript
  // Xóa file đính kèm
  const handleDeleteAttachment = async (id: string) => {
    try {
      const attachmentToDelete = attachments.find(att => att.id === id);
      if (attachmentToDelete && attachmentToDelete.file_id) {
        // Gọi API backend xóa file trên Google Drive trước
        const res = await fetch(`/api/attachments/delete?fileId=${attachmentToDelete.file_id}`, {
          method: "DELETE"
        });
        if (!res.ok) {
          console.warn("Failed to delete file from Google Drive");
        }
      }

      const { error } = await supabase
        .from("attachments")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchAttachments();
    } catch (err) {
      console.error("Lỗi xóa tệp đính kèm:", err);
    }
  };
```

- [ ] **Step 2: Commit thay đổi UI**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: call Google Drive deletion API before deleting attachment row from database"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
