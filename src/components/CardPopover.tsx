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
  folder_id: string | null;
  position: number;
}

interface AttachmentFolder {
  id: string;
  card_id: string;
  name: string;
  position: number;
  created_at?: string;
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
  const [folders, setFolders] = useState<AttachmentFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const merged = [
    ...attachments.map(a => ({ ...a, itemType: "file" as const })),
    ...folders.map(f => ({ ...f, itemType: "folder" as const }))
  ].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    if (a.itemType !== b.itemType) {
      return a.itemType === "folder" ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });

  const topFiles: Attachment[] = [];
  const folderGroups: { folder: AttachmentFolder; files: Attachment[] }[] = [];
  let currentGroup: { folder: AttachmentFolder; files: Attachment[] } | null = null;

  merged.forEach((item) => {
    if (item.itemType === "folder") {
      currentGroup = { folder: item as AttachmentFolder, files: [] };
      folderGroups.push(currentGroup);
    } else {
      const file = item as Attachment;
      if (currentGroup === null) {
        topFiles.push(file);
      } else {
        currentGroup.files.push(file);
      }
    }
  });
  
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
      .select("*")
      .eq("card_id", card.id)
      .order("position", { ascending: true });
    setAttachments(data || []);

    const { data: folderData } = await supabase
      .from("attachment_folders")
      .select("*")
      .eq("card_id", card.id)
      .order("position", { ascending: true });
    setFolders(folderData || []);
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

  // ==========================================
  // ATTACHMENT FOLDER & FILE ACTIONS (UNIFIED POSITION SYSTEM)
  // ==========================================
  const handleCreateFolder = async (e: React.FormEvent | React.FocusEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const nextPos = merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0;
      const { error } = await supabase
        .from("attachment_folders")
        .insert([{
          card_id: card.id,
          name: newFolderName.trim(),
          position: nextPos
        }]);

      if (error) throw error;
      setNewFolderName("");
      setShowNewFolderInput(false);
      fetchAttachments();
    } catch (err) {
      console.error("Lỗi tạo thư mục:", err);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!editFolderName.trim()) return;
    try {
      const { error } = await supabase
        .from("attachment_folders")
        .update({ name: editFolderName.trim() })
        .eq("id", folderId);
      if (error) throw error;
      setEditingFolderId(null);
      setEditFolderName("");
      fetchAttachments();
    } catch (err) {
      console.error("Lỗi đổi tên thư mục:", err);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from("attachment_folders")
        .delete()
        .eq("id", folderId);
      if (error) throw error;
      fetchAttachments();
    } catch (err) {
      console.error("Lỗi xóa thư mục:", err);
    }
  };

  const handleMoveItem = async (itemId: string, itemType: "file" | "folder", direction: "up" | "down") => {
    const idx = merged.findIndex((x) => x.id === itemId && x.itemType === itemType);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= merged.length) return;

    const itemA = merged[idx];
    const itemB = merged[targetIdx];

    const posA = itemA.position;
    const posB = itemB.position;

    let newPosA = posB;
    let newPosB = posA;

    if (posA === posB) {
      newPosA = posA - 0.5;
      newPosB = posB + 0.5;
    }

    try {
      const updateA = supabase
        .from(itemA.itemType === "file" ? "attachments" : "attachment_folders")
        .update({ position: newPosA })
        .eq("id", itemA.id);

      const updateB = supabase
        .from(itemB.itemType === "file" ? "attachments" : "attachment_folders")
        .update({ position: newPosB })
        .eq("id", itemB.id);

      await Promise.all([updateA, updateB]);
      fetchAttachments();
    } catch (err) {
      console.error("Lỗi hoán đổi vị trí:", err);
    }
  };

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
  }, [card.id, description, onCardUpdated, setIsEditingDesc]);

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
      const nextPos = merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0;
      const { error } = await supabase
        .from("attachments")
        .insert([
          {
            card_id: card.id,
            name: file.name,
            url: file.url,
            file_id: file.fileId,
            mime_type: file.mimeType,
            position: nextPos,
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
      // 1. Khởi tạo session upload
      const initRes = await fetch("/api/attachments/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        throw new Error(errText || "Không thể khởi tạo phiên tải lên");
      }

      const initData = await initRes.json();

      let finalFileData;

      if (initData.mock) {
        // Chế độ mô phỏng (Mock Mode)
        for (let percent = 10; percent <= 100; percent += 30) {
          setUploadingFile(prev => prev ? { ...prev, progress: percent } : null);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        finalFileData = {
          name: file.name,
          url: "https://drive.google.com/file/d/mock-server-" + Date.now(),
          fileId: "mock-server-" + Date.now(),
          mimeType: file.type || "application/octet-stream"
        };
      } else {
        // 2. Thực hiện tải tệp trực tiếp lên Google Drive qua PUT
        finalFileData = await new Promise<any>((resolve, reject) => {
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
                reject(new Error("Lỗi phân tích phản hồi máy chủ Google"));
              }
            } else {
              reject(new Error(xhr.statusText || "Lỗi tải tệp lên Google Drive"));
            }
          };

          xhr.onerror = () => reject(new Error("Lỗi mạng kết nối đến Google"));
          
          xhr.open("PUT", initData.uploadUrl);
          xhr.send(file);
        });

        // 3. Cập nhật quyền xem tệp thành công khai
        const completeRes = await fetch("/api/attachments/upload?action=complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: finalFileData.id }),
        });

        if (!completeRes.ok) {
          console.warn("Không thể tự động chia sẻ tệp công khai");
        }
      }

      setUploadingFile(prev => prev ? { ...prev, progress: 100, stage: "saving" } : null);
      
      const attachmentData = {
        name: finalFileData.name,
        url: finalFileData.webViewLink || finalFileData.url || "",
        fileId: finalFileData.id || finalFileData.fileId || "",
        mimeType: finalFileData.mimeType,
      };

      await handleAddAttachment(attachmentData);
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

  const renderAttachmentCard = (att: Attachment) => {
    const fileInfo = getFileTypeAndRank(att.name, att.mime_type);
    const borderClass = fileInfo.rank <= 7 ? fileInfo.colorClass.split(" ")[2] : "border-slate-100";
    const globalIdx = merged.findIndex((x) => x.id === att.id && x.itemType === "file");

    return (
      <div
        key={att.id}
        className={`flex items-center justify-between bg-white border ${borderClass} p-1.5 rounded-lg text-[11px] gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-sm transition-all duration-150`}
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

        <div className="flex items-center gap-1 shrink-0 select-none">
          <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border shrink-0 ${fileInfo.colorClass}`}>
            {fileInfo.label}
          </span>

          {/* Nút di chuyển thứ tự tệp */}
          {globalIdx > 0 && (
            <button
              onClick={() => handleMoveItem(att.id, "file", "up")}
              className="text-xs text-slate-400 hover:text-violet-600 cursor-pointer hover:font-bold"
              title="Di chuyển lên"
            >
              ↑
            </button>
          )}
          {globalIdx < merged.length - 1 && (
            <button
              onClick={() => handleMoveItem(att.id, "file", "down")}
              className="text-xs text-slate-400 hover:text-violet-600 cursor-pointer hover:font-bold"
              title="Di chuyển xuống"
            >
              ↓
            </button>
          )}

          <button
            onClick={() => handleDeleteAttachment(att.id)}
            disabled={deletingIds.includes(att.id)}
            className="text-slate-400 hover:text-rose-500 h-4.5 w-4.5 flex items-center justify-center rounded-full hover:bg-rose-50 transition cursor-pointer flex-shrink-0 text-[10px]"
            title="Xóa tệp đính kèm"
          >
            {deletingIds.includes(att.id) ? (
              <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "✕"
            )}
          </button>
        </div>
      </div>
    );
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
      className="fixed bg-white shadow-2xl rounded-2xl border border-slate-100 p-5 z-50 overflow-y-auto"
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
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            {showNewFolderInput ? (
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder(e);
                  if (e.key === "Escape") {
                    setNewFolderName("");
                    setShowNewFolderInput(false);
                  }
                }}
                onBlur={(e) => {
                  if (newFolderName.trim()) {
                    handleCreateFolder(e);
                  } else {
                    setShowNewFolderInput(false);
                  }
                }}
                placeholder="Tên thư mục..."
                className="rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-800 outline-none w-20 focus:ring-1 focus:ring-violet-300"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setShowNewFolderInput(true)}
                disabled={isBusy}
                className="text-[10px] font-semibold text-violet-600 hover:text-violet-500 cursor-pointer disabled:opacity-30"
              >
                + Thư mục
              </button>
            )}
            <span className="text-slate-300 text-[10px]">|</span>
            <button
              onClick={handleAttachClick}
              disabled={isBusy}
              className="text-[10px] font-semibold text-violet-600 hover:text-violet-500 cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              📎 Thêm tệp
            </button>
          </div>
        </div>

        <div className="space-y-2">
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

          {/* Top-level attachments (outside folders) */}
          {topFiles.length > 0 && (
            <div className="space-y-1">
              {topFiles.map(att => renderAttachmentCard(att))}
            </div>
          )}

          {/* Danh sách Thư mục */}
          {folderGroups.map((group, index) => {
            const { folder, files } = group;
            const globalFolderIdx = merged.findIndex((x) => x.id === folder.id && x.itemType === "folder");

            return (
              <div
                key={folder.id}
                className="flex flex-col gap-1 rounded-lg p-1.5 bg-slate-50 border border-slate-100 shadow-sm"
              >
                {/* Folder Header */}
                <div className="flex items-center justify-between group/folder">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {editingFolderId === folder.id ? (
                      <input
                        type="text"
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        onBlur={() => handleRenameFolder(folder.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolder(folder.id);
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="text-[10px] text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none font-semibold w-full"
                        autoFocus
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setEditingFolderId(folder.id);
                          setEditFolderName(folder.name);
                        }}
                        className="text-[10px] font-bold text-slate-700 truncate cursor-pointer select-none"
                        title="Kích đúp để đổi tên"
                      >
                        {folder.name}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 select-none">({files.length})</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 select-none">
                    {/* Nút di chuyển thứ tự thư mục */}
                    {globalFolderIdx > 0 && (
                      <button
                        onClick={() => handleMoveItem(folder.id, "folder", "up")}
                        className="text-xs text-slate-400 hover:text-violet-600 cursor-pointer font-bold leading-none"
                        title="Di chuyển thư mục lên"
                      >
                        ↑
                      </button>
                    )}
                    {globalFolderIdx < merged.length - 1 && (
                      <button
                        onClick={() => handleMoveItem(folder.id, "folder", "down")}
                        className="text-xs text-slate-400 hover:text-violet-600 cursor-pointer font-bold leading-none"
                        title="Di chuyển thư mục xuống"
                      >
                        ↓
                      </button>
                    )}

                    {/* Xóa thư mục */}
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer leading-none text-xs"
                      title="Xóa thư mục"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Files list */}
                <div className="space-y-1 pl-1 border-l-2 border-slate-100">
                  {files.map(att => renderAttachmentCard(att))}
                  {files.length === 0 && (
                    <div className="text-[9px] text-slate-400 italic py-0.5 pl-1">Thư mục trống.</div>
                  )}
                </div>
              </div>
            );
          })}
          {attachments.length === 0 && folders.length === 0 && !uploadingFile && (
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
