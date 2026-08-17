"use client";

import React from "react";
import { CalculationResult } from "@/types/woodCut";

interface Props {
  result: CalculationResult | null;
}

export default function WoodCutSummary({ result }: Props) {
  if (!result || result.stockSheetsUsed.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        <span className="text-3xl block mb-2">🪚</span>
        <p className="text-sm font-semibold">Chưa có kết quả tính toán</p>
        <p className="text-xs text-slate-400 mt-1">
          Nhập kích thước ván gốc và các mặt gỗ cần làm ở bên trái, sau đó nhấn <strong>"Tính Toán Cắt Ván"</strong>.
        </p>
      </div>
    );
  }

  const { summary } = result;

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📊</span> Tổng Hợp Vật Tư Cần Mua (BOM)
        </h3>
        <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
          Tổng cộng: {summary.totalStockSheets} tấm ván gốc
        </span>
      </div>

      {/* Grid thẻ chỉ số */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1">
        <div className="bg-violet-50/70 border border-violet-100 rounded-xl p-2.5">
          <div className="text-[11px] text-violet-600 font-semibold">Ván gốc cần mua</div>
          <div className="text-lg font-extrabold text-violet-900 mt-0.5">
            {summary.totalStockSheets} <span className="text-xs font-normal">tấm</span>
          </div>
          <div className="text-[10px] text-violet-500 mt-0.5 truncate" title={Object.entries(summary.sheetBreakdown).map(([k, v]) => `${v} × ${k}`).join(", ")}>
            {Object.entries(summary.sheetBreakdown).map(([k, v]) => `${v} × ${k}`).join(", ")}
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
          <div className="text-[11px] text-emerald-600 font-semibold">Hiệu suất sử dụng</div>
          <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
            {summary.efficiencyPercent}%
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            Dùng: {summary.totalUsedArea} m² / {summary.totalStockArea} m²
          </div>
        </div>

        <div className="bg-orange-50/70 border border-orange-100 rounded-xl p-2.5">
          <div className="text-[11px] text-orange-600 font-semibold">Hao phí / Gỗ thừa</div>
          <div className="text-lg font-extrabold text-orange-900 mt-0.5">
            {summary.totalWasteArea} <span className="text-xs font-normal">m²</span>
          </div>
          <div className="text-[10px] text-orange-500 mt-0.5">
            Tận dụng làm mẩu nhỏ
          </div>
        </div>

        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2.5">
          <div className="text-[11px] text-sky-600 font-semibold">Số đường cắt & Ghép</div>
          <div className="text-lg font-extrabold text-sky-900 mt-0.5">
            {summary.totalCutsCount} <span className="text-xs font-normal">nhát cắt</span>
          </div>
          <div className="text-[10px] text-sky-600 mt-0.5">
            {summary.totalSeamsCount > 0 ? `${summary.totalSeamsCount} mối nối tấm lớn` : "Không cần ghép"}
          </div>
        </div>
      </div>
    </div>
  );
}
