"use client";

import React, { useState } from "react";
import { RequiredPieceInput, WoodGrain } from "@/types/woodCut";
import DiagramZoomModal from "./DiagramZoomModal";

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
  const [activePiece, setActivePiece] = useState<RequiredPieceInput | null>(null);

  if (!pieces || pieces.length === 0) return null;

  const renderModalSvg = (p: RequiredPieceInput) => {
    const padding = 70;
    const vbW = p.length + padding * 2;
    const vbH = p.width + padding * 2;

    const pieceIdx = pieces.findIndex((item) => item.id === p.id);
    const colorTheme = PASTEL_COLORS[(pieceIdx >= 0 ? pieceIdx : 0) % PASTEL_COLORS.length];

    const rawGrain: WoodGrain =
      p.grain ||
      (p.orientation === "vertical"
        ? "vertical"
        : p.orientation === "horizontal"
        ? "horizontal"
        : "none");
    const effectiveGrain: WoodGrain = stockGrain === "none" ? "none" : rawGrain;
    const patternId = `modal-grain-piece-${p.id}-${effectiveGrain}`;

    const singleArea = ((p.length * p.width) / 1e6).toFixed(3);
    const totalArea = ((p.length * p.width * p.quantity) / 1e6).toFixed(3);

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
            id="dim-arrow-piece"
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
            id="dim-arrow-piece-rev"
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
          {effectiveGrain === "horizontal" && (
            <pattern id={patternId} width="70" height="35" patternUnits="userSpaceOnUse">
              <path
                d="M0 10 Q35 4 70 10 M0 24 Q35 30 70 24"
                fill="none"
                stroke={colorTheme.stroke}
                strokeWidth="1.4"
                strokeOpacity="0.55"
              />
            </pattern>
          )}
          {effectiveGrain === "vertical" && (
            <pattern id={patternId} width="35" height="70" patternUnits="userSpaceOnUse">
              <path
                d="M10 0 Q4 35 10 70 M24 0 Q30 35 24 70"
                fill="none"
                stroke={colorTheme.stroke}
                strokeWidth="1.4"
                strokeOpacity="0.55"
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
          x1={padding + p.length}
          y1={padding - 5}
          x2={padding + p.length}
          y2={topY - 10}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        {/* Đường đo ngang chiều dài */}
        <line
          x1={padding + 8}
          y1={topY}
          x2={padding + p.length - 8}
          y2={topY}
          stroke="#475569"
          strokeWidth="1.8"
          markerStart="url(#dim-arrow-piece-rev)"
          markerEnd="url(#dim-arrow-piece)"
        />
        {/* Nhãn chiều dài */}
        <text
          x={padding + p.length / 2}
          y={topY - 8}
          textAnchor="middle"
          dominantBaseline="auto"
          fill="#334155"
          fontSize={Math.min(22, Math.max(14, p.length / 40))}
          fontWeight="800"
        >
          Dài: {p.length} mm
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
          y1={padding + p.width}
          x2={leftX - 10}
          y2={padding + p.width}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        {/* Đường đo dọc chiều rộng */}
        <line
          x1={leftX}
          y1={padding + 8}
          x2={leftX}
          y2={padding + p.width - 8}
          stroke="#475569"
          strokeWidth="1.8"
          markerStart="url(#dim-arrow-piece-rev)"
          markerEnd="url(#dim-arrow-piece)"
        />
        {/* Nhãn chiều rộng (xoay dọc) */}
        <text
          x={leftX - 10}
          y={padding + p.width / 2}
          textAnchor="middle"
          dominantBaseline="ideographic"
          fill="#334155"
          fontSize={Math.min(22, Math.max(14, p.width / 28))}
          fontWeight="800"
          transform={`rotate(-90 ${leftX - 10} ${padding + p.width / 2})`}
        >
          Rộng: {p.width} mm
        </text>

        {/* --- HÌNH CHỮ NHẬT CHI TIẾT --- */}
        <rect
          x={padding}
          y={padding}
          width={p.length}
          height={p.width}
          fill={colorTheme.bg}
          stroke={colorTheme.border}
          strokeWidth="3.5"
          rx="6"
        />

        {/* Lớp hoa văn vân gỗ SVG */}
        {effectiveGrain !== "none" && (
          <rect
            x={padding}
            y={padding}
            width={p.length}
            height={p.width}
            fill={`url(#${patternId})`}
            rx="6"
          />
        )}

        {/* Khối huy hiệu trung tâm (Center Info Badge) */}
        {p.length > 180 && p.width > 100 && (
          <g transform={`translate(${padding + p.length / 2}, ${padding + p.width / 2})`}>
            <rect
              x="-120"
              y="-44"
              width="240"
              height="88"
              rx="12"
              fill="rgba(255, 255, 255, 0.94)"
              stroke={colorTheme.border}
              strokeWidth="1.5"
              className="drop-shadow-sm"
            />
            <text
              x="0"
              y="-20"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#1e293b"
              fontSize="16"
              fontWeight="900"
            >
              {p.name || "Chi tiết"}
            </text>
            <text
              x="0"
              y="4"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colorTheme.text}
              fontSize="13"
              fontWeight="800"
            >
              {p.length} × {p.width} mm • {singleArea} m²
              {p.quantity > 1 ? ` (Tổng: ${totalArea} m²)` : ""}
            </text>
            <text
              x="0"
              y="26"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#475569"
              fontSize="12"
              fontWeight="800"
            >
              Số lượng: {p.quantity} tấm •{" "}
              {effectiveGrain === "horizontal"
                ? "↔️ Vân ngang"
                : effectiveGrain === "vertical"
                ? "↕️ Vân dọc"
                : "🔄 Tự do"}
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
            p.grain ||
            (p.orientation === "vertical"
              ? "vertical"
              : p.orientation === "horizontal"
              ? "horizontal"
              : "none");
          const effectiveGrain: WoodGrain = stockGrain === "none" ? "none" : rawGrain;
          const patternId = `piece-grain-pattern-${p.id}-${effectiveGrain}`;

          return (
            <div
              key={p.id}
              onClick={() => setActivePiece(p)}
              className="bg-white/80 backdrop-blur-xs border border-slate-200/80 rounded-xl p-2 flex flex-col justify-between shadow-xs hover:border-violet-400 hover:shadow-md hover:scale-[1.008] transition-all cursor-pointer group"
              title="Nhấp để phóng to và xem kích thước chi tiết"
            >
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span
                  className="font-extrabold text-slate-800 truncate max-w-[85px] group-hover:text-violet-700 transition-colors"
                  title={p.name}
                >
                  {p.name || `Tấm ${idx + 1}`}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">
                    ×{p.quantity}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 group-hover:text-violet-700 bg-white/90 px-1 py-0.2 rounded border border-slate-200 shadow-xs flex items-center gap-0.5">
                    🔍 Xem lớn
                  </span>
                </div>
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
                <span>
                  {p.length} × {p.width} mm
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Phóng To & Kéo Rê (Pan & Zoom) */}
      {activePiece && (
        <DiagramZoomModal
          isOpen={true}
          onClose={() => setActivePiece(null)}
          title={`Chi Tiết: ${activePiece.name || "Chi tiết"} (${activePiece.length} × ${activePiece.width} mm)`}
          subtitle={`Số lượng: ${activePiece.quantity} tấm • Hướng thớ: ${
            stockGrain === "none"
              ? "🔄 Tự do"
              : activePiece.grain === "horizontal"
              ? "↔️ Vân ngang"
              : activePiece.grain === "vertical"
              ? "↕️ Vân dọc"
              : "🔄 Tự do"
          } • Diện tích: 1 tấm = ${((activePiece.length * activePiece.width) / 1e6).toFixed(3)} m²${
            activePiece.quantity > 1
              ? ` (Tổng: ${((activePiece.length * activePiece.width * activePiece.quantity) / 1e6).toFixed(3)} m²)`
              : ""
          }`}
          badge="Mặt gỗ cần làm"
        >
          <div className="w-full bg-[#fcfbf7] rounded-2xl border border-[#ded5c7] p-6 shadow-2xl flex items-center justify-center">
            {renderModalSvg(activePiece)}
          </div>
        </DiagramZoomModal>
      )}
    </div>
  );
}
