"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}

export default function DiagramZoomModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
}: Props) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Khóa cuộn trang nền (Body scroll lock) khi modal đang mở
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Reset transform khi mở modal mới
  useEffect(() => {
    if (isOpen) {
      resetTransform();
    }
  }, [isOpen, resetTransform]);

  // Lắng nghe sự kiện lăn chuột native với { passive: false } để ngăn chặn hoàn toàn trang ngoài bị cuộn
  useEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setScale((prevScale) => {
        const nextScale = prevScale * zoomFactor;
        return Math.min(Math.max(nextScale, 0.2), 6);
      });
    };

    container.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheelNative);
    };
  }, [isOpen]);

  // Xử lý bắt đầu kéo (Drag start)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Chỉ kéo khi click chuột trái
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // Xử lý di chuyển chuột khi đang kéo (Dragging)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  // Xử lý thả chuột (Drag end)
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 backdrop-blur-md animate-in fade-in duration-200 select-none overscroll-none touch-none"
      onMouseUp={handleMouseUp}
    >
      {/* Header Modal */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900/90 border-b border-slate-700/60 text-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/90 flex items-center justify-center text-sm font-bold shadow-sm">
            🔍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              {badge && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700 cursor-pointer"
          title="Đóng (Esc)"
        >
          ✕
        </button>
      </div>

      {/* Main Canvas Area (Kéo & Zoom) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-6 overscroll-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.08s ease-out",
          }}
          className="w-full max-w-5xl flex items-center justify-center pointer-events-auto"
        >
          {children}
        </div>
      </div>

      {/* Thanh công cụ điều khiển Zoom ở góc dưới */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 backdrop-blur-lg border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl z-10">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.2))}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          title="Thu nhỏ"
        >
          −
        </button>
        <span className="text-xs font-mono font-bold text-slate-200 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(s * 1.25, 6))}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          title="Phóng to"
        >
          +
        </button>
        <div className="w-[1px] h-4 bg-slate-700 mx-1" />
        <button
          type="button"
          onClick={resetTransform}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Vừa màn hình"
        >
          ↺ Vừa khung
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Kích thước 100%"
        >
          100%
        </button>
      </div>

      {/* Hướng dẫn thao tác */}
      <div className="absolute bottom-6 right-6 hidden md:block text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
        🖱️ Lăn chuột để <strong>Phóng to/Thu nhỏ</strong> • Đè chuột trái để <strong>Kéo di chuyển</strong>
      </div>
    </div>
  );
}
