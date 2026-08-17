"use client";

import React from "react";
import { JoinedPieceDiagram } from "@/types/woodCut";

interface Props {
  diagram: JoinedPieceDiagram;
}

export default function JoinedPieceDiagramView({ diagram }: Props) {
  const padding = 30;
  const viewBoxWidth = diagram.targetLength + padding * 2;
  const viewBoxHeight = diagram.targetWidth + padding * 2;

  return (
    <div className="bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-200/80 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 border-b border-amber-200/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧩</span>
          <h4 className="text-sm font-bold text-amber-900">
            Sơ đồ ghép: {diagram.parentName} ({diagram.targetLength} × {diagram.targetWidth} mm)
          </h4>
        </div>
        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
          {diagram.subPieces.length} tấm con ({diagram.seamCount} mối nối)
        </span>
      </div>

      <div className="w-full bg-white/80 rounded-xl border border-amber-200/60 p-2 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto max-h-[220px] select-none"
        >
          {/* Khung viền tấm lớn */}
          <rect
            x={padding}
            y={padding}
            width={diagram.targetLength}
            height={diagram.targetWidth}
            fill="#fef3c7"
            stroke="#d97706"
            strokeWidth={2}
            rx={4}
          />

          {/* Các tấm con ghép */}
          {diagram.subPieces.map((sp, idx) => {
            const px = padding + sp.relX;
            const py = padding + sp.relY;

            return (
              <g key={sp.id}>
                <rect
                  x={px}
                  y={py}
                  width={sp.length}
                  height={sp.width}
                  fill="#fde68a"
                  stroke="#b45309"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <text
                  x={px + sp.length / 2}
                  y={py + sp.width / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#78350f"
                  fontSize={Math.min(16, Math.max(10, sp.width / 5))}
                  fontWeight="700"
                >
                  Tấm ghép #{idx + 1} ({sp.length} × {sp.width})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
