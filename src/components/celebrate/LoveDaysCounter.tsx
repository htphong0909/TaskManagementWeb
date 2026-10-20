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
    <div className="bg-white border-2 border-rose-200 rounded-3xl p-6 shadow-xl max-w-lg mx-auto text-center space-y-4">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs">
        <span>💕</span> Cột mốc đặc biệt: 25/04/2026
      </div>

      <h3 className="text-sm font-semibold text-slate-700">
        Chúng mình đã cùng nhau đi qua
      </h3>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3">
          <div data-testid="love-days-count" className="text-3xl font-black text-rose-600">
            {timePassed.days}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Ngày</div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3">
          <div className="text-3xl font-black text-rose-600">
            {String(timePassed.hours).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Giờ</div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3">
          <div className="text-3xl font-black text-rose-600">
            {String(timePassed.minutes).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Phút</div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3">
          <div className="text-3xl font-black text-rose-600 animate-pulse">
            {String(timePassed.seconds).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-bold text-rose-400 uppercase mt-0.5">Giây</div>
        </div>
      </div>

      <p className="text-xs text-rose-600 font-medium italic">
        &quot;Mỗi ngày trôi qua bên em đều là một ngày hạnh phúc nhất của anh ✨&quot;
      </p>
    </div>
  );
}
