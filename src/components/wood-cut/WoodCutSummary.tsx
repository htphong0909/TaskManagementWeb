"use client";

import React from "react";
import { CalculationResult } from "@/types/woodCut";

interface Props {
  result: CalculationResult | null;
}

export default function WoodCutSummary({ result }: Props) {
  if (!result || result.stockSheetsUsed.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        <span className="text-3xl block mb-2">🪚</span>
        <p className="text-sm font-bold text-slate-700">Chưa có kết quả tính toán</p>
        <p className="text-xs text-slate-400 mt-1">
          Nhập kích thước ván gốc và các mặt gỗ cần làm ở phần thiết lập phía trên, sau đó nhấn <strong>&quot;⚡ Tính Toán Cắt Ván&quot;</strong>.
        </p>
      </div>
    );
  }

  const { summary } = result;

  return (
    <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-white/80 shadow-sm p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-black text-sm">
            📊
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              Tổng Hợp Vật Tư Cần Mua (BOM) & Hiệu Suất
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Thống kê số lượng tấm ván gốc, tỷ lệ sử dụng và hao phí
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-violet-800 bg-violet-100/90 border border-violet-300 px-3 py-1.5 rounded-full shadow-xs">
            Tổng cộng: {summary.totalStockSheets} tấm ván gốc cần mua
          </span>
        </div>
      </div>

      {/* Grid thẻ chỉ số trải rộng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50/60 border border-violet-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-violet-700 font-bold uppercase tracking-wider">Ván gốc cần mua</span>
            <span className="text-base">📦</span>
          </div>
          <div className="text-2xl font-black text-violet-950 mt-2">
            {summary.totalStockSheets} <span className="text-xs font-bold text-violet-700">tấm</span>
          </div>
          <div className="text-xs font-semibold text-violet-600 mt-1 pt-2 border-t border-violet-200/50">
            {Object.entries(summary.sheetBreakdown).map(([k, v]) => `${v} × ${k} mm`).join(", ")}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Hiệu suất sử dụng</span>
            <span className="text-base">🎯</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2">
            {summary.efficiencyPercent}%
          </div>
          <div className="text-xs font-semibold text-emerald-700 mt-1 pt-2 border-t border-emerald-200/50">
            Đã dùng: {summary.totalUsedArea} m² / {summary.totalStockArea} m²
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Hao phí / Gỗ thừa</span>
            <span className="text-base">🪵</span>
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2">
            {summary.totalWasteArea} <span className="text-xs font-bold text-amber-700">m²</span>
          </div>
          <div className="text-xs font-semibold text-amber-700 mt-1 pt-2 border-t border-amber-200/50">
            Được tận dụng làm các mẩu nhỏ
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-700 font-bold uppercase tracking-wider">Số nhát cắt & Ghép</span>
            <span className="text-base">🪚</span>
          </div>
          <div className="text-2xl font-black text-sky-950 mt-2">
            {summary.totalCutsCount} <span className="text-xs font-bold text-sky-700">đường cưa</span>
          </div>
          <div className="text-xs font-semibold text-sky-700 mt-1 pt-2 border-t border-sky-200/50">
            {summary.totalSeamsCount > 0 ? `${summary.totalSeamsCount} mối nối ghép tấm lớn` : "100% tấm nguyên bản"}
          </div>
        </div>
      </div>
    </div>
  );
}
