"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { BoardImage } from "@/types/gallery";

export interface TelegramImageViewerProps {
  images: BoardImage[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (image: BoardImage) => Promise<void>;
}

export default function TelegramImageViewer({
  images,
  initialIndex,
  onClose,
  onDelete,
}: TelegramImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentImage = images[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // Auto scroll active thumbnail into center view
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeEl = thumbnailsRef.current.children[currentIndex] as HTMLElement;
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentIndex]);

  const handleDelete = async () => {
    if (!currentImage || !onDelete) return;
    if (!window.confirm(`Bạn có chắc muốn xoá ảnh "${currentImage.name}" khỏi thư viện?`)) return;
    try {
      setIsDeleting(true);
      await onDelete(currentImage);
      if (images.length <= 1) {
        onClose();
      } else {
        setCurrentIndex((prev) => Math.min(prev, images.length - 2));
      }
    } catch (err) {
      console.error("Lỗi xoá ảnh:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const a = document.createElement("a");
    a.href = currentImage.url;
    a.download = currentImage.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!mounted || !currentImage) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent text-white z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white/70 bg-white/10 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </span>
          <h3 className="text-sm font-semibold truncate max-w-md" title={currentImage.name}>
            {currentImage.name}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Tải ảnh về máy"
            aria-label="Tải ảnh về"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 hover:bg-red-500/20 text-white/80 hover:text-red-400 rounded-xl transition-all cursor-pointer"
              title="Xoá ảnh này"
              aria-label="Xoá ảnh"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all ml-2 cursor-pointer"
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {/* Prev Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all hover:scale-110 z-20 cursor-pointer"
            aria-label="Ảnh trước"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Center Image */}
        <div className="max-w-full max-h-full flex items-center justify-center">
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-200"
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all hover:scale-110 z-20 cursor-pointer"
            aria-label="Ảnh tiếp theo"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (Telegram style) */}
      <div className="px-6 py-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center z-10">
        <div
          ref={thumbnailsRef}
          className="flex items-center gap-2 overflow-x-auto max-w-4xl py-2 px-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 scrollbar-none"
        >
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                idx === currentIndex
                  ? "ring-2 ring-violet-400 scale-110 opacity-100 z-10 shadow-lg shadow-violet-500/20"
                  : "opacity-40 hover:opacity-80"
              }`}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
