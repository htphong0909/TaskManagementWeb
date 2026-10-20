"use client";

import React, { useState } from "react";
import { PolaroidItem } from "./PolaroidGallery";

interface Props {
  item: PolaroidItem | null;
  onClose: () => void;
}

export default function ImageLightboxModal({ item, onClose }: Props) {
  const [hearts, setHearts] = useState<{ id: number; left: number }[]>([]);

  if (!item) return null;

  const handleBurstHearts = () => {
    const newHearts = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      left: 30 + Math.random() * 40,
    }));
    setHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-all cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Khung ảnh lớn */}
        <div className="relative aspect-4/5 max-h-[65vh] w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
          <img
            src={item.src}
            alt={item.caption}
            className="w-full h-full object-contain"
          />

          {/* Tim bay khi bấm thả tim */}
          {hearts.map((h) => (
            <span
              key={h.id}
              style={{ left: `${h.left}%` }}
              className="absolute bottom-6 text-3xl animate-bounce text-rose-500 pointer-events-none select-none"
            >
              💖
            </span>
          ))}
        </div>

        {/* Caption & Nút thả tim */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm font-bold text-slate-800 italic">
            {item.caption}
          </p>
          <button
            type="button"
            onClick={handleBurstHearts}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <span>❤️</span> Thả Tim
          </button>
        </div>
      </div>
    </div>
  );
}
