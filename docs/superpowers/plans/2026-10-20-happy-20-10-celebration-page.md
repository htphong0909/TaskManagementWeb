# Kế Hoạch Triển Khai: Trang Chúc Mừng 20/10 & Hộp Quà Tình Yêu (Dành Riêng Cho Thy)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tính năng chúc mừng ngày Phụ Nữ Việt Nam 20/10 dành riêng cho Thy với widget hộp quà nổi lấp lánh trên toàn web, trang trải nghiệm `/happy-20-10` mở nắp quà 3D bùng nổ tim hồng, đồng hồ đếm 178 ngày yêu (tính từ 25/04/2026), bức thư tình gõ chữ (typewriter), album ảnh Polaroid kỷ niệm của hai bạn và trình phát nhạc đĩa than lãng mạn.

**Architecture:** Tạo widget `FloatingGiftBox` gắn vào `layout.tsx`; xây dựng route mới `src/app/happy-20-10/page.tsx` kết hợp các component chuyên biệt: `LoveDaysCounter`, `TypewriterLetter`, `PolaroidGallery`, `ImageLightboxModal`, và `VinylMusicPlayer`; chuẩn bị thư mục media tĩnh `public/images/celebrate-20-10/` chứa 8 bức ảnh chọn lọc từ `Desktop/Thy` và `public/audio/romantic-piano.mp3`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide/Canvas-Confetti, Vitest, React Testing Library.

## Global Constraints
- Ngày bắt đầu quen nhau: `2026-04-25T00:00:00+07:00` (đạt mốc 178 ngày vào ngày 20/10/2026)
- Lời nhắn chúc mừng chính xác: `"Hôm nay là ngày 20/10, chúc em yêu xinh đẹp của anh càng ngày càng khoẻ mạnh, xinh đẹp, để mình cùng đi tiếp tục đến mãi sau này."`
- Tuyển chọn 8 ảnh từ `C:\Users\htpho\Desktop\Thy` ưu tiên ảnh chụp chung 2 bạn
- Giao diện chuẩn Premium Glass-Pastel lãng mạn, tinh tế, mượt mà trên cả điện thoại và máy tính
- Không làm ảnh hưởng đến các chức năng hiện có của hệ thống (Task Management, Wood Cut)

---

### Task 1: Chuẩn Bị Tài Nguyên Media (Ảnh Kỷ Niệm & Âm Nhạc)

**Files:**
- Create: `public/images/celebrate-20-10/couple-radiant-smile.jpg`
- Create: `public/images/celebrate-20-10/couple-cute-glasses.jpg`
- Create: `public/images/celebrate-20-10/couple-cozy-cheek.jpg`
- Create: `public/images/celebrate-20-10/couple-shoulder-rest.jpg`
- Create: `public/images/celebrate-20-10/couple-chin-pose.jpg`
- Create: `public/images/celebrate-20-10/thy-gentle-smile.jpg`
- Create: `public/images/celebrate-20-10/thy-peace-sign.jpg`
- Create: `public/images/celebrate-20-10/thy-cute-wink.jpg`
- Create: `public/audio/romantic-piano.mp3`

**Interfaces:**
- Consumes: Files từ `C:\Users\htpho\Desktop\Thy`
- Produces: Thư mục `public/images/celebrate-20-10/` chứa 8 ảnh tĩnh và `public/audio/romantic-piano.mp3`

- [ ] **Step 1: Tạo thư mục và sao chép 8 ảnh chọn lọc từ Desktop/Thy**

Chạy lệnh PowerShell sao chép và đổi tên chuẩn hóa:
```powershell
New-Item -ItemType Directory -Force -Path "public/images/celebrate-20-10"
Copy-Item "C:\Users\htpho\Desktop\Thy\IMG_9091.jpg" "public/images/celebrate-20-10/couple-radiant-smile.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\120bd233-58a0-4529-a82b-71c1b6701af8.jpg" "public/images/celebrate-20-10/couple-cute-glasses.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\IMG_8571.jpg" "public/images/celebrate-20-10/couple-cozy-cheek.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\IMG_8573.jpg" "public/images/celebrate-20-10/couple-shoulder-rest.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\IMG_8909.jpg" "public/images/celebrate-20-10/couple-chin-pose.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\IMG_9099.jpg" "public/images/celebrate-20-10/thy-gentle-smile.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\IMG_9092.jpg" "public/images/celebrate-20-10/thy-peace-sign.jpg"
Copy-Item "C:\Users\htpho\Desktop\Thy\c83a6726-efa6-43a7-8f28-9a10d5cb5a3b.jpg" "public/images/celebrate-20-10/thy-cute-wink.jpg"
```

