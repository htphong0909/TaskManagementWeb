"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { marked } from "marked";

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
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const openLightbox = (url: string) => {
    setLightboxImageUrl(url);
    setScale(1);
  };

  const closeLightbox = () => {
    setLightboxImageUrl(null);
    setScale(1);
  };

  // Zoom ảnh bằng phím Control + cuộn chuột
  useEffect(() => {
    const el = lightboxRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 0.15;
        setScale((prev) => {
          const newScale = prev + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
          return Math.max(0.5, Math.min(newScale, 5));
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [lightboxImageUrl]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Trình phân tích markdown using marked
  const renderMarkdown = (text: string) => {
    if (!text) return "<p class='text-slate-400 italic'>Chưa có mô tả công việc.</p>";
    return marked.parse(text, { breaks: true, gfm: true }) as string;
  };

  if (!rect) return null;

  const isBusy = uploadingFile !== null || deletingIds.length > 0 || lightboxImageUrl !== null;
  const popupWidth = 360;
  const margin = 12;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const spaceOnRight = screenWidth - rect.right;
  const showOnRight = spaceOnRight > popupWidth + margin;

  const leftPosition = showOnRight 
    ? rect.right + margin 
    : rect.left - popupWidth - margin;

  const isLowerHalf = rect.top > screenHeight / 2;
  const bottomPosition = isLowerHalf ? screenHeight - Math.min(rect.bottom, screenHeight * 0.92 - 12) : 0;
  const topPosition = isLowerHalf ? 0 : rect.top;
  const maxH = isLowerHalf ? screenHeight - bottomPosition - 16 : (screenHeight * 0.92 - 12) - topPosition;

  return (
    <div
      ref={popoverRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/40 p-5 z-50 overflow-y-auto"
      style={{
        left: `${leftPosition}px`,
        ...(isLowerHalf ? { bottom: `${bottomPosition}px` } : { top: `${topPosition}px` }),
        width: `${popupWidth}px`,
        maxHeight: `${maxH}px`,
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
              {att.mime_type?.startsWith("image/") ? (
                <button
                  onClick={() => openLightbox(att.url)}
                  className="flex items-center gap-2 text-slate-655 hover:text-violet-655 font-medium truncate flex-1 text-left cursor-pointer"
                >
                  <span>{getFileIcon(att.mime_type)}</span>
                  <span className="truncate">{att.name}</span>
                </button>
              ) : (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-600 hover:text-violet-650 font-medium truncate flex-1"
                >
                  <span>{getFileIcon(att.mime_type)}</span>
                  <span className="truncate">{att.name}</span>
                </a>
              )}
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
              onBlur={handleSaveDescription}
              placeholder="Nhập mô tả thẻ công việc... (Hỗ trợ Markdown)"
              className="w-full h-32 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-950 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40 font-normal leading-relaxed resize-none break-words"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) handleSaveDescription();
                if (e.key === "Escape") setIsEditingDesc(false);
              }}
            />
          </div>
        ) : (
          <div
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === "IMG") {
                e.stopPropagation();
                openLightbox((target as HTMLImageElement).src);
              } else {
                setIsEditingDesc(true);
              }
            }}
            className="p-3 rounded-xl border border-slate-100 hover:border-violet-200 bg-slate-50/20 hover:bg-white transition cursor-pointer text-xs font-normal markdown-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(card.content || "") }}
          />
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImageUrl && typeof document !== "undefined" && createPortal(
        <div 
          ref={lightboxRef}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={closeLightbox}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={lightboxImageUrl} 
              alt="Zoomed" 
              className="rounded-xl object-contain max-w-[90vw] max-h-[80vh] shadow-2xl border border-white/10"
              style={{ transform: `scale(${scale})`, transition: "transform 0.1s ease-out" }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white/70 text-[10px] bg-black/30 px-3 py-1 rounded-full whitespace-nowrap">
              Giữ phím Ctrl + Cuộn chuột để phóng to/thu nhỏ
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
