# Bảng thông tin chi tiết của Thẻ & Google Picker API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp Popover chi tiết của thẻ thành bảng tương tác: hỗ trợ biên dịch/sửa Markdown inline, đính kèm tệp Google Drive thật (hoặc Mock Drive fallback khi thiếu keys) và áp dụng cơ chế cầu nối hover.

---

### Task 1: Tạo bảng `attachments` trong cơ sở dữ liệu Supabase

**Files:**
- Create: `supabase/migrations/20260712163800_create_attachments_table.sql`

- [ ] **Step 1: Tạo file SQL migration**

Tạo file `supabase/migrations/20260712163800_create_attachments_table.sql` với câu lệnh:

```sql
-- Tạo bảng attachments lưu tệp đính kèm của thẻ
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_id TEXT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách an toàn cho attachments
CREATE POLICY "Cho phép tất cả thao tác trên attachments" ON public.attachments
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
```

- [ ] **Step 2: Áp dụng migration**

Chạy lệnh để cập nhật DB:
```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260712163800_create_attachments_table.sql
git commit -m "db: create attachments table migration with rls bypass policies"
```

---

### Task 2: Xây dựng trình nạp và quản lý Google Picker API (SDK Client Loader)

**Files:**
- Create: `src/hooks/useGooglePicker.ts`

- [ ] **Step 1: Tạo React Hook `useGooglePicker.ts`**

Tạo mới hook `src/hooks/useGooglePicker.ts` quản lý nạp thư viện Google và kích hoạt Picker. Nếu thiếu key cấu hình, hỗ trợ mở giao diện chọn file Drive giả lập (Mock Picker Mode).

```typescript
import { useState, useEffect, useCallback } from "react";

interface FilePickedData {
  name: string;
  url: string;
  fileId: string;
  mimeType: string;
}

export function useGooglePicker(onFilePicked: (file: FilePickedData) => void) {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  const isConfigured = !!(clientId && apiKey && appId);

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
        g.gapi.load("picker", () => setGapiLoaded(true));
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
          scope: "https://www.googleapis.com/auth/drive.readonly",
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error("Auth error:", response);
              return;
            }
            openPicker(response.access_token);
          },
        });
        setTokenClient(client);
        setGisLoaded(true);
      }
    };
    document.body.appendChild(gisScript);

    return () => {
      if (document.body.contains(gapiScript)) document.body.removeChild(gapiScript);
      if (document.body.contains(gisScript)) document.body.removeChild(gisScript);
    };
  }, [clientId, apiKey, appId, isConfigured]);

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

  const handlePick = useCallback(() => {
    if (!isConfigured) return false;
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: "consent" });
      return true;
    }
    return false;
  }, [tokenClient, isConfigured]);

  return { isConfigured, handlePick };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGooglePicker.ts
git commit -m "feat: implement useGooglePicker script loader hook with auth token acquisition"
```

---

### Task 3: Cập nhật component CardPopover hỗ trợ Markdown và File đính kèm

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Nâng cấp mã nguồn `src/components/CardPopover.tsx`**

Sửa đổi `src/components/CardPopover.tsx` để cung cấp giao diện hiển thị Markdown, hộp thoại soạn thảo inline, danh sách file đính kèm, tích hợp Google Picker Hook và Mock Drive Fallback Modal:

