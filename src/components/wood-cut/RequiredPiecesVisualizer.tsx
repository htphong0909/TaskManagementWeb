"use client";

import React from "react";
import { RequiredPieceInput, WoodGrain } from "@/types/woodCut";

const PASTEL_COLORS = [
  { bg: "#ede9fe", border: "#c4b5fd", text: "#5b21b6", stroke: "#8b5cf6" }, // violet
  { bg: "#e0f2fe", border: "#7dd3fc", text: "#0369a1", stroke: "#0284c7" }, // sky
  { bg: "#d1fae5", border: "#6ee7b7", text: "#047857", stroke: "#059669" }, // emerald
  { bg: "#fef3c7", border: "#fcd34d", text: "#b45309", stroke: "#d97706" }, // amber
  { bg: "#fce7f3", border: "#f9a8d4", text: "#be185d", stroke: "#db2777" }, // pink
  { bg: "#e0e7ff", border: "#a5b4fc", text: "#3730a3", stroke: "#4f46e5" }, // indigo
  { bg: "#ccfbf1", border: "#5eead4", text: "#0f766e", stroke: "#0d9488" }, // teal
  { bg: "#ffedd5", border: "#fdba74", text: "#c2410c", stroke: "#ea580c" }, // orange
  { bg: "#ecfccb", border: "#bef264", text: "#4d7c0f", stroke: "#65a30d" }, // lime
];

interface Props {
  pieces: RequiredPieceInput[];
  stockGrain: WoodGrain;
}

export default function RequiredPiecesVisualizer({ pieces, stockGrain }: Props) {
  if (!pieces || pieces.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
          <span>👁️</span> Mô phỏng mặt gỗ thành phẩm & hướng vân ({pieces.length} loại)
        </span>
        {stockGrain === "none" && (
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            ⚠️ Ván phôi không vân $\to$ Các mặt gỗ tự do xoay
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {pieces.map((p, idx) => {
          const colorTheme = PASTEL_COLORS[idx % PASTEL_COLORS.length];
          const rawGrain: WoodGrain =
            p.grain || (p.orientation === "vertical" ? "vertical" : p.orientation === "horizontal" ? "horizontal" : "none");
          const effectiveGrain: WoodGrain = stockGrain === "none" ? "none" : rawGrain;
          const patternId = `piece-grain-pattern-${p.id}-${effectiveGrain}`;

          return (
            <div
              key={p.id}
              className="bg-white/80 backdrop-blur-xs border border-slate-200/80 rounded-xl p-2 flex flex-col justify-between shadow-xs hover:border-violet-300 transition-all group"
            >
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="font-extrabold text-slate-800 truncate max-w-[90px] group-hover:text-violet-700 transition-colors" title={p.name}>
                  {p.name || `Tấm ${idx + 1}`}
                </span>
                <span className="font-bold text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">
                  ×{p.quantity}
                </span>
              </div>

              {/* Khung SVG đúng tỉ lệ */}
              <div className="w-full h-16 bg-slate-50/80 rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center p-1 relative shadow-inner">
                <svg
                  viewBox={`0 0 ${p.length} ${p.width}`}
                  className="max-h-full max-w-full drop-shadow-xs select-none"
                >
                  <defs>
                    {effectiveGrain === "horizontal" && (
                      <pattern
                        id={patternId}
                        width="60"
                        height="30"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M0 8 Q30 3 60 8 M0 20 Q30 25 60 20"
                          fill="none"
                          stroke={colorTheme.stroke}
                          strokeWidth="1.2"
                          strokeOpacity="0.5"
                        />
                      </pattern>
                    )}
                    {effectiveGrain === "vertical" && (
                      <pattern
                        id={patternId}
                        width="30"
                        height="60"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M8 0 Q3 30 8 60 M20 0 Q25 30 20 60"
                          fill="none"
                          stroke={colorTheme.stroke}
                          strokeWidth="1.2"
                          strokeOpacity="0.5"
                        />
                      </pattern>
                    )}
                  </defs>

                  <rect
                    x="0"
                    y="0"
                    width={p.length}
                    height={p.width}
                    fill={colorTheme.bg}
                    stroke={colorTheme.border}
                    strokeWidth="2.5"
                    rx="4"
                  />

                  {effectiveGrain !== "none" && (
                    <rect
                      x="0"
                      y="0"
                      width={p.length}
                      height={p.width}
                      fill={`url(#${patternId})`}
                      rx="4"
                    />
                  )}
                </svg>

                {/* Badge trạng thái vân ở góc */}
                <span
                  className="absolute bottom-0.5 right-1 text-[8px] font-extrabold px-1 rounded shadow-xs"
                  style={{ backgroundColor: "rgba(255,255,255,0.85)", color: colorTheme.text }}
                >
                  {effectiveGrain === "horizontal"
                    ? "↔️ Vân ngang"
                    : effectiveGrain === "vertical"
                    ? "↕️ Vân dọc"
                    : "🔄 Không vân"}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>{p.length} × {p.width} mm</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
