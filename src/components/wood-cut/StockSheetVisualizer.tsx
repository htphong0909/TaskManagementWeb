"use client";

import React, { useState } from "react";
import { StockSheetInput, WoodGrain } from "@/types/woodCut";
import DiagramZoomModal from "./DiagramZoomModal";

interface Props {
  stockSheets: StockSheetInput[];
  stockGrain: WoodGrain;
}

export default function StockSheetVisualizer({ stockSheets, stockGrain }: Props) {
  const [activeSheet, setActiveSheet] = useState<StockSheetInput | null>(null);

  if (!stockSheets || stockSheets.length === 0) return null;

  const renderModalSvg = (s: StockSheetInput) => {
    const padding = 70;
    const vbW = s.length + padding * 2;
    const vbH = s.width + padding * 2;
    const patternId = `modal-grain-stock-${s.id}-${stockGrain}`;
    const area = ((s.length * s.width) / 1e6).toFixed(3);

    // Tọa độ đường gióng kích thước
    const topY = padding - 28;
    const leftX = padding - 28;

    return (
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-auto max-h-[75vh] select-none drop-shadow-md"
      >
        <defs>
          {/* Mũi tên đo kích thước */}
          <marker
            id="dim-arrow-stock"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#64748b" />
          </marker>
          <marker
            id="dim-arrow-stock-rev"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 10 2 L 0 5 L 10 8 z" fill="#64748b" />
          </marker>

          {/* Pattern vân gỗ */}
          {stockGrain === "horizontal" && (
            <pattern id={patternId} width="90" height="45" patternUnits="userSpaceOnUse">
              <path
                d="M0 12 Q45 5 90 12 M0 30 Q45 37 90 30"
                fill="none"
                stroke="#c5a47e"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
            </pattern>
          )}
          {stockGrain === "vertical" && (
            <pattern id={patternId} width="45" height="90" patternUnits="userSpaceOnUse">
              <path
                d="M12 0 Q5 45 12 90 M30 0 Q37 45 30 90"
                fill="none"
                stroke="#c5a47e"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
            </pattern>
          )}
        </defs>

        {/* --- ĐƯỜNG ĐO KÍCH THƯỚC (CAD DIMENSIONS) --- */}
        {/* Đường gióng phụ chiều dài (top) */}
        <line
          x1={padding}
          y1={padding - 5}
          x2={padding}
          y2={topY - 10}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <line
          x1={padding + s.length}
          y1={padding - 5}
          x2={padding + s.length}
          y2={topY - 10}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        {/* Đường đo ngang chiều dài */}
        <line
          x1={padding + 8}
          y1={topY}
          x2={padding + s.length - 8}
          y2={topY}
          stroke="#475569"
          strokeWidth="1.8"
          markerStart="url(#dim-arrow-stock-rev)"
          markerEnd="url(#dim-arrow-stock)"
        />
        {/* Nhãn chiều dài */}
        <text
          x={padding + s.length / 2}
          y={topY - 8}
          textAnchor="middle"
          dominantBaseline="baseline"
          fill="#334155"
          fontSize={Math.min(22, Math.max(14, s.length / 45))}
          fontWeight="800"
        >
          Dài: {s.length} mm
        </text>

        {/* Đường gióng phụ chiều rộng (left) */}
        <line
          x1={padding - 5}
          y1={padding}
          x2={leftX - 10}
          y2={padding}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <line
          x1={padding - 5}
          y1={padding + s.width}
          x2={leftX - 10}
          y2={padding + s.width}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        {/* Đường đo dọc chiều rộng */}
        <line
          x1={leftX}
          y1={padding + 8}
          x2={leftX}
          y2={padding + s.width - 8}
          stroke="#475569"
          strokeWidth="1.8"
          markerStart="url(#dim-arrow-stock-rev)"
          markerEnd="url(#dim-arrow-stock)"
        />
        {/* Nhãn chiều rộng (xoay dọc) */}
        <text
          x={leftX - 10}
          y={padding + s.width / 2}
          textAnchor="middle"
          dominantBaseline="ideographic"
          fill="#334155"
          fontSize={Math.min(22, Math.max(14, s.width / 30))}
          fontWeight="800"
          transform={`rotate(-90 ${leftX - 10} ${padding + s.width / 2})`}
        >
          Rộng: {s.width} mm
        </text>

        {/* --- TẤM VÁN PHÔI NỀN GỖ --- */}
        <rect
          x={padding}
          y={padding}
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
            x={padding}
            y={padding}
            width={s.length}
            height={s.width}
            fill={`url(#${patternId})`}
            rx="6"
          />
        )}

        {/* Khối huy hiệu trung tâm (Center Info Badge) */}
        {s.length > 200 && s.width > 120 && (
          <g transform={`translate(${padding + s.length / 2}, ${padding + s.width / 2})`}>
            <rect
              x="-110"
              y="-42"
              width="220"
              height="84"
              rx="12"
              fill="rgba(255, 255, 255, 0.92)"
              stroke="#e2d8cc"
              strokeWidth="1.5"
              className="drop-shadow-sm"
            />
            <text
              x="0"
              y="-18"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#1e293b"
              fontSize="16"
              fontWeight="900"
            >
              {s.name || "Ván phôi"}
            </text>
            <text
              x="0"
              y="6"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#78350f"
              fontSize="13"
              fontWeight="800"
            >
              {s.length} × {s.width} mm • {area} m²
            </text>
            <text
              x="0"
              y="26"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#6b21a8"
              fontSize="12"
              fontWeight="800"
            >
              {stockGrain === "horizontal"
                ? "↔️ Thớ vân ngang"
                : stockGrain === "vertical"
                ? "↕️ Thớ vân dọc"
                : "🚫 Ván không vân"}
            </text>
          </g>
        )}
      </svg>
    );
  };

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
              onClick={() => setActiveSheet(s)}
              className="bg-[#faf7f2]/90 border border-[#e5dcce] rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:border-violet-400 hover:shadow-md hover:scale-[1.008] transition-all cursor-pointer group"
              title="Nhấp để phóng to và xem kích thước chi tiết"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-extrabold text-slate-800 group-hover:text-violet-700 transition-colors">
                  {s.name || `Ván ${idx + 1}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-lg shadow-xs">
                    {s.length} × {s.width} mm
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-violet-700 bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-200 shadow-xs flex items-center gap-0.5">
                    🔍 Xem lớn
                  </span>
                </div>
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

      {/* Modal Phóng To & Kéo Rê (Pan & Zoom) */}
      {activeSheet && (
        <DiagramZoomModal
          isOpen={true}
          onClose={() => setActiveSheet(null)}
          title={`Ván Phôi: ${activeSheet.name || "Ván phôi"} (${activeSheet.length} × ${activeSheet.width} mm)`}
          subtitle={`Hướng thớ gỗ: ${
            stockGrain === "horizontal"
              ? "↔️ Vân ngang"
              : stockGrain === "vertical"
              ? "↕️ Vân dọc"
              : "🚫 Không vân"
          } • Diện tích: ${((activeSheet.length * activeSheet.width) / 1e6).toFixed(3)} m²`}
          badge="Ván phôi"
        >
          <div className="w-full bg-[#fcfbf7] rounded-2xl border border-[#ded5c7] p-6 shadow-2xl flex items-center justify-center">
            {renderModalSvg(activeSheet)}
          </div>
        </DiagramZoomModal>
      )}
    </div>
  );
}
