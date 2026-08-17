"use client";

import React, { useState } from "react";
import { PlacedStockSheet, PlacedPiece } from "@/types/woodCut";

interface Props {
  sheet: PlacedStockSheet;
}

export default function CuttingDiagram({ sheet }: Props) {
  const [hoveredPiece, setHoveredPiece] = useState<PlacedPiece | null>(null);

  // Tính toán viewBox theo tỷ lệ
  const padding = 40;
  const viewBoxWidth = sheet.length + padding * 2;
  const viewBoxHeight = sheet.width + padding * 2;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-600 text-white font-bold text-xs">
            {sheet.sheetIndex}
          </span>
          <h3 className="text-sm font-bold text-slate-800">
            Tấm ván gốc #{sheet.sheetIndex} ({sheet.length} × {sheet.width} mm)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            Hiệu suất: {sheet.efficiency}%
          </span>
          <span className="text-slate-500">
            Chi tiết: <strong className="text-slate-700">{sheet.placedPieces.length}</strong>
          </span>
        </div>
      </div>

      {/* SVG Sơ đồ cắt */}
      <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-center p-2">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto max-h-[360px] drop-shadow-sm select-none"
        >
          {/* Tấm ván gốc nền */}
          <rect
            x={padding}
            y={padding}
            width={sheet.length}
            height={sheet.width}
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth={2}
            rx={4}
          />

          {/* Các chi tiết cắt */}
          {sheet.placedPieces.map((piece) => {
            const isHovered = hoveredPiece?.id === piece.id;
            const px = padding + piece.x;
            const py = padding + piece.y;

            return (
              <g
                key={piece.id}
                onMouseEnter={() => setHoveredPiece(piece)}
                onMouseLeave={() => setHoveredPiece(null)}
                className="cursor-pointer transition-all duration-150"
              >
                {/* Hình chữ nhật chi tiết */}
                <rect
                  x={px}
                  y={py}
                  width={piece.length}
                  height={piece.width}
                  fill={piece.color}
                  fillOpacity={isHovered ? 0.95 : 0.75}
                  stroke={isHovered ? "#4338ca" : "#64748b"}
                  strokeWidth={isHovered ? 2.5 : 1}
                  rx={2}
                />

                {/* Nhãn chữ kích thước & tên */}
                {piece.length > 80 && piece.width > 40 && (
                  <text
                    x={px + piece.length / 2}
                    y={py + piece.width / 2 - (piece.width > 70 ? 8 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#1e1b4b"
                    fontSize={Math.min(18, Math.max(10, piece.width / 6))}
                    fontWeight="700"
                  >
                    {piece.name}
                  </text>
                )}
                {piece.length > 80 && piece.width > 60 && (
                  <text
                    x={px + piece.length / 2}
                    y={py + piece.width / 2 + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#312e81"
                    fontSize={Math.min(14, Math.max(9, piece.width / 8))}
                    fontWeight="600"
                  >
                    {piece.length} × {piece.width} mm {piece.rotated ? "⟲" : ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip Hover thông tin chi tiết */}
      {hoveredPiece && (
        <div className="mt-2 text-xs text-slate-700 bg-violet-50/80 border border-violet-100 rounded-lg p-2 flex items-center justify-between">
          <span>
            Đang chọn: <strong>{hoveredPiece.name}</strong> ({hoveredPiece.length} × {hoveredPiece.width} mm)
            {hoveredPiece.rotated && <span className="ml-1 text-violet-600 font-bold">(Đã xoay 90°)</span>}
          </span>
          <span className="text-slate-500 text-[11px]">Tọa độ: ({hoveredPiece.x}, {hoveredPiece.y})</span>
        </div>
      )}
    </div>
  );
}
