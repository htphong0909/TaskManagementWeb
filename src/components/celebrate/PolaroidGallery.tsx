"use client";

import React from "react";

export interface PolaroidItem {
  id: string;
  src: string;
  caption: string;
  rotation: string;
}

export const POLAROID_PHOTOS: PolaroidItem[] = [
  {
    id: "photo-1",
    src: "/images/celebrate-20-10/couple-radiant-smile.jpg",
    caption: "Nụ cười rạng rỡ của chúng mình ☀️",
    rotation: "-rotate-2",
  },
  {
    id: "photo-2",
    src: "/images/celebrate-20-10/couple-cute-glasses.jpg",
    caption: "Hai đứa nhí nhảnh bên nhau 🤓",
    rotation: "rotate-3",
  },
  {
    id: "photo-3",
    src: "/images/celebrate-20-10/couple-cozy-cheek.jpg",
    caption: "Khoảnh khắc kề má ấm áp 💕",
    rotation: "-rotate-1",
  },
  {
    id: "photo-4",
    src: "/images/celebrate-20-10/couple-shoulder-rest.jpg",
    caption: "Tựa đầu bình yên vào vai anh 💤",
    rotation: "rotate-2",
  },
  {
    id: "photo-5",
    src: "/images/celebrate-20-10/couple-chin-pose.jpg",
    caption: "Dáng chống cằm thương hiệu ✌️",
    rotation: "-rotate-3",
  },
  {
    id: "photo-6",
    src: "/images/celebrate-20-10/thy-gentle-smile.jpg",
    caption: "Em yêu luôn là cô gái xinh đẹp nhất của anh 🌸",
    rotation: "rotate-1",
  },
  {
    id: "photo-7",
    src: "/images/celebrate-20-10/thy-peace-sign.jpg",
    caption: "Năng lượng vui vẻ mỗi ngày ✨",
    rotation: "-rotate-2",
  },
  {
    id: "photo-8",
    src: "/images/celebrate-20-10/thy-cute-wink.jpg",
    caption: "Cái nháy mắt đốn tim anh 😉",
    rotation: "rotate-3",
  },
];

interface Props {
  onSelectImage: (item: PolaroidItem) => void;
}

export default function PolaroidGallery({ onSelectImage }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black text-rose-700 tracking-wide flex items-center justify-center gap-2">
          <span>📸</span> Kho Báu Kỷ Niệm Của Chúng Mình
        </h3>
        <p className="text-xs text-rose-500 font-medium">
          Chạm vào từng bức ảnh để xem phóng to và thả tim nhé em yêu ✨
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
        {POLAROID_PHOTOS.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectImage(item)}
            className={`group relative bg-white p-3 pb-5 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:rotate-0 hover:z-20 cursor-pointer ${item.rotation}`}
          >
            {/* Miếng băng dính Washi Tape pastel */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-rose-200/80 backdrop-blur-xs rounded-sm opacity-80 shadow-xs rotate-1 border border-white/60" />

            {/* Khung ảnh Polaroid */}
            <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-slate-100">
              <img
                src={item.src}
                alt={item.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>

            {/* Dòng chữ viết tay Polaroid */}
            <div className="mt-3 text-center">
              <p className="text-xs font-semibold text-slate-700 italic group-hover:text-rose-600 transition-colors">
                {item.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
