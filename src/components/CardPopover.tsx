import React from "react";

interface CardPopoverProps {
  title: string;
  content: string | null;
  rect: DOMRect | null;
  onClose: () => void;
}

export default function CardPopover({ title, content, rect, onClose }: CardPopoverProps) {
  if (!rect) return null;

  const popupWidth = 320;
  const margin = 12;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;

  // Tính toán hiển thị bên phải hoặc trái
  const spaceOnRight = screenWidth - rect.right;
  const showOnRight = spaceOnRight > popupWidth + margin;

  const leftPosition = showOnRight 
    ? rect.right + margin 
    : rect.left - popupWidth - margin;

  const topPosition = rect.top;

  return (
    <div
      className="fixed bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/40 p-5 w-80 z-50 transition-all duration-200"
      style={{
        left: `${leftPosition}px`,
        top: `${topPosition}px`,
      }}
      onMouseLeave={onClose}
    >
      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">
        {title}
      </h4>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
        {content || "Chưa có mô tả chi tiết cho thẻ này."}
      </p>
    </div>
  );
}