- [ ] **Step 2: Tạo thư mục audio và chuẩn bị bản nhạc Piano tình yêu**

Tạo thư mục `public/audio` và tạo file giai điệu Piano nhẹ nhàng hoặc tạo Web Audio synth tự động:
```powershell
New-Item -ItemType Directory -Force -Path "public/audio"
```

- [ ] **Step 3: Xác nhận danh sách file đã tồn tại và kích thước hợp lệ**

Run: `Get-ChildItem -Path "public/images/celebrate-20-10"`
Expected: Đủ 8 file ảnh jpeg/jpg với kích thước > 0 bytes.

- [ ] **Step 4: Commit tài nguyên media**

```bash
git add public/images/celebrate-20-10
git commit -m "chore: add curated couple photos for 20/10 celebration"
```

---

### Task 2: Xây Dựng Component Đồng Hồ Đếm Ngày Yêu Nhau & Thư Tình Gõ Chữ

**Files:**
- Create: `src/components/celebrate/LoveDaysCounter.tsx`
- Create: `src/components/celebrate/TypewriterLetter.tsx`
- Test: `src/__tests__/celebrate2010.test.tsx`

**Interfaces:**
- `LoveDaysCounter`: props `{ startDate?: string }`
- `TypewriterLetter`: props `{ message: string, onComplete?: () => void }`

- [ ] **Step 1: Viết test kiểm thử cho LoveDaysCounter và TypewriterLetter**

Tạo file `src/__tests__/celebrate2010.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoveDaysCounter from "@/components/celebrate/LoveDaysCounter";
import TypewriterLetter from "@/components/celebrate/TypewriterLetter";

describe("20/10 Celebration Components", () => {
  it("tính toán chính xác số ngày yêu nhau từ ngày 25/04/2026", () => {
    render(<LoveDaysCounter startDate="2026-04-25T00:00:00" />);
    // Ngày hiện tại là 20/10/2026 => đã qua ít nhất 178 ngày
    const daysElement = screen.getByTestId("love-days-count");
    expect(parseInt(daysElement.textContent || "0", 10)).toBeGreaterThanOrEqual(178);
  });

  it("hiển thị đúng nội dung bức thư tình chúc mừng 20/10", () => {
    const message = "Hôm nay là ngày 20/10, chúc em yêu xinh đẹp của anh càng ngày càng khoẻ mạnh, xinh đẹp, để mình cùng đi tiếp tục đến mãi sau này.";
    render(<TypewriterLetter message={message} speed={0} />);
    expect(screen.getByText((content) => content.includes("Hôm nay là ngày 20/10"))).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: FAIL do component chưa được tạo.

- [ ] **Step 3: Triển khai component `LoveDaysCounter.tsx`**

Tạo file `src/components/celebrate/LoveDaysCounter.tsx`:
```tsx
"use client";

import React, { useState, useEffect } from "react";

interface Props {
  startDate?: string;
}

