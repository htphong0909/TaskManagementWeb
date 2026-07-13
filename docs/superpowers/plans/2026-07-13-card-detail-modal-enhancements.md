# Card Detail Modal Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm hộp thoại Modal chi tiết công việc của Card chứa mô tả, trình soạn thảo Markdown (HackMD) chèn ảnh upload lên Google Drive, bảng Stakeholders và Key Info ghi chú nhanh.

**Architecture:** Mở rộng bảng `cards` bằng SQL migration. Tạo mới component `CardDetailModal.tsx` và tích hợp vào trang Board chính, hỗ trợ tự động lưu khi mất focus (auto-save on blur) và kéo thả / upload ảnh trực tiếp lên Google Drive.

**Tech Stack:** Next.js (React 19), Supabase DB, Google Drive API, TypeScript, Tailwind CSS v4, Vitest

## Global Constraints

- TypeScript 100% không sinh lỗi compile.
- Đảm bảo RLS cho bảng `cards` vẫn hoạt động bình thường với các cột mới.

---

### Task 1: Thực hiện Database Migration

**Files:**
- Create: [20260713124500_add_detail_columns_to_cards.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260713124500_add_detail_columns_to_cards.sql)

- [ ] **Step 1: Tạo file migration SQL mới**

Tạo mới file [20260713124500_add_detail_columns_to_cards.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260713124500_add_detail_columns_to_cards.sql) với nội dung:

```sql
-- Thêm các cột lưu trữ Chi tiết, Key Info và Stakeholders vào bảng cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS key_info TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS stakeholders JSONB DEFAULT '[]'::jsonb NOT NULL;
```

- [ ] **Step 2: Áp dụng migration vào Supabase cục bộ hoặc thông báo**

Chạy lệnh migration nếu đang sử dụng Supabase CLI:
```powershell
supabase db reset
```
*(Nếu làm việc trực tiếp trên môi trường Cloud, người dùng cần chạy đoạn SQL trên trong SQL Editor của Supabase Console).*

- [ ] **Step 3: Commit migration**

```bash
git add supabase/migrations/20260713124500_add_detail_columns_to_cards.sql
git commit -m "db: add details, key_info, and stakeholders columns to cards table"
```

---

### Task 2: Tạo mới component CardDetailModal.tsx

**Files:**
- Create: [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)

- [ ] **Step 1: Định nghĩa giao diện & logic cho CardDetailModal.tsx**

Tạo mới component [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx) với đầy đủ layout 2 cột:
- Cột trái: Tiêu đề sửa nhanh, Mô tả (content), Trình soạn thảo Markdown Chi tiết (details) có nút Chèn Ảnh, Bảng các Stakeholders.
- Cột phải: Key Info ghi chú nhanh (màu vàng), Danh sách attachments.

```tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
  details: string | null;
  key_info: string | null;
  stakeholders: Stakeholder[];
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  file_id: string | null;
}

interface CardDetailModalProps {
  cardId: string;
  listTitle: string;
  onClose: () => void;
  onCardUpdated: () => void;
}

export default function CardDetailModal({
  cardId,
  listTitle,
  onClose,
  onCardUpdated,
}: CardDetailModalProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [details, setDetails] = useState("");
  const [keyInfo, setKeyInfo] = useState("");
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Stakeholder form input states
  const [newShName, setNewShName] = useState("");
  const [newShRole, setNewShRole] = useState("");
  const [newShEmail, setNewShEmail] = useState("");
  const [isAddingSh, setIsAddingSh] = useState(false);

  // Markdown Mode Toggle
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchCardData = useCallback(async () => {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (data && !error) {
      setCard(data);
      setTitle(data.title || "");
      setContent(data.content || "");
      setDetails(data.details || "");
      setKeyInfo(data.key_info || "");
      setStakeholders(data.stakeholders || []);
    }

    const { data: attData } = await supabase
      .from("attachments")
      .select("*")
      .eq("card_id", cardId);
    setAttachments(attData || []);
  }, [cardId]);

  useEffect(() => {
    fetchCardData();
  }, [fetchCardData]);

  // Hàm lưu trường dữ liệu đơn lẻ (Title, Content, Details, Key Info)
  const saveField = async (field: keyof Card, value: string | any) => {
    try {
      const { error } = await supabase
        .from("cards")
        .update({ [field]: value })
        .eq("id", cardId);
      if (error) throw error;
      onCardUpdated();
    } catch (err) {
      console.error(`Lỗi cập nhật ${field}:`, err);
    }
  };

  // Thêm Stakeholder
  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShName.trim()) return;

    const newSh: Stakeholder = {
      id: crypto.randomUUID(),
      name: newShName.trim(),
      role: newShRole.trim(),
      email: newShEmail.trim(),
    };

    const updatedList = [...stakeholders, newSh];
    setStakeholders(updatedList);
    await saveField("stakeholders", updatedList);

    setNewShName("");
    setNewShRole("");
    setNewShEmail("");
    setIsAddingSh(false);
  };

  // Xóa Stakeholder
  const handleDeleteStakeholder = async (shId: string) => {
    const updatedList = stakeholders.filter(sh => sh.id !== shId);
    setStakeholders(updatedList);
    await saveField("stakeholders", updatedList);
  };

  // File Attachments upload
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload thất bại");
      const fileData = await res.json();
      
      const { error } = await supabase
        .from("attachments")
        .insert([{
          card_id: cardId,
          name: fileData.name,
          url: fileData.url,
          file_id: fileData.fileId,
          mime_type: fileData.mimeType,
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
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload ảnh thất bại");
      const fileData = await res.json();

      // Convert Google Drive Link sang Direct Link
      const directUrl = `https://docs.google.com/uc?export=view&id=${fileData.fileId}`;
      const imageMarkdown = `\n![${fileData.name}](${directUrl})\n`;

      // Chèn vào vị trí con trỏ chuột
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
    } catch (err) {
      alert("Lỗi chèn ảnh: " + err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Trình phân tích markdown regex siêu nhẹ
  const renderMarkdown = (text: string) => {
    if (!text) return "<p class='text-slate-400 italic'>Chưa có thông tin chi tiết.</p>";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Ảnh Markdown
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, "<img src='$2' alt='$1' class='max-w-full h-auto rounded-xl my-3 border border-slate-100 shadow-sm' />");
    // Link Markdown
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-violet-600 hover:underline'>$1</a>");
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Headings
    html = html.replace(/^### (.*?)$/gm, "<h3 class='text-sm font-bold text-slate-800 mt-4 mb-2'>$1</h3>");
    html = html.replace(/^## (.*?)$/gm, "<h2 class='text-base font-bold text-slate-800 mt-5 mb-2'>$1</h2>");
    html = html.replace(/^# (.*?)$/gm, "<h1 class='text-lg font-bold text-slate-900 mt-6 mb-3'>$1</h1>");
    // List
    html = html.replace(/^\s*-\s+(.*?)$/gm, "<li class='list-disc ml-5 my-1'>$1</li>");

    return html.split(/\n\n+/).map(p => {
      if (p.trim().startsWith("<li") || p.trim().startsWith("<h") || p.trim().startsWith("<img")) return p;
      return `<p class='mb-2 text-slate-600 leading-relaxed'>${p.replace(/\n/g, "<br/>")}</p>`;
    }).join("");
  };

  if (!card) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Ẩn inputs file */}
      <input type="file" ref={fileInputRef} onChange={handleFileAttach} className="hidden" />
      <input type="file" ref={imageInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />

      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => saveField("title", title)}
              className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 focus:ring-0 outline-none w-full py-0.5"
            />
            <div className="text-xs text-slate-400 mt-1">
              nằm trong cột: <strong className="text-violet-600">{listTitle}</strong>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer">
            ✕
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          <div className="grid grid-cols-3 gap-6">
            
            {/* CỘT TRÁI (Nội dung chính - 2/3 width) */}
            <div className="col-span-2 flex flex-col gap-6">
              
              {/* Mô tả công việc */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📝 Mô Tả Công Việc (Tóm tắt ngắn)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={() => saveField("content", content)}
                  placeholder="Nhập mô tả tóm tắt..."
                  className="w-full text-xs text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-violet-400 min-h-16 resize-none"
                />
              </div>

              {/* Chi tiết công việc (Markdown Editor) */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📖 Chi tiết công việc (Markdown / HackMD)</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPreviewMode(false)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${!isPreviewMode ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Soạn thảo
                    </button>
                    <button
                      onClick={() => setIsPreviewMode(true)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold cursor-pointer ${isPreviewMode ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-100"}`}
                    >
                      Xem trước
                    </button>
                  </div>
                </div>

                {!isPreviewMode ? (
                  <div className="space-y-2">
                    {/* Toolbar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex gap-2 items-center text-xs">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-600 cursor-pointer disabled:opacity-40"
                      >
                        {uploadingImage ? "Đang upload..." : "🖼️ Chèn ảnh từ máy"}
                      </button>
                      <span className="text-[10px] text-slate-400 ml-auto italic">Kéo thả / Dán ảnh trực tiếp</span>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      onBlur={() => saveField("details", details)}
                      placeholder="Viết chi tiết kế hoạch của bạn ở đây bằng Markdown..."
                      className="w-full text-xs text-slate-800 bg-slate-50/50 border border-slate-200 rounded-lg p-3 min-h-[220px] focus:border-violet-400 outline-none font-mono"
                    />
                  </div>
                ) : (
                  <div
                    className="border border-slate-200 rounded-lg p-4 bg-white min-h-[260px] prose prose-slate max-w-none text-xs"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(details) }}
                  />
                )}
              </div>

              {/* Stakeholders Table */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">👥 Stakeholders (Các bên liên quan)</label>
                  {!isAddingSh && (
                    <button
                      onClick={() => setIsAddingSh(true)}
                      className="text-xs text-violet-600 hover:text-violet-500 font-semibold cursor-pointer"
                    >
                      + Thêm bên liên quan
                    </button>
                  )}
                </div>

                {isAddingSh && (
                  <form onSubmit={handleAddStakeholder} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <input
                        type="text"
                        placeholder="Họ tên..."
                        value={newShName}
                        onChange={(e) => setNewShName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Vai trò..."
                        value={newShRole}
                        onChange={(e) => setNewShRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email..."
                        value={newShEmail}
                        onChange={(e) => setNewShEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-violet-400"
                      />
                    </div>
                    <div className="col-span-3 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setIsAddingSh(false)} className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-600 cursor-pointer">
                        Hủy
                      </button>
                      <button type="submit" className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 rounded-md font-semibold text-white cursor-pointer shadow-sm">
                        Lưu
                      </button>
                    </div>
                  </form>
                )}

                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="pb-2">Tên</th>
                      <th className="pb-2">Vai trò</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stakeholders.map((sh) => (
                      <tr key={sh.id}>
                        <td className="py-2.5 font-semibold text-slate-700">{sh.name}</td>
                        <td className="py-2.5">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            {sh.role || "N/A"}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500">{sh.email || "N/A"}</td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => handleDeleteStakeholder(sh.id)} className="text-slate-400 hover:text-rose-500 cursor-pointer text-sm">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {stakeholders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400 italic text-center">
                          Chưa có bên liên quan nào được định nghĩa.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* CỘT PHẢI (Ghi chú & File đính kèm - 1/3 width) */}
            <div className="col-span-1 flex flex-col gap-6">
              
              {/* Key Info */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800">💡 Key Info (Lưu ý đặc biệt)</label>
                <textarea
                  value={keyInfo}
                  onChange={(e) => setKeyInfo(e.target.value)}
                  onBlur={() => saveField("key_info", keyInfo)}
                  placeholder="Ghi lại các ghi chú, mật khẩu, hoặc cảnh báo dự án..."
                  className="w-full text-xs text-amber-900 bg-transparent border-0 resize-y min-h-[160px] outline-none placeholder-amber-600/50 leading-relaxed font-sans"
                />
              </div>

              {/* Attachments */}
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📎 File đính kèm</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="text-xs text-violet-600 hover:text-violet-500 font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {uploadingFile ? "Đang đính kèm..." : "+ Thêm tệp"}
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg text-xs">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-violet-600 truncate max-w-[130px] font-medium">
                        {att.name}
                      </a>
                      {/* Xóa file đính kèm */}
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from("attachments").delete().eq("id", att.id);
                          if (!error) fetchCardData();
                        }}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic">Chưa có tệp nào được đính kèm.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Đảm bảo chèn ảnh qua clipboard (Paste event) hoạt động**

Thêm `useEffect` để bắt sự kiện paste ảnh trực tiếp vào textarea:

```typescript
  // Thêm sự kiện paste ảnh trực tiếp vào textarea chi tiết công việc
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isPreviewMode) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          e.preventDefault(); // Ngăn hành vi dán mặc định (text)
          setUploadingImage(true);
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload dán ảnh thất bại");
            const fileData = await res.json();

            const directUrl = `https://docs.google.com/uc?export=view&id=${fileData.fileId}`;
            const imageMarkdown = `\n![Pasted Image](${directUrl})\n`;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newDetails = details.substring(0, start) + imageMarkdown + details.substring(end);
            setDetails(newDetails);
            await saveField("details", newDetails);
          } catch (err) {
            alert("Lỗi dán ảnh: " + err);
          } finally {
            setUploadingImage(false);
          }
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => {
      textarea.removeEventListener("paste", handlePaste);
    };
  }, [details, isPreviewMode]);
```

- [ ] **Step 3: Ghi nhận component trong git**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "feat: implement CardDetailModal component with markdown editor, stakeholders, and key info"
```

---

### Task 3: Tích hợp Modal vào Board Page chính

**Files:**
- Modify: `src/app/board/[id]/page.tsx`
- Modify: `src/components/BoardColumn.tsx`
- Modify: `src/components/BoardCard.tsx`

- [ ] **Step 1: Truyền callback click card từ page.tsx xuống BoardCard.tsx**

1. Khai báo state quản lý modal trong [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx):
```typescript
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedListTitle, setSelectedListTitle] = useState<string>("");
```
2. Thêm hàm mở và đóng:
```typescript
  const handleCardClick = (cardId: string, listTitle: string) => {
    setSelectedCardId(cardId);
    setSelectedListTitle(listTitle);
  };
```
3. Truyền xuống component `BoardColumn` và render Modal ở cuối JSX:
```tsx
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          listTitle={selectedListTitle}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={fetchBoardData}
        />
      )}
```

- [ ] **Step 2: Cập nhật BoardColumn và BoardCard để nhận sự kiện click**

1. Trong [BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx), thêm prop `onCardClick: (cardId: string, listTitle: string) => void` và truyền xuống `BoardCard`:
```tsx
            onCardClick={(cardId) => onCardClick(cardId, list.title)}
```

2. Trong [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx), thêm prop `onCardClick` và gắn sự kiện `onClick` vào div chính của card:
```tsx
      onClick={(e) => {
        // Chỉ mở modal nếu không click vào nút xóa hoặc input sửa tên
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
          return;
        }
        onCardClick(card.id);
      }}
```

- [ ] **Step 3: Chạy lint, build và tests để xác minh tính tương thích**

Chạy các lệnh kiểm tra:
```powershell
npm run lint
npm run build
npm run test
```
Đảm bảo tất cả đều trả về PASS.

- [ ] **Step 4: Commit và push tích hợp**

```bash
git add src/app/board/[id]/page.tsx src/components/BoardColumn.tsx src/components/BoardCard.tsx
git commit -m "feat: integrate CardDetailModal into Board page and BoardCard click events"
```