```typescript
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useGooglePicker } from "@/hooks/useGooglePicker";

interface CardPopoverProps {
  card: {
    id: string;
    title: string;
    content: string | null;
  };
  rect: DOMRect | null;
  onClose: () => void;
  onCardUpdated: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
}

export default function CardPopover({
  card,
  rect,
  onClose,
  onCardUpdated,
  onMouseEnter,
  onMouseLeave,
}: CardPopoverProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Markdown states
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState(card.content || "");

  // Mock Picker states
  const [showMockPicker, setShowMockPicker] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Nạp danh sách file đính kèm
  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("attachments")
      .select("id, name, url, mime_type")
      .eq("card_id", card.id);
    setAttachments(data || []);
  };

  useEffect(() => {
    fetchAttachments();
  }, [card.id]);

  // Cập nhật Mô tả
  const handleSaveDescription = async () => {
    try {
      const { error } = await supabase
        .from("cards")
        .update({ content: description.trim() })
        .eq("id", card.id);

      if (error) throw error;
      setIsEditingDesc(false);
      onCardUpdated();
    } catch (err) {
      console.error("Lỗi cập nhật mô tả thẻ:", err);
    }
  };

  // Thêm file đính kèm
  const handleAddAttachment = async (file: { name: string; url: string; fileId: string; mimeType: string }) => {
    try {
      const { error } = await supabase
        .from("attachments")
        .insert([
          {
            card_id: card.id,
            name: file.name,
            url: file.url,
            file_id: file.fileId,
            mime_type: file.mimeType,
          },
        ]);

      if (error) throw error;
      await fetchAttachments();
    } catch (err) {
      console.error("Lỗi đính kèm tệp:", err);
    }
  };

  // Xóa file đính kèm
  const handleDeleteAttachment = async (id: string) => {
    try {
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

  // Google Picker Integration Hook
  const { isConfigured, handlePick } = useGooglePicker(handleAddAttachment);

  const handleAttachClick = () => {
    const launched = handlePick();
    if (!launched) {
      // Nếu thiếu key cấu hình, mở Mock Picker
      setShowMockPicker(true);
    }
  };

  // Định dạng hiển thị file đính kèm
  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return "📁";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("document") || mimeType.includes("word")) return "📘";
    return "📎";
  };

  // Trình dịch Markdown Regex cục bộ siêu nhẹ
  const renderMarkdown = (text: string) => {
    if (!text) return "<span class='text-slate-400 italic'>Chưa có mô tả chi tiết cho thẻ này. Nhấp chuột để viết mô tả...</span>";

    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-800'>$1</strong>");
    // Italic
    html = html.replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>");
    // Heading 3
    html = html.replace(/^### (.*?)$/gm, "<h3 class='text-xs font-bold text-slate-800 mt-2 mb-1'>$1</h3>");
    // Heading 2
    html = html.replace(/^## (.*?)$/gm, "<h2 class='text-sm font-bold text-slate-800 mt-3 mb-1'>$1</h2>");
    // Heading 1
    html = html.replace(/^# (.*?)$/gm, "<h1 class='text-base font-bold text-slate-900 mt-3 mb-2'>$1</h1>");
    // Code block
    html = html.replace(/```(.*?)```/gs, "<pre class='bg-slate-900 text-slate-100 p-2 rounded-lg my-2 font-mono text-[10px] overflow-x-auto'>$1</pre>");
    // Lists
    html = html.replace(/^\s*-\s+(.*?)$/gm, "<li class='list-disc ml-4 my-0.5'>$1</li>");

    const paras = html.split(/\n\n+/);
    return paras.map(p => {
      if (p.trim().startsWith("<li") || p.trim().startsWith("<pre") || p.trim().startsWith("<h")) {
        return p;
      }
      return `<p class='mb-1.5 text-slate-600 leading-relaxed'>${p.replace(/\n/g, "<br/>")}</p>`;
    }).join("");
  };

  if (!rect) return null;

  const popupWidth = 360;
  const margin = 12;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const spaceOnRight = screenWidth - rect.right;
  const showOnRight = spaceOnRight > popupWidth + margin;

  const leftPosition = showOnRight 
    ? rect.right + margin 
    : rect.left - popupWidth - margin;

  const topPosition = rect.top;

  // Mock Drive files mẫu
  const mockFiles = [
    { name: "Báo cáo doanh thu Q2.pdf", fileId: "mock1", mimeType: "application/pdf", url: "https://drive.google.com/file/d/mock1" },
    { name: "Logo công ty pastel.png", fileId: "mock2", mimeType: "image/png", url: "https://drive.google.com/file/d/mock2" },
    { name: "Kế hoạch ra mắt sản phẩm.docx", fileId: "mock3", mimeType: "application/vnd.google-apps.document", url: "https://drive.google.com/file/d/mock3" },
    { name: "Thiết kế UI Dashboard.fig", fileId: "mock4", mimeType: "application/octet-stream", url: "https://drive.google.com/file/d/mock4" },
  ];

  return (
    <div
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/40 p-5 z-50 transition-all duration-200"
      style={{
        left: `${leftPosition}px`,
        top: `${topPosition}px`,
        width: `${popupWidth}px`,
      }}
    >
      {/* Header Popover */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h4 className="text-sm font-bold text-slate-800 truncate pr-4">{card.title}</h4>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 h-5 w-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* File đính kèm (Attachments Area) */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">File Đính Kèm</span>
          <button
            onClick={handleAttachClick}
            className="text-[10px] font-semibold text-violet-600 hover:text-violet-500 cursor-pointer flex items-center gap-1"
          >
            📎 Thêm đính kèm
          </button>
        </div>

        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 p-2 rounded-xl text-xs transition duration-150">
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-violet-600 font-medium truncate flex-1"
              >
                <span>{getFileIcon(att.mime_type)}</span>
                <span className="truncate">{att.name}</span>
              </a>
              <button
                onClick={() => handleDeleteAttachment(att.id)}
                className="text-slate-400 hover:text-rose-500 h-5 w-5 flex items-center justify-center rounded-full hover:bg-rose-50 transition cursor-pointer"
                title="Xóa tệp đính kèm"
              >
                🗑
              </button>
            </div>
          ))}
          {attachments.length === 0 && (
            <p className="text-[11px] text-slate-400 italic">Chưa có tệp nào được đính kèm.</p>
          )}
        </div>
      </div>

      {/* Mô tả chi tiết (Markdown Editor) */}
      <div className="space-y-2">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Mô Tả Công Việc</span>
        
        {isEditingDesc ? (
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả thẻ công việc... (Hỗ trợ Markdown)"
              className="w-full h-32 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40 font-normal leading-relaxed resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) handleSaveDescription();
                if (e.key === "Escape") setIsEditingDesc(false);
              }}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Hỗ trợ Markdown: **đậm**, *nghiêng*, - danh sách</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingDesc(false)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveDescription}
                  className="px-2.5 py-1 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 cursor-pointer shadow-sm shadow-violet-600/10"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingDesc(true)}
            className="p-3 rounded-xl border border-slate-100 hover:border-violet-200 bg-slate-50/20 hover:bg-white transition cursor-pointer text-xs font-normal"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(card.content || "") }}
          />
        )}
      </div>

      {/* Mock Drive Selection Overlay (Khi thiếu Client Keys) */}
      {showMockPicker && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🤖</span> Google Drive Mock Picker (Dev Mode)
              </h4>
              <button
                onClick={() => setShowMockPicker(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            
            {!isConfigured && (
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-[10px] text-amber-700 leading-normal mb-3">
                <strong>Chú ý:</strong> Ứng dụng đang thiếu cấu hình khóa Google (API Key/Client ID) trong <code>.env.local</code>. Bạn có thể thiết lập các biến này để kết nối với Drive thật. Dưới đây là các file mô phỏng để lập trình viên test:
              </div>
            )}

            <div className="space-y-2">
              {mockFiles.map((file) => (
                <button
                  key={file.fileId}
                  onClick={() => {
                    handleAddAttachment(file);
                    setShowMockPicker(false);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/20 text-left text-xs text-slate-700 font-medium transition cursor-pointer"
                >
                  <span className="text-base">{getFileIcon(file.mimeType)}</span>
                  <span className="truncate flex-1">{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: upgrade CardPopover to interactive popover with Markdown editor and Google Picker integration"
```

