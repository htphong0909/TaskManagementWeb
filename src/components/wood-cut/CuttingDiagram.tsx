"use client";

import React, { useState } from "react";
import { PlacedStockSheet, PlacedPiece } from "@/types/woodCut";
import DiagramZoomModal from "./DiagramZoomModal";

interface Props {
  sheet: PlacedStockSheet;
}

export default function CuttingDiagram({ sheet }: Props) {
  const [hoveredPiece, setHoveredPiece] = useState<PlacedPiece | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tính toán viewBox theo tỷ lệ
  const padding = 40;
  const viewBoxWidth = sheet.length + padding * 2;
  const viewBoxHeight = sheet.width + padding * 2;

  const renderSvg = (inModal = false) => (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={`w-full h-auto drop-shadow-sm select-none ${
        inModal ? "max-h-[80vh]" : "max-h-[360px]"
      }`}
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
            className="transition-all duration-150"
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
  );

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md hover:border-violet-300 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-600 text-white font-bold text-xs">
              {sheet.sheetIndex}
            </span>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
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
            <span className="text-violet-600 font-semibold flex items-center gap-1 text-[11px] bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100 group-hover:bg-violet-100 transition-all">
              🔍 Xem lớn
            </span>
          </div>
        </div>

        {/* SVG Sơ đồ cắt */}
        <div className="relative w-full overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200/60 flex items-center justify-center p-2">
          {renderSvg(false)}
        </div>
      </div>

      {/* Modal Phóng To & Kéo Rê (Pan & Zoom) */}
      <DiagramZoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Tấm ván gốc #${sheet.sheetIndex} (${sheet.length} × ${sheet.width} mm)`}
        subtitle={`Hiệu suất: ${sheet.efficiency}% • Gồm ${sheet.placedPieces.length} chi tiết cắt`}
        badge={`Ván #${sheet.sheetIndex}`}
      >
        <div className="w-full bg-white/95 rounded-2xl border border-slate-300/80 p-4 shadow-2xl">
          {renderSvg(true)}
        </div>
      </DiagramZoomModal>
    </>
  );
}
