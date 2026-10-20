"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoveDaysCounter from "@/components/celebrate/LoveDaysCounter";
import TypewriterLetter from "@/components/celebrate/TypewriterLetter";
import PolaroidGallery, { PolaroidItem } from "@/components/celebrate/PolaroidGallery";
import ImageLightboxModal from "@/components/celebrate/ImageLightboxModal";
import VinylMusicPlayer from "@/components/celebrate/VinylMusicPlayer";

export default function Happy2010Page() {
  const [isOpened, setIsOpened] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PolaroidItem | null>(null);
  const [burstConfetti, setBurstConfetti] = useState(false);
  const [floatingPetals, setFloatingPetals] = useState<
    { id: number; left: number; delay: number; duration: number; size: number }[]
  >([]);

  // Lời nhắn chính xác theo yêu cầu người dùng
  const letterMessage =
    "Hôm nay là ngày 20/10, chúc em yêu xinh đẹp của anh càng ngày càng khoẻ mạnh, xinh đẹp, để mình cùng đi tiếp tục đến mãi sau này.";

  useEffect(() => {
    // Sinh các cánh hoa / trái tim bay lơ lửng nhẹ nhàng
    const petals = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 95,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 6,
      size: 14 + Math.random() * 12,
    }));
    setFloatingPetals(petals);
  }, []);

  const handleOpenGift = () => {
    setIsOpened(true);
    setBurstConfetti(true);
    setTimeout(() => {
      setBurstConfetti(false);
    }, 4000);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-rose-100/70 via-pink-50/50 to-rose-100/60 pb-20 select-none">
      {/* Cánh hoa & Tim bay lãng mạn ngập tràn màn hình */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {floatingPetals.map((petal) => (
          <span
            key={petal.id}
            style={{
              left: `${petal.left}%`,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
              fontSize: `${petal.size}px`,
            }}
            className="absolute -top-10 opacity-70 animate-fall"
          >
            {petal.id % 2 === 0 ? "🌸" : "💖"}
          </span>
        ))}
      </div>

      {/* Nút quay về Workspace */}
      <div className="fixed top-5 left-5 z-40">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 hover:bg-white text-slate-700 text-xs font-bold shadow-md hover:shadow-lg transition-all border border-rose-200 backdrop-blur-md cursor-pointer"
        >
          <span>←</span> Quay lại Workspace
        </Link>
      </div>

      {/* Trình phát nhạc đĩa than tình yêu */}
      <VinylMusicPlayer autoPlay={isOpened} />

      {/* Màn 1: Hộp Quà 3D Mở Nắp Bất Ngờ */}
      {!isOpened ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <div className="max-w-md w-full space-y-8 animate-fade-in">
            <div className="space-y-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-300 text-xs font-black tracking-widest uppercase">
                20 Tháng 10 • Vietnamese Women&apos;s Day
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-rose-800 tracking-tight">
                Món Quà Dành Riêng Cho Em Thy 💝
              </h1>
              <p className="text-sm font-medium text-slate-600">
                Anh có một điều bất ngờ đặc biệt muốn gửi tặng em...
              </p>
            </div>

            {/* Hộp quà 3D có thể bấm */}
            <div
              onClick={handleOpenGift}
              className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleOpenGift();
              }}
              aria-label="Mở hộp quà"
            >
              {/* Ánh hào quang tỏa sáng */}
              <div className="absolute -inset-4 rounded-3xl bg-rose-400/30 blur-xl group-hover:bg-rose-400/50 transition-all duration-500 animate-pulse" />

              {/* Thân hộp quà */}
              <div className="relative w-full h-full bg-gradient-to-tr from-rose-600 via-pink-600 to-rose-500 rounded-3xl shadow-2xl flex flex-col items-center justify-center border-4 border-rose-300 transform group-hover:scale-105 transition-all duration-300">
                {/* Ruy băng chữ thập */}
                <div className="absolute inset-y-0 w-8 bg-amber-300 shadow-md flex items-center justify-center" />
                <div className="absolute inset-x-0 h-8 bg-amber-300 shadow-md" />

                {/* Nơ ruy băng nổi bật */}
                <div className="relative z-10 text-5xl sm:text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg animate-bounce">
                  🎀
                </div>
              </div>

              {/* Tag nhãn gắn vào hộp */}
              <div className="absolute -bottom-3 -right-2 bg-white text-rose-600 text-xs font-black px-3 py-1 rounded-xl shadow-lg border border-rose-200 rotate-6 group-hover:rotate-0 transition-transform">
                Gửi: Bé Thy Yêu ❤️
              </div>
            </div>

            <p className="text-xs text-rose-600 font-bold animate-pulse">
              ✨ Chạm vào chiếc hộp để mở quà nhé em yêu ✨
            </p>
          </div>
        </div>
      ) : (
        /* Màn 2: Không Gian Kỷ Niệm 20/10 Rực Rỡ */
        <div className="relative z-10 max-w-5xl mx-auto pt-20 px-4 space-y-12 animate-fade-in">
          {/* Pháo hoa tim bùng nổ */}
          {burstConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className="text-6xl animate-ping">💖🎉🌸✨</div>
            </div>
          )}

          {/* Header chúc mừng */}
          <header className="text-center space-y-3 pt-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-100/90 text-rose-700 border border-rose-300 text-xs sm:text-sm font-black shadow-sm">
              <span>💐</span> CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10 <span>💐</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-rose-800 tracking-tight">
              Gửi Người Con Gái Tuyệt Vời Nhất Của Anh
            </h1>
            <p className="text-sm sm:text-base font-semibold text-rose-600">
              Phong ❤️ Thy — Mãi Mãi Một Tình Yêu
            </p>
          </header>

          {/* Cột mốc 25/04/2026 & Đồng hồ đếm 178 ngày yêu */}
          <section>
            <LoveDaysCounter startDate="2026-04-25T00:00:00" />
          </section>

          {/* Bức thư tình gõ máy chữ */}
          <section>
            <TypewriterLetter message={letterMessage} speed={30} />
          </section>

          {/* Album ảnh Polaroid kỷ niệm */}
          <section className="pt-6">
            <PolaroidGallery onSelectImage={(img) => setSelectedImage(img)} />
          </section>

          {/* Lời kết ngọt ngào */}
          <footer className="text-center pt-8 pb-12 space-y-2 text-rose-600">
            <p className="text-sm font-bold">
              Chúc em một ngày 20/10 thật nhiều niềm vui, luôn xinh đẹp và rạng rỡ nhất! 🌹
            </p>
            <p className="text-xs text-rose-400 font-medium">
              Made with endless love by Phong for Thy 💕
            </p>
          </footer>
        </div>
      )}

      {/* Modal phóng to ảnh Polaroid */}
      <ImageLightboxModal
        item={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Global animations style */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
