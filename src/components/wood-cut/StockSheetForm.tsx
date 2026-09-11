"use client";

import React from "react";
import { StockSheetInput, CalculationConfig, WoodGrain } from "@/types/woodCut";
import NumericInput from "./NumericInput";
import StockSheetVisualizer from "./StockSheetVisualizer";

interface Props {
  stockSheets: StockSheetInput[];
  setStockSheets: (sheets: StockSheetInput[]) => void;
  config: CalculationConfig;
  setConfig: (config: CalculationConfig) => void;
}

export default function StockSheetForm({ stockSheets, setStockSheets, config, setConfig }: Props) {
  const stockGrain: WoodGrain = config.stockGrain || "vertical";

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📦</span> Ván Gỗ Gốc
        </h2>

        {/* Bộ chọn vân ván gốc (3-State Segmented Control) */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/70 shadow-xs">
          <button
            type="button"
            onClick={() => setConfig({ ...config, stockGrain: "none" })}
            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              stockGrain === "none"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Ván phôi trơn không vân (mặt gỗ tự do xoay)"
          >
            🚫 Không vân
          </button>
          <button
            type="button"
            onClick={() => setConfig({ ...config, stockGrain: "vertical" })}
            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              stockGrain === "vertical"
                ? "bg-white text-violet-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Thớ gỗ chạy dọc theo chiều dài ván phôi (tiêu chuẩn)"
          >
            ↕️ Vân dọc
          </button>
          <button
            type="button"
            onClick={() => setConfig({ ...config, stockGrain: "horizontal" })}
            className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              stockGrain === "horizontal"
                ? "bg-white text-violet-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Thớ gỗ chạy ngang theo chiều rộng ván phôi"
          >
            ↔️ Vân ngang
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 font-semibold flex items-center gap-1">
            Mạch cưa:
            <NumericInput
              value={config.kerf}
              onChange={(val) => setConfig({ ...config, kerf: val })}
              min={0}
              max={50}
              defaultValue={3}
              className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
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
                min={100}
                max={10000}
                defaultValue={1200}
                className="w-18 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                placeholder="Dài"
                ariaLabel={`Chiều dài ${s.name || "ván gốc"}`}
              />
              <span className="text-slate-400 text-xs">×</span>
              <NumericInput
                value={s.width}
                onChange={(val) => handleUpdate(s.id, "width", val)}
                min={100}
                max={10000}
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

      {/* Khu vực Visualize Ván Gỗ Gốc */}
      <StockSheetVisualizer stockSheets={stockSheets} stockGrain={stockGrain} />
    </div>
  );
}
