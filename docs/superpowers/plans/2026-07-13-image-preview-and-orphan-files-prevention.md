# Image Preview and Orphan Files Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi hiển thị hình ảnh Google Drive bằng cơ chế Server-side Proxy, tự động co giãn mô tả công việc, giới hạn chiều cao popover và bẻ dòng văn bản tránh tràn viền.

**Architecture:** 
- Tạo API Route `/api/attachments/proxy` để stream ảnh từ Google Drive.
- Cập nhật URL ảnh trong [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) thành dạng proxy.
- Thêm cơ chế tự động co giãn (`auto-resize`) cho mô tả công việc.
- Cập nhật [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx) giới hạn chiều cao `max-h-[80vh] overflow-y-auto`.
- Cập nhật [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css) bẻ dòng cho `.markdown-content`.

**Tech Stack:** Next.js (React 19), Supabase, Google Drive API

## Global Constraints

- Không chứa lỗi cú pháp TypeScript.
- Bảo đảm hot reload trong Docker hoạt động trơn tru.

---

### Task 1: Tạo mới API Route Proxy ảnh `/api/attachments/proxy`

**Files:**
- Create: `src/app/api/attachments/proxy/route.ts`

- [ ] **Step 1: Tạo tệp route.ts và định nghĩa logic proxy**

Tạo file [route.ts](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/api/attachments/proxy/route.ts):

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    if (!fileId) {
      return new Response("No fileId provided", { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    // Fallback Mock Mode if config is missing
    if (!clientId || !clientSecret || !refreshToken) {
      console.warn("Missing Google configuration. Mocking proxy image.");
      // Trả về ảnh pixel trong suốt 1x1 làm fallback
      const transparentPixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      return new Response(transparentPixel, {
        headers: { "Content-Type": "image/gif" }
      });
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(`Failed to fetch file from Google Drive: ${errText}`, { status: response.status });
    }

    const mimeType = response.headers.get("Content-Type") || "application/octet-stream";
    const fileBuffer = await response.arrayBuffer();

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("API Proxy error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
```

- [ ] **Step 2: Commit API Proxy**

```bash
git add src/app/api/attachments/proxy/route.ts
git commit -m "feat: add Server-side Google Drive image API proxy route"
```

---

### Task 2: Cập nhật CardDetailModal.tsx với URL Proxy, Auto-resize mô tả, và word-wrap

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Cập nhật URL ảnh thành định dạng Proxy**

Sửa đổi dòng tạo link `directUrl` trong cả `handleImageAttach` và `handlePaste` (useEffect):

```typescript
// Sửa trong handleImageAttach
const directUrl = `/api/attachments/proxy?fileId=${fileData.fileId}`;
```

```typescript
// Sửa trong handlePaste
const directUrl = `/api/attachments/proxy?fileId=${fileData.fileId}`;
```

- [ ] **Step 2: Thêm ref và logic Auto-resize cho textarea Mô tả**

Bổ sung `useRef` cho description và `useEffect` điều khiển chiều cao:

```typescript
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Tự động giãn nở chiều cao textarea Mô tả công việc
  useEffect(() => {
    const textarea = descRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);
```

- [ ] **Step 3: Gắn ref và class break-words vào textarea Mô tả trong JSX**

Cập nhật thẻ `<textarea>` của phần Mô tả công việc:
```tsx
                <textarea
                  ref={descRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={() => saveField("content", content)}
                  placeholder="Nhập mô tả tóm tắt..."
                  className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-violet-400 min-h-16 resize-none break-words overflow-hidden"
                />
```

- [ ] **Step 4: Gắn class break-words vào các textarea khác**

Cập nhật textarea Chi tiết công việc và Key Info:
```tsx
// Chi tiết công việc
                    <textarea
                      ref={textareaRef}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      onBlur={() => saveField("details", details)}
                      placeholder="Viết chi tiết kế hoạch của bạn ở đây bằng Markdown..."
                      className="w-full text-xs text-slate-950 bg-slate-50/50 border border-slate-200 rounded-lg p-3 min-h-[220px] focus:border-violet-400 outline-none font-mono break-words"
                    />
```

```tsx
// Key Info
                  className="w-full text-xs text-slate-950 bg-transparent border-0 resize-y min-h-[160px] outline-none placeholder-amber-600/50 leading-relaxed font-sans break-words"
```

- [ ] **Step 5: Commit các thay đổi trên CardDetailModal**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: use image proxy, add auto-resize to description, and apply text wrapping in CardDetailModal"
```

---

### Task 3: Tối ưu hóa giới hạn chiều cao cho Popover di chuột (CardPopover.tsx)

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Thêm giới hạn max-h và overflow-y-auto cho Popover container**

Sửa đổi class của div bao ngoài Popover (dòng 303):

```tsx
      className="fixed bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/40 p-5 z-50 transition-all duration-200 max-h-[80vh] overflow-y-auto"
```

- [ ] **Step 2: Commit tối ưu hóa CardPopover**

```bash
git add src/components/CardPopover.tsx
git commit -m "style: add max-height and scrolling to CardPopover to avoid screen overflow"
```

---

### Task 4: Cập nhật globals.css hỗ trợ ngắt dòng và chạy kiểm thử

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Bổ sung CSS bẻ dòng cho Markdown Preview**

Thêm rules bẻ dòng vào khối `.markdown-content` trong [globals.css](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/globals.css):

```css
.markdown-content {
  word-break: break-word;
  overflow-wrap: break-word;
}
```

- [ ] **Step 2: Chạy kiểm tra lint, build và tests để xác minh**

```powershell
npm run lint
npm run build
npm run test
```

- [ ] **Step 3: Commit và push toàn bộ thay đổi**

```bash
git add src/app/globals.css
git commit -m "style: add text wrap support in globals.css for markdown preview"
git push
```
