"use client";

import React from "react";
import { JoinedPieceDiagram } from "@/types/woodCut";

interface Props {
  diagram: JoinedPieceDiagram;
}

export default function JoinedPieceDiagramView({ diagram }: Props) {
  const padding = 35;
  const viewBoxWidth = diagram.targetLength + padding * 2;
  const viewBoxHeight = diagram.targetWidth + padding * 2;

  const isJoined = diagram.seamCount > 0;

  return (
    <div className={`backdrop-blur-md rounded-2xl border shadow-sm p-4 transition-all ${
      isJoined ? "bg-amber-50/70 border-amber-200/90" : "bg-indigo-50/50 border-indigo-200/70"
    }`}>
      <div className={`flex items-center justify-between mb-3 border-b pb-2 ${
        isJoined ? "border-amber-200/60" : "border-indigo-100"
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{isJoined ? "🧩" : "🪵"}</span>
          <h4 className={`text-sm font-bold ${isJoined ? "text-amber-900" : "text-indigo-900"}`}>
            {diagram.parentName} ({diagram.targetLength} × {diagram.targetWidth} mm)
          </h4>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
          isJoined
            ? "text-amber-800 bg-amber-100/80 border-amber-300/80"
            : "text-indigo-700 bg-indigo-100/60 border-indigo-200"
        }`}>
          {isJoined
            ? `Ghép ${diagram.subPieces.length} mẩu (${diagram.seamCount} đường nối)`
            : "Tấm nguyên (Không nối)"}
        </span>
      </div>

      <div className="w-full bg-white/90 rounded-xl border border-slate-200/80 p-2 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto max-h-[220px] select-none drop-shadow-xs"
        >
          {/* Khung viền tổng thể mặt gỗ */}
          <rect
            x={padding}
            y={padding}
            width={diagram.targetLength}
            height={diagram.targetWidth}
            fill={isJoined ? "#fef3c7" : "#e0e7ff"}
            stroke={isJoined ? "#d97706" : "#6366f1"}
            strokeWidth={2}
            rx={4}
          />

          {/* Các mẩu ván ghép */}
          {diagram.subPieces.map((sp, idx) => {
            const px = padding + sp.relX;
            const py = padding + sp.relY;

            return (
              <g key={sp.id}>
                {/* Viền mẩu ván */}
                <rect
                  x={px}
                  y={py}
                  width={sp.length}
                  height={sp.width}
                  fill={isJoined ? "#fde68a" : "#c7d2fe"}
                  fillOpacity={0.85}
                  stroke={isJoined ? "#b45309" : "#4f46e5"}
                  strokeWidth={1.5}
                  strokeDasharray={isJoined ? "5 3" : undefined}
                />

                {/* Chữ hiển thị Số thứ tự ván gốc (Ván #X) */}
                <text
                  x={px + sp.length / 2}
                  y={py + sp.width / 2 - (sp.width > 50 ? 9 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isJoined ? "#78350f" : "#1e1b4b"}
                  fontSize={Math.min(20, Math.max(11, sp.width / 5.5))}
                  fontWeight="800"
                >
                  {sp.stockSheetIndex ? `Ván #${sp.stockSheetIndex}` : `Mảnh #${idx + 1}`}
                </text>

                {/* Chữ hiển thị Kích thước từng mẩu */}
                {sp.width > 45 && (
                  <text
                    x={px + sp.length / 2}
                    y={py + sp.width / 2 + 11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isJoined ? "#92400e" : "#3730a3"}
                    fontSize={Math.min(15, Math.max(9, sp.width / 7.5))}
                    fontWeight="600"
                  >
                    {sp.length} × {sp.width} mm
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
