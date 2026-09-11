"use client";

import React from "react";
import { StockSheetInput, WoodGrain } from "@/types/woodCut";

interface Props {
  stockSheets: StockSheetInput[];
  stockGrain: WoodGrain;
}

export default function StockSheetVisualizer({ stockSheets, stockGrain }: Props) {
  if (!stockSheets || stockSheets.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <span>👁️</span> Mô phỏng ván phôi & hướng thớ gỗ
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            stockGrain === "horizontal"
              ? "bg-violet-50 text-violet-700 border-violet-200"
              : stockGrain === "vertical"
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {stockGrain === "horizontal"
            ? "↔️ Vân ngang"
            : stockGrain === "vertical"
            ? "↕️ Vân dọc"
            : "🚫 Không vân"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stockSheets.map((s, idx) => {
          const grainPatternId = `stock-visual-grain-${s.id}-${stockGrain}`;

          return (
            <div
              key={s.id}
              className="bg-[#faf7f2]/90 border border-[#e5dcce] rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:border-violet-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-extrabold text-slate-800 group-hover:text-violet-700 transition-colors">
                  {s.name || `Ván ${idx + 1}`}
                </span>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-lg shadow-xs">
                  {s.length} × {s.width} mm
                </span>
              </div>

              {/* Khung SVG hình chữ nhật theo đúng tỉ lệ */}
              <div className="w-full h-24 bg-[#f6efe4] rounded-lg border border-[#dfd2be] overflow-hidden flex items-center justify-center p-1.5 relative shadow-inner">
                <svg
                  viewBox={`0 0 ${s.length} ${s.width}`}
                  className="max-h-full max-w-full drop-shadow-xs select-none"
                >
                  <defs>
                    {stockGrain === "horizontal" && (
                      <pattern
                        id={grainPatternId}
                        width="80"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M0 10 Q40 5 80 10 M0 25 Q40 30 80 25"
                          fill="none"
                          stroke="#c5a47e"
                          strokeWidth="1.2"
                          strokeOpacity="0.55"
                        />
                      </pattern>
                    )}
                    {stockGrain === "vertical" && (
                      <pattern
                        id={grainPatternId}
                        width="40"
                        height="80"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M10 0 Q5 40 10 80 M25 0 Q30 40 25 80"
                          fill="none"
                          stroke="#c5a47e"
                          strokeWidth="1.2"
                          strokeOpacity="0.55"
                        />
                      </pattern>
                    )}
                  </defs>

                  {/* Nền ván màu gỗ tự nhiên ấm */}
                  <rect
                    x="0"
                    y="0"
                    width={s.length}
                    height={s.width}
                    fill="#fbf9f4"
                    stroke="#c8b59d"
                    strokeWidth="3.5"
                    rx="6"
                  />

                  {/* Lớp hoa văn vân gỗ SVG */}
                  {stockGrain !== "none" && (
                    <rect
                      x="0"
                      y="0"
                      width={s.length}
                      height={s.width}
                      fill={`url(#${grainPatternId})`}
                      rx="6"
                    />
                  )}
                </svg>

                {/* Nhãn hướng vân mờ ở góc */}
                <span className="absolute bottom-1 right-2 text-[9px] font-bold text-[#8a7258] bg-white/80 backdrop-blur-xs px-1.5 py-0.2 rounded border border-[#dfd2be]/70 pointer-events-none select-none">
                  {stockGrain === "horizontal"
                    ? "↔️ Vân ngang"
                    : stockGrain === "vertical"
                    ? "↕️ Vân dọc"
                    : "🚫 Không vân"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