---

### Task 4: Cập nhật trang chính `/board/[id]/page.tsx` để tích hợp Hover Bridge và popover mới

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Tích hợp Hover Bridge và callbacks trong `page.tsx`**

Cập nhật `page.tsx` để thêm `useRef` lưu trữ timeout đóng Popover, các hàm kích hoạt đóng trễ và truyền các tham số tương tác mới cho `CardPopover`:

```typescript
// Thêm import useRef
import React, { useState, useEffect, useCallback, useRef } from "react";
...

// Định nghĩa trong Component
const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
  if (editingCardId === card.id) return;
  // Hủy bộ đếm thời gian nếu chuột vào thẻ khác hoặc quay lại thẻ
  if (closeTimeoutRef.current) {
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }
  const rect = event.currentTarget.getBoundingClientRect();
  setHoveredCard(card);
  setHoveredRect(rect);
};

const handleCardMouseLeave = () => {
  // Trì hoãn việc đóng Popover 200ms
  closeTimeoutRef.current = setTimeout(() => {
    setHoveredCard(null);
    setHoveredRect(null);
  }, 200);
};

const handlePopoverMouseEnter = () => {
  // Hủy lệnh đóng khi chuột di chuyển vào vùng Popover
  if (closeTimeoutRef.current) {
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }
};

const handlePopoverMouseLeave = () => {
  // Trì hoãn việc đóng Popover khi chuột rời khỏi Popover
  closeTimeoutRef.current = setTimeout(() => {
    setHoveredCard(null);
    setHoveredRect(null);
  }, 200);
};

// Dưới JSX trả về CardPopover:
{hoveredCard && hoveredRect && (
  <CardPopover
    card={hoveredCard}
    rect={hoveredRect}
    onClose={() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }}
    onCardUpdated={fetchBoardData}
    onMouseEnter={handlePopoverMouseEnter}
    onMouseLeave={handlePopoverMouseLeave}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: connect hover bridge timeouts in board page for stable card popover interactions"
```

---

### Task 5: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Chạy build sản phẩm**

Run: `npm run build`
Expected: PASS
