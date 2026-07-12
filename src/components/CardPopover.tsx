"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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
  onBusyChange?: (isBusy: boolean) => void;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  file_id: string | null;
}

export default function CardPopover({
  card,
  rect,
  onClose,
  onCardUpdated,
  onMouseEnter,
  onMouseLeave,
  onBusyChange,
}: CardPopoverProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Markdown states
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState(card.content || "");

  // Upload states
  const [uploadingFile, setUploadingFile] = useState<{
    name: string;
    progress: number;
    stage: "uploading" | "saving";
  } | null>(null);

  // Deletion states
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descEditorRef = useRef<HTMLDivElement>(null);

  // Nạp danh sách file đính kèm
  const fetchAttachments = useCallback(async () => {
    const { data } = await supabase
      .from("attachments")
      .select("id, name, url, mime_type, file_id")
      .eq("card_id", card.id);
    setAttachments(data || []);
  }, [card.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttachments();
    }, 0);
    return () => clearTimeout(timer);
  }, [card.id, fetchAttachments]);

  // Thông báo trạng thái bận cho component cha
  useEffect(() => {
    if (onBusyChange) {
      onBusyChange(uploadingFile !== null || deletingIds.length > 0);
    }
  }, [uploadingFile, deletingIds, onBusyChange]);

  // Cập nhật Mô tả
  const handleSaveDescription = useCallback(async () => {
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
  }, [card.id, description, onCardUpdated]);

  // Đồng bộ lại nội dung mô tả khi prop card thay đổi từ bên ngoài
  useEffect(() => {
    setDescription(card.content || "");
  }, [card.id, card.content]);

  // Tự động lưu mô tả khi click ra ngoài vùng soạn thảo
  useEffect(() => {
    if (!isEditingDesc) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (descEditorRef.current && !descEditorRef.current.contains(event.target as Node)) {
        handleSaveDescription();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingDesc, handleSaveDescription]);

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
    setDeletingIds(prev => [...prev, id]);
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
    } finally {
      setDeletingIds(prev => prev.filter(item => item !== id));
    }
  };

  // Trình kích hoạt upload file cục bộ lên Google Drive của Host
  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Xử lý upload khi chọn file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile({
      name: file.name,
      progress: 0,
      stage: "uploading"
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const fileData = await new Promise<{
        name: string;
        url: string;
        fileId: string;
        mimeType: string;
        error?: string;
      }>((resolve, reject) => {
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
              reject(new Error("Lỗi phân tích phản hồi máy chủ"));
            }
          } else {
            reject(new Error(xhr.statusText || "Lỗi tải tệp lên máy chủ"));
          }
        };

        xhr.onerror = () => reject(new Error("Lỗi mạng kết nối"));
        
        xhr.open("POST", "/api/attachments/upload");
        xhr.send(formData);
      });

      if (fileData.error) {
        throw new Error(fileData.error);
      }

      setUploadingFile(prev => prev ? { ...prev, progress: 100, stage: "saving" } : null);
      await handleAddAttachment(fileData);
    } catch (err: unknown) {
      console.error("Lỗi đính kèm tệp:", err);
      const message = err instanceof Error ? err.message : String(err);
      alert("Lỗi tải tệp lên Google Drive: " + message);
    } finally {
      setUploadingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    html = html.replace(/```([\s\S]*?)```/g, "<pre class='bg-slate-900 text-slate-100 p-2 rounded-lg my-2 font-mono text-[10px] overflow-x-auto'>$1</pre>");
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

  const isBusy = uploadingFile !== null || deletingIds.length > 0;
  const popupWidth = 360;
  const margin = 12;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const spaceOnRight = screenWidth - rect.right;
  const showOnRight = spaceOnRight > popupWidth + margin;

  const leftPosition = showOnRight 
    ? rect.right + margin 
    : rect.left - popupWidth - margin;

  const topPosition = rect.top;

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
      {/* Input File Ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Popover */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h4 className="text-sm font-bold text-slate-800 truncate pr-4">{card.title}</h4>
        <button
          onClick={onClose}
          disabled={isBusy}
          className="text-slate-400 hover:text-slate-600 h-5 w-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
            disabled={isBusy}
            className="text-[10px] font-semibold text-violet-600 hover:text-violet-500 cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            📎 Đính kèm tệp tin
          </button>
        </div>

        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
          {uploadingFile && (
            <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 border-dashed p-2 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-violet-600 font-medium truncate flex-1">
                <svg className="animate-spin h-3.5 w-3.5 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="truncate">{uploadingFile.name}</span>
              </div>
              <span className="text-violet-500 font-semibold ml-2 whitespace-nowrap">
                {uploadingFile.stage === "uploading" 
                  ? `Đang tải: ${uploadingFile.progress}%` 
                  : "Đang lưu lên Drive..."}
              </span>
            </div>
          )}

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
                disabled={deletingIds.includes(att.id)}
                className="text-slate-400 hover:text-rose-500 h-5 w-5 flex items-center justify-center rounded-full hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
                title="Xóa tệp đính kèm"
              >
                {deletingIds.includes(att.id) ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "🗑"
                )}
              </button>
            </div>
          ))}
          {attachments.length === 0 && !uploadingFile && (
            <p className="text-[11px] text-slate-400 italic">Chưa có tệp nào được đính kèm.</p>
          )}
        </div>
      </div>

      {/* Mô tả chi tiết (Markdown Editor) */}
      <div className="space-y-2">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Mô Tả Công Việc</span>
        
        {isEditingDesc ? (
          <div ref={descEditorRef} className="space-y-2">
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
    </div>
  );
}