export default function LoveDaysCounter({ startDate = "2026-04-25T00:00:00" }: Props) {
  const [timePassed, setTimePassed] = useState({
    days: 178,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const start = new Date(startDate).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, now - start);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimePassed({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <div className="bg-white/80 backdrop-blur-md border border-rose-200/80 rounded-3xl p-6 shadow-xl max-w-lg mx-auto text-center space-y-4">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs">
        <span>💕</span> Cột mốc đặc biệt: 25/04/2026
      </div>

      <h3 className="text-sm font-semibold text-slate-600">
        Chúng mình đã cùng nhau đi qua
      </h3>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3">
          <div data-testid="love-days-count" className="text-3xl font-black text-rose-600">
            {timePassed.days}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Ngày</div>
        </div>
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3">
          <div className="text-3xl font-black text-rose-600">
            {String(timePassed.hours).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Giờ</div>
        </div>
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3">
          <div className="text-3xl font-black text-rose-600">
            {String(timePassed.minutes).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Phút</div>
        </div>
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3">
          <div className="text-3xl font-black text-rose-600 animate-pulse">
            {String(timePassed.seconds).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Giây</div>
        </div>
      </div>

      <p className="text-xs text-rose-500 font-medium italic">
        "Mỗi ngày trôi qua bên em đều là một ngày hạnh phúc nhất của anh ✨"
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Triển khai component `TypewriterLetter.tsx`**

Tạo file `src/components/celebrate/TypewriterLetter.tsx`:
```tsx
"use client";

import React, { useState, useEffect } from "react";

interface Props {
  message: string;
  speed?: number;
  onComplete?: () => void;
}

export default function TypewriterLetter({
  message,
  speed = 35,
  onComplete,
}: Props) {
  const [displayedText, setDisplayedText] = useState(speed === 0 ? message : "");
  const [isFinished, setIsFinished] = useState(speed === 0);

  useEffect(() => {
    if (speed === 0) {
      setDisplayedText(message);
      setIsFinished(true);
      if (onComplete) onComplete();
      return;
    }

    let index = 0;
    setDisplayedText("");
    setIsFinished(false);

    const timer = setInterval(() => {
      index++;
      if (index <= message.length) {
        setDisplayedText(message.slice(0, index));
      } else {
        clearInterval(timer);
        setIsFinished(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [message, speed, onComplete]);

  return (
    <div className="relative bg-amber-50/90 backdrop-blur-md border border-amber-200/90 rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto text-slate-800 space-y-4">
      {/* Nơ trang trí góc */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
        🎀 Bức Thư Tình Gửi Em
      </div>

      <div className="pt-2">
        <p className="text-sm font-bold text-rose-600 mb-3">
          Gửi em yêu của anh (Thy),
        </p>
        <p className="text-base sm:text-lg leading-relaxed font-serif text-slate-700 whitespace-pre-line">
          {displayedText}
          {!isFinished && <span className="inline-block w-1.5 h-5 bg-rose-500 ml-1 animate-pulse" />}
        </p>
      </div>

      <div className="text-right pt-4 border-t border-amber-200/60">
        <p className="text-xs font-semibold text-slate-500">Mãi yêu em,</p>
        <p className="text-sm font-bold text-rose-600">Anh Phong ❤️</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Chạy test xác nhận thành công**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: PASS cả 2 test.

- [ ] **Step 6: Commit**

```bash
git add src/components/celebrate/LoveDaysCounter.tsx src/components/celebrate/TypewriterLetter.tsx src/__tests__/celebrate2010.test.tsx
git commit -m "feat: add LoveDaysCounter and TypewriterLetter components"
```

---

### Task 3: Xây Dựng Album Ảnh Polaroid & Lightbox Phóng To

**Files:**
- Create: `src/components/celebrate/PolaroidGallery.tsx`
- Create: `src/components/celebrate/ImageLightboxModal.tsx`
- Test: `src/__tests__/celebrate2010.test.tsx`

**Interfaces:**
- `PolaroidItem`: `{ id: string, src: string, caption: string, rotation: string }`
- `PolaroidGallery`: props `{ onSelectImage: (item: PolaroidItem) => void }`
- `ImageLightboxModal`: props `{ item: PolaroidItem | null, onClose: () => void }`

- [ ] **Step 1: Thêm test case cho PolaroidGallery trong `src/__tests__/celebrate2010.test.tsx`**

```tsx
it("renders danh sách 8 bức ảnh Polaroid kỷ niệm", () => {
  render(<PolaroidGallery onSelectImage={vi.fn()} />);
  const images = screen.getAllByRole("img");
  expect(images.length).toBe(8);
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: FAIL do component chưa được tạo.

- [ ] **Step 3: Triển khai component `PolaroidGallery.tsx`**

Tạo file `src/components/celebrate/PolaroidGallery.tsx`:
```tsx
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
    caption: "Em luôn là cô gái xinh đẹp nhất của anh 🌸",
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
          Chạm vào từng bức ảnh để xem phóng to và thả tim nhé em
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
```

- [ ] **Step 4: Triển khai component `ImageLightboxModal.tsx`**

Tạo file `src/components/celebrate/ImageLightboxModal.tsx`:
```tsx
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
```

- [ ] **Step 5: Chạy test xác nhận thành công**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: PASS toàn bộ test.

- [ ] **Step 6: Commit**

```bash
git add src/components/celebrate/PolaroidGallery.tsx src/components/celebrate/ImageLightboxModal.tsx src/__tests__/celebrate2010.test.tsx
git commit -m "feat: add PolaroidGallery and ImageLightboxModal components"
```

---

### Task 4: Xây Dựng Widget Hộp Quà Nổi & Tích Hợp Vào Layout

**Files:**
- Create: `src/components/celebrate/FloatingGiftBox.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/celebrate2010.test.tsx`

**Interfaces:**
- `FloatingGiftBox`: Render floating link to `/happy-20-10`.

- [ ] **Step 1: Viết test cho FloatingGiftBox**

Thêm vào `src/__tests__/celebrate2010.test.tsx`:
```tsx
it("renders FloatingGiftBox widget với đường dẫn tới /happy-20-10", () => {
  render(<FloatingGiftBox />);
  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", "/happy-20-10");
});
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Triển khai component `FloatingGiftBox.tsx`**

Tạo file `src/components/celebrate/FloatingGiftBox.tsx`:
```tsx
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
```

- [ ] **Step 4: Tích hợp vào `src/app/layout.tsx`**

Cập nhật `src/app/layout.tsx` để nhúng `FloatingGiftBox` ngay trong thẻ `<body>`:
```tsx
import FloatingGiftBox from "@/components/celebrate/FloatingGiftBox";
// ...
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="...">
        {children}
        <FloatingGiftBox />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Chạy test xác nhận thành công**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: PASS toàn bộ.

- [ ] **Step 6: Commit**

```bash
git add src/components/celebrate/FloatingGiftBox.tsx src/app/layout.tsx src/__tests__/celebrate2010.test.tsx
git commit -m "feat: add FloatingGiftBox widget and integrate into RootLayout"
```

---

### Task 5: Xây Dựng Trang Chúc Mừng `/happy-20-10` & Trình Phát Nhạc Đĩa Than

**Files:**
- Create: `src/components/celebrate/VinylMusicPlayer.tsx`
- Create: `src/app/happy-20-10/page.tsx`
- Test: `src/__tests__/celebrate2010.test.tsx`

- [ ] **Step 1: Triển khai component `VinylMusicPlayer.tsx`**

Tạo file `src/components/celebrate/VinylMusicPlayer.tsx` tích hợp audio player lãng mạn:
```tsx
"use client";

import React, { useState, useRef, useEffect } from "react";

interface Props {
  autoPlay?: boolean;
}

export default function VinylMusicPlayer({ autoPlay = false }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="fixed top-5 right-5 z-40 flex items-center gap-2 bg-white/80 backdrop-blur-md border border-rose-200/80 px-3 py-1.5 rounded-full shadow-md">
      {/* File nhạc piano lãng mạn */}
      <audio
        ref={audioRef}
        src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-piano-112199.mp3"
        loop
      />

      {/* Đĩa than xoay tròn */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex items-center gap-2 group cursor-pointer text-xs font-bold text-rose-700"
        title={isPlaying ? "Tạm dừng nhạc" : "Bật nhạc lãng mạn"}
      >
        <span
          className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-rose-400 flex items-center justify-center text-white text-xs ${
            isPlaying ? "animate-spin" : ""
          }`}
          style={{ animationDuration: "3s" }}
        >
          🎵
        </span>
        <span className="hidden sm:inline">
          {isPlaying ? "Đang phát giai điệu yêu thương" : "Bật nhạc tình yêu"}
        </span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Triển khai trang `/happy-20-10/page.tsx`**

Tạo file `src/app/happy-20-10/page.tsx`:
- Quản lý trạng thái `isOpened` (hộp quà đã mở hay chưa).
- Khi mở hộp quà: kích hoạt pháo hoa tim (`confetti`), bật cờ `autoPlayMusic`, và hiển thị mượt mà các khối `LoveDaysCounter`, `TypewriterLetter`, `PolaroidGallery`.
- Quản lý trạng thái xem ảnh phóng to với `ImageLightboxModal`.
- Nút quay lại Workspace ở góc trên bên trái.

- [ ] **Step 3: Kiểm thử toàn diện trang `/happy-20-10`**

Run: `npx vitest run src/__tests__/celebrate2010.test.tsx`
Expected: PASS toàn bộ.

- [ ] **Step 4: Commit**

```bash
git add src/components/celebrate/VinylMusicPlayer.tsx src/app/happy-20-10/page.tsx
git commit -m "feat: complete happy-20-10 celebration page with unboxing, music, and gallery"
```

---

### Task 6: Kiểm Thử Toàn Diện (Regression, Build & Lint Check)

**Files:**
- N/A

- [ ] **Step 1: Chạy toàn bộ test suite dự án**

Run: `npm run test`
Expected: Tất cả các test trong dự án đều PASS.

- [ ] **Step 2: Chạy kiểm tra linting**

Run: `npm run lint`
Expected: 0 lỗi ESLint.

- [ ] **Step 3: Chạy build Next.js sản phẩm**

Run: `npm run build`
Expected: Next.js build thành công 100%, route `/happy-20-10` được biên dịch tĩnh hoàn hảo.

- [ ] **Step 4: Commit hoàn thiện tính năng**

```bash
git commit --allow-empty -m "chore: verify test suite, lint and build for 20/10 celebration feature"
```
