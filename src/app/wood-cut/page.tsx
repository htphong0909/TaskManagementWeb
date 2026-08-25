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
  { id: "p-1", name: "Mặt bàn lớn", length: 1110, width: 1230, quantity: 1, orientation: "auto", allowRotation: true },
  { id: "p-2", name: "Tấm vuông nhỏ", length: 234, width: 234, quantity: 1, orientation: "auto", allowRotation: true },
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
    try {
      const res = calculateWoodCut(stockSheets, pieces, config);
      setResult(res);
    } catch (e) {
      console.error("Lỗi tính toán cắt gỗ:", e);
    }
  };

  // Tính toán tự động khi thay đổi dữ liệu
  useEffect(() => {
    handleCalculate();
  }, [stockSheets, pieces, config]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] flex flex-col">
      {/* Header Điều Hướng */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md">
            🪚
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">
              Tối Ưu Cắt & Ghép Ván Gỗ
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Tính toán số ván gốc cần mua, ghép tấm lớn tối thiểu vết cắt & sơ đồ trực quan
            </p>
          </div>
        </div>

        {/* Nút quay lại Workspace ở góc trên phải */}
        <div className="flex items-center gap-3">
          <Link
            href={lastBoardId ? `/board/${lastBoardId}` : "/"}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-50/90 hover:bg-violet-100 text-violet-800 border border-violet-200 rounded-2xl font-bold text-xs transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <span>📋</span> Quản lý công việc
          </Link>
          <div className="text-xs font-bold text-violet-700 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3.5 py-2 rounded-full select-none shadow-xs">
            ✨ HTPhongNAThy
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto space-y-8">
        {/* ========================================================================= */}
        {/* KHU VỰC 1: THIẾT LẬP ĐẦU VÀO (INPUT - NẰM TRÊN CÙNG) */}
        {/* ========================================================================= */}
        <section className="bg-white/75 backdrop-blur-lg rounded-3xl border border-white/80 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-violet-600 text-white font-black text-xs shadow-xs">
              1
            </span>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Thiết Lập Đầu Vào (Input)
            </h2>
            <span className="text-xs font-semibold text-slate-400 ml-1">
              — Nhập khổ ván gốc mua/có sẵn và danh sách mặt gỗ cần cắt
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái (5 cols): Ván Gỗ Gốc */}
            <div className="lg:col-span-5">
              <StockSheetForm
                stockSheets={stockSheets}
                setStockSheets={setStockSheets}
                config={config}
                setConfig={setConfig}
              />
            </div>

            {/* Cột phải (7 cols): Mặt Gỗ Cần Làm */}
            <div className="lg:col-span-7">
              <RequiredPiecesForm
                pieces={pieces}
                setPieces={setPieces}
                onCalculate={handleCalculate}
              />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* KHU VỰC 2: KẾT QUẢ TÍNH TOÁN & SƠ ĐỒ THI CÔNG (OUTPUT - NẰM PHÍA DƯỚI) */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
              2
            </span>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Kết Quả Tính Toán & Sơ Đồ Thi Công (Output)
            </h2>
            <span className="text-xs font-semibold text-slate-500 ml-1">
              — Tổng hợp vật tư BOM, sơ đồ ghép mặt gỗ và sơ đồ cắt từng tấm ván gốc
            </span>
          </div>

          {/* 1. Tổng Hợp Vật Tư BOM */}
          <WoodCutSummary result={result} />

          {/* 2. Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ */}
          {result && result.joinedPieces.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-100/70 border border-amber-300/80 px-5 py-3 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧩</span>
                  <div>
                    <h3 className="text-base font-black text-amber-950 uppercase tracking-wide">
                      Sơ Đồ Cấu Trúc & Ghép Từng Mặt Gỗ
                    </h3>
                    <p className="text-xs text-amber-800 font-medium">
                      Bản vẽ cấu tạo từng mặt gỗ, đường vệt nối và số hiệu tấm ván gốc cắt ra
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-900 bg-amber-200/80 border border-amber-400 px-3.5 py-1.5 rounded-full shadow-xs">
                  {result.joinedPieces.length} mặt gỗ
                </span>
              </div>

              {/* Grid 3 cột trên desktop, 2 cột trên tablet */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {result.joinedPieces.map((diagram) => (
                  <JoinedPieceDiagramView key={diagram.parentId} diagram={diagram} />
                ))}
              </div>
            </div>
          )}

          {/* 3. Sơ Đồ Cắt Từng Tấm Ván Gốc */}
          {result && result.stockSheetsUsed.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-100/70 border border-indigo-300/80 px-5 py-3 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🪚</span>
                  <div>
                    <h3 className="text-base font-black text-indigo-950 uppercase tracking-wide">
                      Sơ Đồ Cắt Từng Tấm Ván Gốc
                    </h3>
                    <p className="text-xs text-indigo-800 font-medium">
                      Bản vẽ sơ đồ xẻ ván chi tiết, mã màu phân biệt từng chi tiết và vùng gỗ thừa
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-indigo-900 bg-indigo-200/80 border border-indigo-400 px-3.5 py-1.5 rounded-full shadow-xs">
                  {result.stockSheetsUsed.length} tấm ván gốc cần cắt
                </span>
              </div>

              {/* Grid 2 cột rộng rãi trên desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {result.stockSheetsUsed.map((sheet) => (
                  <CuttingDiagram key={sheet.sheetIndex} sheet={sheet} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
