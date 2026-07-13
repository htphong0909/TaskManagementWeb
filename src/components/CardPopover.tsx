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

const getFileTypeAndRank = (name: string, mimeType: string | null) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  // 1. PDF
  if (ext === "pdf" || mime === "application/pdf") {
    return { type: "PDF", rank: 1, colorClass: "bg-rose-50 text-rose-700 border-rose-100", label: "PDF" };
  }
  // 2. EXCEL
  if (
    ["xlsx", "xls", "csv"].includes(ext) ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    mime === "text/csv"
  ) {
    return { type: "EXCEL", rank: 2, colorClass: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "EXCEL" };
  }
  // 3. PPT
  if (ext === "ppt" || mime === "application/vnd.ms-powerpoint") {
    return { type: "PPT", rank: 3, colorClass: "bg-orange-50 text-orange-700 border-orange-100", label: "PPT" };
  }
  // 4. PPTX
  if (ext === "pptx" || mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return { type: "PPTX", rank: 4, colorClass: "bg-orange-50/80 text-orange-700 border-orange-100/80", label: "PPTX" };
  }
  // 5. DOCX
  if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { type: "DOCX", rank: 5, colorClass: "bg-blue-50 text-blue-700 border-blue-100", label: "DOCX" };
  }
  // 6. DOC
  if (ext === "doc" || mime === "application/msword") {
    return { type: "DOC", rank: 6, colorClass: "bg-blue-50/80 text-blue-700 border-blue-100/80", label: "DOC" };
  }
  // 7. Image
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext) || mime.startsWith("image/")) {
    return { type: "Image", rank: 7, colorClass: "bg-indigo-50 text-indigo-700 border-indigo-100", label: "IMAGE" };
  }
  // 8. File khác
  return { type: "Other", rank: 8, colorClass: "bg-slate-50 text-slate-600 border-slate-200", label: "FILE" };
};

const getFileIcon = (type: string) => {
  switch (type) {
    case "PDF":
      return (
        <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h1.5M9 13h6m-6 4h6" />
        </svg>
      );
    case "EXCEL":
      return (
        <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "PPT":
    case "PPTX":
      return (
        <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "DOC":
    case "DOCX":
      return (
        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "Image":
      return (
        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      );
  }
};

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

  // getFileIcon helper is now defined globally

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

        <div className="space-y-1">
          {uploadingFile && (
            <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 border-dashed p-1.5 rounded-lg text-[11px]">
              <div className="flex items-center gap-1.5 text-violet-600 font-medium truncate flex-1">
                <svg className="animate-spin h-3 w-3 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="truncate">{uploadingFile.name}</span>
              </div>
              <span className="text-violet-500 font-semibold ml-2 whitespace-nowrap text-[10px]">
                {uploadingFile.stage === "uploading" 
                  ? `Đang tải: ${uploadingFile.progress}%` 
                  : "Đang lưu..."}
              </span>
            </div>
          )}

          {[...attachments]
            .sort((a, b) => {
              const infoA = getFileTypeAndRank(a.name, a.mime_type);
              const infoB = getFileTypeAndRank(b.name, b.mime_type);
              if (infoA.rank !== infoB.rank) {
                return infoA.rank - infoB.rank;
              }
              return a.name.localeCompare(b.name);
            })
            .map((att) => {
              const fileInfo = getFileTypeAndRank(att.name, att.mime_type);
              const borderClass = fileInfo.rank <= 7 ? fileInfo.colorClass.split(" ")[2] : "border-slate-100";

              return (
                <div
                  key={att.id}
                  className={`flex items-center justify-between bg-white border ${borderClass} p-1.5 rounded-lg text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-sm transition-all duration-150 gap-1.5`}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {getFileIcon(fileInfo.type)}
                    {fileInfo.type === "Image" ? (
                      <button
                        onClick={() => openLightbox(att.url)}
                        className="text-slate-700 hover:text-violet-600 truncate font-semibold text-left cursor-pointer flex-1 min-w-0"
                        title={att.name}
                      >
                        {att.name}
                      </button>
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:text-violet-600 truncate font-semibold flex-1 min-w-0"
                        title={att.name}
                      >
                        {att.name}
                      </a>
                    )}
                  </div>

                  <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border shrink-0 ${fileInfo.colorClass}`}>
                    {fileInfo.label}
                  </span>

                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    disabled={deletingIds.includes(att.id)}
                    className="text-slate-400 hover:text-rose-500 h-4.5 w-4.5 flex items-center justify-center rounded-full hover:bg-rose-50 transition cursor-pointer flex-shrink-0 text-[10px]"
                    title="Xóa tệp đính kèm"
                  >
                    {deletingIds.includes(att.id) ? (
                      <svg className="animate-spin h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      "🗑"
                    )}
                  </button>
                </div>
              );
            })}
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
