"use client";

import React, { useState } from "react";
import { JoinedPieceDiagram } from "@/types/woodCut";
import DiagramZoomModal from "./DiagramZoomModal";

interface Props {
  diagram: JoinedPieceDiagram;
}

export default function JoinedPieceDiagramView({ diagram }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const padding = 35;
  const viewBoxWidth = diagram.targetLength + padding * 2;
  const viewBoxHeight = diagram.targetWidth + padding * 2;

  const isJoined = diagram.seamCount > 0;

  const renderSvg = (inModal = false) => (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={`w-full h-auto select-none drop-shadow-xs ${
        inModal ? "max-h-[80vh]" : "max-h-[220px]"
      }`}
    >
      {/* Khung viền tổng thể mặt gỗ */}
      <rect
        x={padding}
        y={padding}
        width={diagram.targetLength}
        height={diagram.targetWidth}
        fill={isJoined ? "#fef3c7" : "#e0e7ff"}
        stroke={isJoined ? "#d97706" : "#4f46e5"}
        strokeWidth={2.5}
        rx={4}
      />

      {/* Các mẩu ván ghép */}
      {diagram.subPieces.map((sp, idx) => {
        const px = padding + sp.relX;
        const py = padding + sp.relY;
        const cx = px + sp.length / 2;
        const cy = py + sp.width / 2;

        const isRotated = sp.rotatedOnSheet === true;
        const sheetLabel = sp.stockSheetName || (sp.stockSheetIndex ? `Ván ${sp.stockSheetIndex}` : `Ván ${idx + 1}`);

        // Kích thước hiệu dụng theo hướng chữ
        const effW = isRotated ? sp.width : sp.length;
        const effH = isRotated ? sp.length : sp.width;

        const titleFontSize = Math.min(20, Math.max(10, effH / 6, effW / 14));
        const dimFontSize = Math.min(14, Math.max(9, effH / 8.5, effW / 18));

        return (
          <g key={sp.id}>
            {/* Viền mẩu ván */}
            <rect
              x={px}
              y={py}
              width={sp.length}
              height={sp.width}
              fill={isJoined ? "#fde68a" : "#c7d2fe"}
              fillOpacity={0.88}
              stroke={isJoined ? "#b45309" : "#4338ca"}
              strokeWidth={1.8}
              strokeDasharray={isJoined ? "5 3" : undefined}
            />

            {/* Khối chữ hiển thị (tự động xoay theo chiều ván gốc nếu mẩu bị xoay 90 độ) */}
            <g transform={isRotated ? `rotate(-90 ${cx} ${cy})` : undefined}>
              {/* Tên ván gốc (ví dụ: Ván 1, Ván 2) kèm icon xoay ⟲ */}
              <text
                x={cx}
                y={cy - (effH > 48 ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isJoined ? "#78350f" : "#1e1b4b"}
                fontSize={titleFontSize}
                fontWeight="800"
              >
                {sheetLabel} {isRotated ? "⟲" : ""}
              </text>

              {/* Kích thước mẩu */}
              {effH > 40 && (
                <text
                  x={cx}
                  y={cy + (effH > 48 ? 12 : 9)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isJoined ? "#92400e" : "#3730a3"}
                  fontSize={dimFontSize}
                  fontWeight="700"
                >
                  {sp.length} × {sp.width} mm {isRotated ? "(Xoay 90°)" : ""}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`backdrop-blur-md rounded-2xl border shadow-sm p-4 transition-all cursor-pointer group hover:shadow-lg hover:scale-[1.01] flex flex-col justify-between ${
          isJoined
            ? "bg-amber-50/80 border-amber-200/90 hover:border-amber-400"
            : "bg-indigo-50/60 border-indigo-200/80 hover:border-indigo-400"
        }`}
      >
        <div className={`flex items-center justify-between mb-3 border-b pb-2.5 ${
          isJoined ? "border-amber-200/70" : "border-indigo-100"
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{isJoined ? "🧩" : "🪵"}</span>
            <div>
              <h4 className={`text-sm font-extrabold transition-colors ${
                isJoined ? "text-amber-950 group-hover:text-amber-700" : "text-indigo-950 group-hover:text-indigo-700"
              }`}>
                {diagram.parentName}
              </h4>
              <span className="text-[11px] font-bold text-slate-600">
                Kích thước: {diagram.targetLength} × {diagram.targetWidth} mm
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shadow-xs ${
              isJoined
                ? "text-amber-900 bg-amber-100/90 border-amber-300"
                : "text-indigo-800 bg-indigo-100/80 border-indigo-200"
            }`}>
              {isJoined
                ? `Ghép ${diagram.subPieces.length} mẩu`
                : "Tấm nguyên"}
            </span>
            <span className="text-xs font-bold text-slate-600 group-hover:text-violet-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
              🔍 Xem lớn
            </span>
          </div>
        </div>

        <div className="w-full bg-white/95 rounded-xl border border-slate-200/80 p-3 flex items-center justify-center">
          {renderSvg(false)}
        </div>
      </div>

      {/* Modal Phóng To & Kéo Rê (Pan & Zoom) */}
      <DiagramZoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${diagram.parentName} (${diagram.targetLength} × ${diagram.targetWidth} mm)`}
        subtitle={
          isJoined
            ? `Cấu trúc ghép từ ${diagram.subPieces.length} mẩu ván con (${diagram.seamCount} đường nối ghép)`
            : "Mặt gỗ nguyên bản cắt trực tiếp từ ván gốc"
        }
        badge={isJoined ? `Ghép ${diagram.subPieces.length} mẩu` : "Tấm nguyên"}
      >
        <div className="w-full bg-white/95 rounded-2xl border border-slate-300/80 p-6 shadow-2xl">
          {renderSvg(true)}
        </div>
      </DiagramZoomModal>
    </>
  );
}
