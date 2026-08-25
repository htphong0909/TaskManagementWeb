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
        inModal ? "max-h-[80vh]" : "max-h-[380px]"
      }`}
    >
      <defs>
        {/* Pattern vân gỗ mờ cho nền ván */}
        <pattern id={`wood-grain-${sheet.sheetIndex}`} width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M0 20 Q40 10 80 20 M0 50 Q40 60 80 50" fill="none" stroke="#eedfc8" strokeWidth="0.8" strokeOpacity="0.4" />
        </pattern>
        {/* Pattern kẻ chéo cho phần gỗ thừa (scrap) */}
        <pattern id={`scrap-pattern-${sheet.sheetIndex}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12 L12 0 M-3 3 L3 -3 M9 15 L15 9" stroke="#e2d4be" strokeWidth="0.8" strokeOpacity="0.6" />
        </pattern>
      </defs>

      {/* Tấm ván gốc nền màu gỗ sáng ấm */}
      <rect
        x={padding}
        y={padding}
        width={sheet.length}
        height={sheet.width}
        fill="#fbf8f2"
        stroke="#cabaa2"
        strokeWidth={2.5}
        rx={6}
      />
      {/* Lớp hoa văn vân gỗ mờ */}
      <rect
        x={padding}
        y={padding}
        width={sheet.length}
        height={sheet.width}
        fill={`url(#wood-grain-${sheet.sheetIndex})`}
        rx={6}
      />
      {/* Kẻ chéo phần gỗ thừa */}
      <rect
        x={padding}
        y={padding}
        width={sheet.length}
        height={sheet.width}
        fill={`url(#scrap-pattern-${sheet.sheetIndex})`}
        rx={6}
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
              fillOpacity={isHovered ? 0.98 : 0.88}
              stroke={isHovered ? "#312e81" : "#475569"}
              strokeWidth={isHovered ? 3 : 1.2}
              rx={3}
            />

            {/* Nhãn chữ kích thước & tên */}
            {piece.length > 80 && piece.width > 40 && (
              <text
                x={px + piece.length / 2}
                y={py + piece.width / 2 - (piece.width > 70 ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#0f172a"
                fontSize={Math.min(18, Math.max(10, piece.width / 6))}
                fontWeight="800"
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
                fill="#1e293b"
                fontSize={Math.min(14, Math.max(9, piece.width / 8))}
                fontWeight="700"
              >
                {piece.length} × {piece.width} mm {piece.rotated ? "⟲ Ngang vân" : "(Dọc vân)"}
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
        className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-4 hover:shadow-lg hover:border-violet-400 hover:scale-[1.005] transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-extrabold text-xs shadow-sm">
              #{sheet.sheetIndex}
            </span>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 group-hover:text-violet-700 transition-colors">
                Tấm ván gốc #{sheet.sheetIndex}
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">
                Khổ: {sheet.length} × {sheet.width} mm
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
              {sheet.efficiency}%
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
              {sheet.placedPieces.length} chi tiết
            </span>
            <span className="text-violet-700 font-bold flex items-center gap-1 text-xs bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100 group-hover:bg-violet-100 group-hover:border-violet-300 transition-all shadow-xs">
              🔍 Xem lớn
            </span>
          </div>
        </div>

        {/* SVG Sơ đồ cắt nền ván gỗ sáng */}
        <div className="relative w-full overflow-hidden bg-[#faf7f2]/90 rounded-xl border border-[#e4d9c7] flex items-center justify-center p-3">
          {renderSvg(false)}
        </div>
      </div>

      {/* Modal Phóng To & Kéo Rê (Pan & Zoom) */}
      <DiagramZoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Tấm ván gốc #${sheet.sheetIndex} (${sheet.length} × {sheet.width} mm)`}
        subtitle={`Hiệu suất: ${sheet.efficiency}% • Gồm ${sheet.placedPieces.length} chi tiết cắt`}
        badge={`Ván #${sheet.sheetIndex}`}
      >
        <div className="w-full bg-[#fbf9f4] rounded-2xl border border-[#dfd2be] p-5 shadow-2xl">
          {renderSvg(true)}
        </div>
      </DiagramZoomModal>
    </>
  );
}
