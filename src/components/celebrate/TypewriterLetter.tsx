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
