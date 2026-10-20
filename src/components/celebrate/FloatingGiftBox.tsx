"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FloatingGiftBox() {
  const pathname = usePathname();

  // Không hiển thị hộp quà nổi nếu đã đang ở trang chúc mừng
  if (pathname === "/happy-20-10") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      {/* Tooltip ngọt ngào */}
      <div className="absolute bottom-full right-0 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-rose-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-2xl shadow-xl whitespace-nowrap flex items-center gap-1.5 animate-bounce">
          <span>🎀</span> Món quà 20/10 dành riêng cho em Thy ✨
        </div>
      </div>

      <Link
        href="/happy-20-10"
        aria-label="Mở món quà 20/10"
        className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/80 cursor-pointer"
      >
        {/* Vòng sáng ping hào quang */}
        <span className="absolute -inset-1 rounded-2xl bg-rose-400/50 animate-ping pointer-events-none" />

        {/* Biểu tượng hộp quà */}
        <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">
          🎁
        </span>

        {/* Huy hiệu 20/10 nhỏ ở góc */}
        <span className="absolute -top-2 -left-2 bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-xs">
          20/10
        </span>
      </Link>
    </div>
  );
}
