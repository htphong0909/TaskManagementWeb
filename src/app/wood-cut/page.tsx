"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StockSheetInput, RequiredPieceInput, CalculationConfig, CalculationResult } from "@/types/woodCut";
import { calculateWoodCut } from "@/lib/woodCuttingOptimizer";
import StockSheetForm from "@/components/wood-cut/StockSheetForm";
import RequiredPiecesForm from "@/components/wood-cut/RequiredPiecesForm";
import WoodCutSummary from "@/components/wood-cut/WoodCutSummary";
import CuttingDiagram from "@/components/wood-cut/CuttingDiagram";
import JoinedPieceDiagramView from "@/components/wood-cut/JoinedPieceDiagramView";

const STORAGE_KEY = "wood_cutting_calculator_state_v1";

const INITIAL_STOCK: StockSheetInput[] = [
  { id: "s-1", name: "Ván 1200x600", length: 1200, width: 600 },
];

const INITIAL_PIECES: RequiredPieceInput[] = [
  { id: "p-1", name: "Mặt bàn lớn", length: 1110, width: 1230, quantity: 1, allowRotation: true },
  { id: "p-2", name: "Tấm vuông nhỏ", length: 234, width: 234, quantity: 1, allowRotation: true },
];

const INITIAL_CONFIG: CalculationConfig = {
  kerf: 3,
  minSubPieceSize: 50,
};

export default function WoodCutPage() {
  const [stockSheets, setStockSheets] = useState<StockSheetInput[]>(INITIAL_STOCK);
  const [pieces, setPieces] = useState<RequiredPieceInput[]>(INITIAL_PIECES);
  const [config, setConfig] = useState<CalculationConfig>(INITIAL_CONFIG);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [lastBoardId, setLastBoardId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stockSheets && parsed.stockSheets.length > 0) setStockSheets(parsed.stockSheets);
        if (parsed.pieces && parsed.pieces.length > 0) setPieces(parsed.pieces);
        if (parsed.config) setConfig(parsed.config);
      }
      const savedBoard = localStorage.getItem("last_active_board_id");
      if (savedBoard) setLastBoardId(savedBoard);
    } catch (e) {
      console.error("Lỗi đọc localStorage:", e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ stockSheets, pieces, config })
      );
    } catch (e) {
      console.error("Lỗi ghi localStorage:", e);
    }
  }, [stockSheets, pieces, config]);

  const handleCalculate = () => {
    const res = calculateWoodCut(stockSheets, pieces, config);
    setResult(res);
  };

  // Tính toán tự động lần đầu
  useEffect(() => {
    handleCalculate();
  }, [stockSheets, pieces, config]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] flex flex-col">
      {/* Header */}
      <header className="px-6 py-3.5 bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-sm">
            🪚
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 leading-tight">
              Tối Ưu Cắt & Ghép Ván Gỗ
            </h1>
            <p className="text-[11px] text-slate-500">
              Tự động tính toán số ván gốc cần mua, ghép tấm lớn & sơ đồ cắt trực quan
            </p>
          </div>
        </div>

        {/* Nút quay lại Workspace ở góc trên phải */}
        <div className="flex items-center gap-3">
          <Link
            href={lastBoardId ? `/board/${lastBoardId}` : "/"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-50/80 hover:bg-violet-100 text-violet-700 border border-violet-200/80 rounded-xl font-bold text-xs transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <span>📋</span> Quản lý công việc
          </Link>
          <div className="text-xs font-bold text-violet-700 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            ✨ HTPhongNAThy
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <StockSheetForm
            stockSheets={stockSheets}
            setStockSheets={setStockSheets}
            config={config}
            setConfig={setConfig}
          />
          <RequiredPiecesForm
            pieces={pieces}
            setPieces={setPieces}
            onCalculate={handleCalculate}
          />
        </div>

        {/* Right Column: Results & Diagrams (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <WoodCutSummary result={result} />

          {/* Sơ đồ cấu trúc & ghép từng mặt gỗ cần làm */}
          {result && result.joinedPieces.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🧩</span> Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ ({result.joinedPieces.length})
              </h3>
              {result.joinedPieces.map((diagram) => (
                <JoinedPieceDiagramView key={diagram.parentId} diagram={diagram} />
              ))}
            </div>
          )}

          {/* Sơ đồ cắt từng tấm ván gốc */}
          {result && result.stockSheetsUsed.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>📐</span> Sơ Đồ Cắt Từng Tấm Ván Gốc ({result.stockSheetsUsed.length} tấm)
              </h3>
              <div className="space-y-4">
                {result.stockSheetsUsed.map((sheet) => (
                  <CuttingDiagram key={sheet.sheetIndex} sheet={sheet} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
