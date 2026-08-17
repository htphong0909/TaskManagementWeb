"use client";

import React from "react";
import { StockSheetInput, CalculationConfig } from "@/types/woodCut";

interface Props {
  stockSheets: StockSheetInput[];
  setStockSheets: (sheets: StockSheetInput[]) => void;
  config: CalculationConfig;
  setConfig: (config: CalculationConfig) => void;
}

export default function StockSheetForm({ stockSheets, setStockSheets, config, setConfig }: Props) {
  const addPreset = (length: number, width: number, name: string) => {
    setStockSheets([
      ...stockSheets,
      { id: `s-${Date.now()}`, name, length, width }
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
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
            Lưỡi cưa (Kerf):
            <input
              type="number"
              min="0"
              max="20"
              value={config.kerf}
              onChange={(e) => setConfig({ ...config, kerf: parseFloat(e.target.value) || 0 })}
              className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400"
            />
            mm
          </label>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[11px] text-slate-400 self-center">Chọn nhanh:</span>
        <button
          type="button"
          onClick={() => addPreset(1200, 600, "Ván 1200x600")}
          className="text-xs px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg border border-violet-200 transition-all font-medium"
        >
          + 1200 × 600
        </button>
        <button
          type="button"
          onClick={() => addPreset(2440, 1220, "Ván chuẩn 2440x1220")}
          className="text-xs px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg border border-violet-200 transition-all font-medium"
        >
          + 2440 × 1220
        </button>
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
              <input
                type="number"
                value={s.length}
                onChange={(e) => handleUpdate(s.id, "length", Math.max(1, parseInt(e.target.value) || 0))}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Dài"
              />
              <span className="text-slate-400 text-xs">×</span>
              <input
                type="number"
                value={s.width}
                onChange={(e) => handleUpdate(s.id, "width", Math.max(1, parseInt(e.target.value) || 0))}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Rộng"
              />
              <span className="text-slate-400 text-[10px]">mm</span>
            </div>
            {stockSheets.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                title="Xóa ván gốc này"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
