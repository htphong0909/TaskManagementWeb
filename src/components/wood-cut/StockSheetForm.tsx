"use client";

import React from "react";
import { StockSheetInput, CalculationConfig } from "@/types/woodCut";
import NumericInput from "./NumericInput";

interface Props {
  stockSheets: StockSheetInput[];
  setStockSheets: (sheets: StockSheetInput[]) => void;
  config: CalculationConfig;
  setConfig: (config: CalculationConfig) => void;
  totalPiecesCount?: number;
}

export default function StockSheetForm({ stockSheets, setStockSheets, config, setConfig, totalPiecesCount = 0 }: Props) {
  const isOverMaxDP = totalPiecesCount > 12;

  const handleAddStockSheet = () => {
    setStockSheets([
      ...stockSheets,
      {
        id: `s-${Date.now()}`,
        name: `Ván gốc ${stockSheets.length + 1}`,
        length: 1200,
        width: 600,
      },
    ]);
  };

  const handleUpdate = (id: string, field: keyof StockSheetInput, val: any) => {
    setStockSheets(stockSheets.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleRemove = (id: string) => {
    if (stockSheets.length <= 1) return;
    setStockSheets(stockSheets.filter(s => s.id !== id));
  };

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📦</span> Ván Gỗ Gốc (Khổ ván mua/có sẵn)
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className={`flex items-center gap-1.5 select-none text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all ${
              isOverMaxDP
                ? "bg-slate-100/60 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                : config.useExactDP
                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-sm cursor-pointer"
                : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 border-slate-200/60 cursor-pointer"
            }`}
            title={
              isOverMaxDP
                ? "Đơn hàng > 12 chi tiết — Hệ thống tự động dùng Heuristic tối ưu để đảm bảo phản hồi tức thì"
                : "Sử dụng thuật toán Quy hoạch động (DP) để tìm số ván ít nhất tuyệt đối (100% chuẩn toán học)"
            }
          >
            <input
              type="checkbox"
              disabled={isOverMaxDP}
              checked={config.useExactDP === true && !isOverMaxDP}
              onChange={(e) => setConfig({ ...config, useExactDP: e.target.checked })}
              aria-label="Dùng thuật toán chính xác DP"
              className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-400 accent-amber-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="flex items-center gap-1">
              <span>🎯</span> Chuẩn 100% (DP)
            </span>
          </label>
          {isOverMaxDP && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              ⚡ Heuristic (N &gt; 12)
            </span>
          )}
          <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
            Lưỡi cưa (Kerf):
            <NumericInput
              value={config.kerf}
              onChange={(val) => setConfig({ ...config, kerf: val })}
              min={0}
              max={20}
              defaultValue={3}
              className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
              ariaLabel="Độ dày lưỡi cưa"
            />
            mm
          </label>
        </div>
      </div>

      {/* Bảng danh sách ván gốc */}
      <div className="space-y-2">
        {stockSheets.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
            <input
              type="text"
              value={s.name || ""}
              placeholder="Tên ván gốc"
              onChange={(e) => handleUpdate(s.id, "name", e.target.value)}
              className="flex-1 min-w-[100px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-violet-400"
            />
            <div className="flex items-center gap-1">
              <NumericInput
                value={s.length}
                onChange={(val) => handleUpdate(s.id, "length", val)}
                min={1}
                defaultValue={1200}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Dài"
                ariaLabel={`Chiều dài ${s.name || "ván gốc"}`}
              />
              <span className="text-slate-400 text-xs">×</span>
              <NumericInput
                value={s.width}
                onChange={(val) => handleUpdate(s.id, "width", val)}
                min={1}
                defaultValue={600}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Rộng"
                ariaLabel={`Chiều rộng ${s.name || "ván gốc"}`}
              />
              <span className="text-slate-400 text-[10px]">mm</span>
            </div>
            {stockSheets.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                title="Xóa ván gốc này"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Nút thêm ván gốc */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-start">
        <button
          type="button"
          onClick={handleAddStockSheet}
          className="text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>+</span> Thêm ván gốc
        </button>
      </div>
    </div>
  );
}
