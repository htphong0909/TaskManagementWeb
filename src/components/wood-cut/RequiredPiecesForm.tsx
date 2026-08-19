"use client";

import React, { useState } from "react";
import { RequiredPieceInput } from "@/types/woodCut";
import { parseRequiredPiecesText, formatPiecesToText } from "@/lib/woodCutParser";
import NumericInput from "./NumericInput";

interface Props {
  pieces: RequiredPieceInput[];
  setPieces: (pieces: RequiredPieceInput[]) => void;
  onCalculate: () => void;
}

export default function RequiredPiecesForm({ pieces, setPieces, onCalculate }: Props) {
  const [mode, setMode] = useState<"table" | "batch">("table");
  const [batchText, setBatchText] = useState("");
  const [batchErrors, setBatchErrors] = useState<string[]>([]);

  const handleAddRow = () => {
    setPieces([
      ...pieces,
      {
        id: `p-${Date.now()}`,
        name: `Tấm ${pieces.length + 1}`,
        length: 500,
        width: 300,
        quantity: 1,
        allowRotation: true,
      },
    ]);
  };

  const handleUpdate = (id: string, field: keyof RequiredPieceInput, val: any) => {
    setPieces(pieces.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
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

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/60 shadow-sm p-4">
      {/* Header Tabs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>📐</span> Mặt Gỗ Cần Làm ({pieces.length} loại)
        </h2>
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setMode("table")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === "table" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Bảng nhập
          </button>
          <button
            type="button"
            onClick={handleOpenBatch}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === "batch" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Nhập nhanh (Paste)
          </button>
        </div>
      </div>

      {mode === "batch" ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Dán danh sách kích thước (mỗi dòng một tấm, định dạng <code>1110, 1230</code> hoặc <code>234x234 x2</code>):
          </p>
          <textarea
            rows={7}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder="1110, 1230&#10;234, 234&#10;500x600 x2"
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
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApplyBatch}
              className="px-4 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-sm"
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
              className="flex items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100 hover:border-violet-200 transition-all"
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
                  min={1}
                  defaultValue={100}
                  className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-violet-400 text-center"
                  placeholder="Dài"
                  ariaLabel={`Chiều dài ${p.name}`}
                />
                <span className="text-slate-400 text-xs">×</span>
                <NumericInput
                  value={p.width}
                  onChange={(val) => handleUpdate(p.id, "width", val)}
                  min={1}
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
                  defaultValue={1}
                  className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-violet-700 outline-none focus:border-violet-400 text-center"
                  ariaLabel={`Số lượng ${p.name}`}
                />
              </div>
              {pieces.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                  title="Xóa dòng"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl border border-violet-200 transition-all flex items-center gap-1"
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
