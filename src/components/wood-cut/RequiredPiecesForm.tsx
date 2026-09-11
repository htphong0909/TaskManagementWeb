"use client";

import React, { useState } from "react";
import { RequiredPieceInput, PieceOrientation, WoodGrain } from "@/types/woodCut";
import { parseRequiredPiecesText, formatPiecesToText } from "@/lib/woodCutParser";
import NumericInput from "./NumericInput";
import RequiredPiecesVisualizer from "./RequiredPiecesVisualizer";

interface Props {
  pieces: RequiredPieceInput[];
  setPieces: (pieces: RequiredPieceInput[]) => void;
  onCalculate: () => void;
  stockGrain?: WoodGrain;
}

export default function RequiredPiecesForm({ pieces, setPieces, onCalculate, stockGrain = "vertical" }: Props) {
  const [mode, setMode] = useState<"table" | "batch">("table");
  const [batchText, setBatchText] = useState("");
  const [batchErrors, setBatchErrors] = useState<string[]>([]);

  const handleAddRow = () => {
    if (pieces.length >= 100) return;
    setPieces([
      ...pieces,
      {
        id: `p-${Date.now()}`,
        name: `Tấm ${pieces.length + 1}`,
        length: 500,
        width: 300,
        quantity: 1,
        grain: stockGrain === "none" ? "none" : "vertical",
        orientation: stockGrain === "none" ? "auto" : "vertical",
        allowRotation: stockGrain === "none",
      },
    ]);
  };

  const handleUpdate = (id: string, field: keyof RequiredPieceInput, val: any) => {
    setPieces(pieces.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const handleUpdateMultiple = (id: string, updates: Partial<RequiredPieceInput>) => {
    setPieces(pieces.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleRemove = (id: string) => {
    if (pieces.length <= 1) return;
    setPieces(pieces.filter((p) => p.id !== id));
  };

  const handleApplyBatch = () => {
    const { pieces: parsed, errors } = parseRequiredPiecesText(batchText);
    setBatchErrors(errors);
    if (parsed.length > 0) {
      setPieces(parsed);
      setMode("table");
    }
  };

  const handleOpenBatch = () => {
    setBatchText(formatPiecesToText(pieces));
    setBatchErrors([]);
    setMode("batch");
  };

  const handleSetAllGrain = (grain: WoodGrain) => {
    setPieces(
      pieces.map((p) => ({
        ...p,
        grain: grain,
        orientation: grain === "vertical" ? "vertical" : grain === "horizontal" ? "horizontal" : "auto",
        allowRotation: grain === "none",
      }))
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4">
      {/* Header Tabs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📐</span> Mặt Gỗ Cần Làm ({pieces.length} loại)
        </h2>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {mode === "table" && pieces.length > 0 && (
            <select
              disabled={stockGrain === "none"}
              onChange={(e) => {
                if (e.target.value) {
                  handleSetAllGrain(e.target.value as WoodGrain);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              aria-label="Đặt hướng cho tất cả"
              className="text-[11px] font-semibold text-slate-600 hover:text-violet-700 bg-slate-100/90 hover:bg-slate-200/80 px-2 py-1 rounded-lg transition-all border border-slate-200/60 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={stockGrain === "none" ? "Ván gốc không có vân (tất cả tấm tự do xoay)" : "Đặt hướng vân cho tất cả các tấm"}
            >
              <option value="" disabled>📐 Đổi chiều vân tất cả</option>
              <option value="vertical">↕️ Tất cả vân dọc</option>
              <option value="horizontal">↔️ Tất cả vân ngang</option>
              <option value="none">🔄 Tất cả không vân (Tự do)</option>
            </select>
          )}
          <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setMode("table")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "table" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Bảng nhập
            </button>
            <button
              type="button"
              onClick={handleOpenBatch}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "batch" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Nhập nhanh (Paste)
            </button>
          </div>
        </div>
      </div>

      {mode === "batch" ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Dán danh sách kích thước (mỗi dòng một tấm, vd: <code>1110, 1230</code> hoặc <code>234x234 x2 !doc</code>, <code>400x1250 !ngang</code>, <code>500x600 !xoay</code>):
          </p>
          <textarea
            rows={7}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder="1110, 1230&#10;234, 234 x2 !doc&#10;500x600 !ngang&#10;400, 1830, 2 !xoay"
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50"
          />
          {batchErrors.length > 0 && (
            <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
              {batchErrors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("table")}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApplyBatch}
              className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Áp dụng vào bảng
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {pieces.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100 hover:border-violet-200 transition-all flex-wrap sm:flex-nowrap"
            >
              <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
              <input
                type="text"
                value={p.name}
                onChange={(e) => handleUpdate(p.id, "name", e.target.value)}
                placeholder="Tên chi tiết"
                className="flex-1 min-w-[90px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-violet-400"
              />
              <div className="flex items-center gap-1">
                <NumericInput
                  value={p.length}
                  onChange={(val) => handleUpdate(p.id, "length", val)}
                  min={10}
                  max={30000}
                  defaultValue={100}
                  className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                  placeholder="Dài"
                  ariaLabel={`Chiều dài ${p.name}`}
                />
                <span className="text-slate-400 text-xs">×</span>
                <NumericInput
                  value={p.width}
                  onChange={(val) => handleUpdate(p.id, "width", val)}
                  min={10}
                  max={30000}
                  defaultValue={100}
                  className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                  placeholder="Rộng"
                  ariaLabel={`Chiều rộng ${p.name}`}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">SL:</span>
                <NumericInput
                  value={p.quantity}
                  onChange={(val) => handleUpdate(p.id, "quantity", val)}
                  min={1}
                  max={500}
                  defaultValue={1}
                  className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
                  ariaLabel={`Số lượng ${p.name}`}
                />
              </div>

              {/* 3-Way Grain Dropdown */}
              <select
                value={
                  stockGrain === "none"
                    ? "none"
                    : (p.grain ?? (p.orientation === "horizontal" ? "horizontal" : p.orientation === "vertical" ? "vertical" : "none"))
                }
                disabled={stockGrain === "none"}
                onChange={(e) => {
                  const g = e.target.value as WoodGrain;
                  handleUpdateMultiple(p.id, {
                    grain: g,
                    orientation: g === "vertical" ? "vertical" : g === "horizontal" ? "horizontal" : "auto",
                    allowRotation: g === "none",
                  });
                }}
                aria-label={`Hướng đặt ${p.name}`}
                className="text-[11px] font-medium text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/80 outline-none focus:border-violet-400 cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                title={stockGrain === "none" ? "Ván gốc không có vân (chi tiết tự do xoay)" : "Chọn chiều vân của chi tiết"}
              >
                <option value="vertical">↕️ Vân dọc</option>
                <option value="horizontal">↔️ Vân ngang</option>
                <option value="none">🔄 Không vân (Tự do)</option>
              </select>

              {pieces.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                  title="Xóa dòng"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Khu vực Visualize Mặt Gỗ Cần Làm */}
          <RequiredPiecesVisualizer pieces={pieces} stockGrain={stockGrain} />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              + Thêm mặt gỗ
            </button>
            <button
              type="button"
              onClick={onCalculate}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚡</span> Tính Toán Cắt Ván
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
