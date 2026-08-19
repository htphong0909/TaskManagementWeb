"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { uploadFileToDrive } from "@/lib/upload";
import { BoardImage, UploadingItem } from "@/types/gallery";
import TelegramImageViewer from "./TelegramImageViewer";

export interface BoardGalleryModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onImageCountChange?: (count: number) => void;
}

export default function BoardGalleryModal({
  boardId,
  boardTitle,
  isOpen,
  onClose,
  onImageCountChange,
}: BoardGalleryModalProps) {
  const [images, setImages] = useState<BoardImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [columnCount, setColumnCount] = useState<number>(4);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [uploadingQueue, setUploadingQueue] = useState<UploadingItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch images for this board
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("board_images")
        .select("*")
        .eq("board_id", boardId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Lỗi tải ảnh thư viện:", error);
      } else if (data) {
        setImages(data as BoardImage[]);
        onImageCountChange?.(data.length);
      }
    } catch (err) {
      console.error("Lỗi fetchImages:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId, onImageCountChange]);

  useEffect(() => {
    if (isOpen && boardId) {
      fetchImages();
    }
  }, [isOpen, boardId, fetchImages]);

  // Handle Ctrl + Wheel zooming for grid columns
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          // Roll up -> zoom in (fewer columns, bigger images)
          setColumnCount((prev) => Math.max(2, prev - 1));
        } else if (e.deltaY > 0) {
          // Roll down -> zoom out (more columns, smaller images)
          setColumnCount((prev) => Math.min(10, prev + 1));
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isOpen]);

  // Keyboard shortcut Esc to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedImageIndex === null) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, selectedImageIndex, onClose]);

  // Upload multiple files
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    const newQueueItems: UploadingItem[] = fileArray.map((f, idx) => ({
      id: `upload-${Date.now()}-${idx}`,
      name: f.name,
      progress: 0,
    }));

    setUploadingQueue((prev) => [...prev, ...newQueueItems]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const queueId = newQueueItems[i].id;

      try {
        const driveData = await uploadFileToDrive(file, (percent) => {
          setUploadingQueue((prev) =>
            prev.map((item) => (item.id === queueId ? { ...item, progress: percent } : item))
          );
        });

        const fileId = driveData.fileId || driveData.id || null;
        const directUrl = fileId
          ? `/api/attachments/proxy?fileId=${fileId}`
          : (driveData.webViewLink || driveData.url || "");

        // Insert into Supabase
        const { data, error } = await supabase
          .from("board_images")
          .insert({
            board_id: boardId,
            name: file.name,
            url: directUrl,
            file_id: fileId,
            mime_type: file.type,
            size: file.size,
          })
          .select()
          .single();

        if (error) {
          console.error("Lỗi Supabase insert board_images:", error);
          alert(`Lỗi lưu ảnh vào Supabase: ${error.message}`);
          throw error;
        }

        if (data) {
          setImages((prev) => [data as BoardImage, ...prev]);
          onImageCountChange?.(images.length + 1);
        }
      } catch (err) {
        console.error(`Lỗi tải tệp ${file.name}:`, err);
      } finally {
        setUploadingQueue((prev) => prev.filter((item) => item.id !== queueId));
      }
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Delete image
  const handleDeleteImage = async (image: BoardImage) => {
    try {
      const { error } = await supabase.from("board_images").delete().eq("id", image.id);
      if (!error) {
        setImages((prev) => prev.filter((img) => img.id !== image.id));
        onImageCountChange?.(images.length - 1);

        // Delete from Drive if file_id exists
        if (image.file_id) {
          fetch("/api/attachments/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: image.file_id }),
          }).catch((err) => console.warn("Lỗi xoá file Google Drive:", err));
        }
      }
    } catch (err) {
      console.error("Lỗi xoá ảnh:", err);
    }
  };

  if (!mounted || !isOpen) return null;

  // Grid template style based on columnCount
  const gridStyle = {
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full max-w-6xl h-[88vh] bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
          isDragOver ? "ring-4 ring-violet-500/50 scale-[1.005]" : ""
        }`}
      >
        {/* Drag & Drop Visual Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-violet-600/10 backdrop-blur-xs border-2 border-dashed border-violet-500 rounded-3xl z-30 flex flex-col items-center justify-center pointer-events-none animate-fadeIn">
            <span className="text-4xl mb-2">📥</span>
            <p className="text-sm font-bold text-violet-800">Thả các tệp ảnh vào đây để tải lên</p>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100/80 flex items-center justify-between bg-white/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-sm">
              🖼️
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-tight">
                Thư viện ảnh: {boardTitle || "Bảng"}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {images.length} bức ảnh lưu trữ trong bảng này
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom Slider Control */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-600">
              <span>🔍</span>
              <span className="text-[11px] text-slate-500">Cột: {columnCount}</span>
              <input
                type="range"
                min={2}
                max={10}
                value={columnCount}
                onChange={(e) => setColumnCount(parseInt(e.target.value))}
                className="w-20 accent-violet-600 cursor-pointer h-1.5 bg-slate-300 rounded-lg"
                title="Thu phóng số cột ảnh (hoặc dùng Ctrl + Lăn chuột)"
                aria-label="Thu phóng lưới ảnh"
              />
            </div>

            {/* Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleUploadFiles(e.target.files);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-violet-500/20 hover:scale-[1.02] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span> Thêm ảnh
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              title="Đóng (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Upload Progress Queue Bar */}
        {uploadingQueue.length > 0 && (
          <div className="bg-violet-50/90 border-b border-violet-100 px-6 py-2 flex items-center justify-between text-xs font-semibold text-violet-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="animate-spin text-sm">⏳</span>
              <span>Đang tải lên {uploadingQueue.length} tệp ảnh...</span>
            </div>
            <div className="w-32 bg-violet-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-violet-600 h-full transition-all duration-200"
                style={{
                  width: `${
                    uploadingQueue.reduce((acc, cur) => acc + cur.progress, 0) /
                    uploadingQueue.length
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Modal Body: Scrollable Zoomable Photo Grid */}
        <div
          ref={gridContainerRef}
          className="flex-1 p-6 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
              <p className="text-xs font-semibold">Đang tải thư viện ảnh...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-3xl">
                📷
              </div>
              <p className="text-sm font-bold text-slate-600">Chưa có ảnh nào trong thư viện</p>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                Kéo thả các tệp ảnh vào đây hoặc bấm &quot;Thêm ảnh&quot; để tải ảnh lên thư viện của bảng này.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl font-bold text-xs border border-violet-200 transition-all cursor-pointer"
              >
                Chọn ảnh từ máy
              </button>
            </div>
          ) : (
            <div className="grid gap-3 transition-all duration-150" style={gridStyle}>
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img);
                        }}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-red-500 text-white transition-colors"
                        title="Xoá ảnh"
                        aria-label="Xoá ảnh khỏi thư viện"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-white truncate drop-shadow-sm">
                      {img.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer hint */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span>💡 Mẹo: Giữ phím <strong>Ctrl</strong> và <strong>Lăn chuột</strong> để phóng to/thu nhỏ số ảnh trên 1 dòng.</span>
          <span>Click vào ảnh để xem chi tiết toàn màn hình</span>
        </div>
      </div>

      {/* Telegram Lightbox Viewer */}
      {selectedImageIndex !== null && (
        <TelegramImageViewer
          images={images}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onDelete={handleDeleteImage}
        />
      )}
    </div>,
    document.body
  );
}
