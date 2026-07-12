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
                className="text-slate-400 hover:text-rose-500 h-5 w-5 flex items-center justify-center rounded-full hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
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
