import {
  RequiredPieceInput,
  StockSheetInput,
  CalculationConfig,
  SubPiece,
  JoinedPieceDiagram,
  PieceOrientation,
} from "@/types/woodCut";

interface CandidateDecomposition {
  subPieces: { relX: number; relY: number; length: number; width: number }[];
  targetL: number;
  targetW: number;
  seamCount: number;
  minPieceDimension: number;
  minPieceArea: number;
  variance: number;
}

// Kiểm tra 1 hình chữ nhật (l, w) có thể cắt trực tiếp từ ít nhất 1 tấm ván gốc không
function canFitInStock(
  l: number,
  w: number,
  stockSheets: StockSheetInput[],
  orientation: PieceOrientation
): boolean {
  return stockSheets.some((s) => {
    const fitNormal = l <= s.length && w <= s.width;
    const fitRotated = l <= s.width && w <= s.length;
    if (orientation === "vertical") return fitNormal;
    if (orientation === "horizontal") return fitRotated;
    return fitNormal || fitRotated;
  });
}

// Tìm phương án phân rã tối ưu toàn cục cho 1 mặt gỗ
function findOptimalDecomposition(
  pL: number,
  pW: number,
  stockSheets: StockSheetInput[],
  orientation: PieceOrientation,
  config: CalculationConfig
): CandidateDecomposition {
  const candidates: CandidateDecomposition[] = [];
  const allowRot = orientation === "auto";

  // 1. Trường hợp 1 mảnh nguyên (0 vết nối)
  if (canFitInStock(pL, pW, stockSheets, orientation)) {
    return {
      subPieces: [{ relX: 0, relY: 0, length: pL, width: pW }],
      targetL: pL,
      targetW: pW,
      seamCount: 0,
      minPieceDimension: Math.min(pL, pW),
      minPieceArea: pL * pW,
      variance: 0,
    };
  }

  // Thử các hướng xoay của mặt gỗ ban đầu
  const orientations: { L: number; W: number }[] = [];
  if (orientation === "vertical") {
    orientations.push({ L: pL, W: pW });
  } else if (orientation === "horizontal") {
    orientations.push({ L: pW, W: pL });
  } else {
    orientations.push({ L: pL, W: pW });
    if (pL !== pW) {
      orientations.push({ L: pW, W: pL });
    }
  }

  for (const { L, W } of orientations) {
    // Xác định kích thước ván gốc tối đa theo hướng này
    let maxStockL = 0;
    let maxStockW = 0;
    for (const s of stockSheets) {
      if (orientation === "vertical") {
        maxStockL = Math.max(maxStockL, s.length);
        maxStockW = Math.max(maxStockW, s.width);
      } else if (orientation === "horizontal") {
        maxStockL = Math.max(maxStockL, s.width);
        maxStockW = Math.max(maxStockW, s.length);
      } else {
        const maxD = Math.max(s.length, s.width);
        const minD = Math.min(s.length, s.width);
        maxStockL = Math.max(maxStockL, maxD);
        maxStockW = Math.max(maxStockW, minD);
      }
    }

    if (maxStockL <= 0 || maxStockW <= 0) continue;

    // 2. Chia 1 chiều theo Chiều Rộng (W) thành N phần
    const minNW_1D = Math.max(2, Math.ceil(W / maxStockW));
    for (let N = minNW_1D; N <= minNW_1D + 2; N++) {
      // Cách 2.1: Chia đều (Balanced split)
      const wPart = Math.floor(W / N);
      const wPartsBalanced: number[] = [];
      let currentSumW = 0;
      for (let i = 0; i < N; i++) {
        const val = i === N - 1 ? W - currentSumW : wPart;
        wPartsBalanced.push(val);
        currentSumW += val;
      }

      if (wPartsBalanced.every((w) => canFitInStock(L, w, stockSheets, orientation))) {
        let curY = 0;
        const subPieces = wPartsBalanced.map((w) => {
          const sp = { relX: 0, relY: curY, length: L, width: w };
          curY += w;
          return sp;
        });

        const minDim = Math.min(...subPieces.map((p) => Math.min(p.length, p.width)));
        const minArea = Math.min(...subPieces.map((p) => p.length * p.width));
        const avgArea = (L * W) / N;
        const variance = subPieces.reduce((acc, p) => acc + Math.pow(p.length * p.width - avgArea, 2), 0);

        candidates.push({
          subPieces,
          targetL: L,
          targetW: W,
          seamCount: N - 1,
          minPieceDimension: minDim,
          minPieceArea: minArea,
          variance,
        });
        break;
      }

      // Cách 2.2: Chia lấy khổ cực đại trước (Greedy Max-Stock split)
      let maxFeasibleW = 0;
      for (const s of stockSheets) {
        if (L <= s.length) maxFeasibleW = Math.max(maxFeasibleW, s.width);
        if (allowRot && L <= s.width) maxFeasibleW = Math.max(maxFeasibleW, s.length);
      }

      if (maxFeasibleW > 0) {
        const wPartsGreedy: number[] = [];
        let remW = W;
        while (remW > 0) {
          if (remW <= maxFeasibleW) {
            wPartsGreedy.push(remW);
            remW = 0;
          } else {
            let cut = maxFeasibleW;
            if (remW - cut < config.minSubPieceSize && remW - cut > 0) {
              cut = Math.floor(remW / 2);
            }
            wPartsGreedy.push(cut);
            remW -= cut;
          }
        }

        if (wPartsGreedy.every((w) => canFitInStock(L, w, stockSheets, orientation))) {
          let curY = 0;
          const subPieces = wPartsGreedy.map((w) => {
            const sp = { relX: 0, relY: curY, length: L, width: w };
            curY += w;
            return sp;
          });

          const minDim = Math.min(...subPieces.map((p) => Math.min(p.length, p.width)));
          const minArea = Math.min(...subPieces.map((p) => p.length * p.width));
          const avgArea = (L * W) / wPartsGreedy.length;
          const variance = subPieces.reduce((acc, p) => acc + Math.pow(p.length * p.width - avgArea, 2), 0);

          candidates.push({
            subPieces,
            targetL: L,
            targetW: W,
            seamCount: wPartsGreedy.length - 1,
            minPieceDimension: minDim,
            minPieceArea: minArea,
            variance,
          });
        }
      }
    }

    // 3. Chia 1 chiều theo Chiều Dài (L) thành N phần
    const minNL_1D = Math.max(2, Math.ceil(L / maxStockL));
    for (let N = minNL_1D; N <= minNL_1D + 2; N++) {
      const lPart = Math.floor(L / N);
      const lPartsBalanced: number[] = [];
      let currentSumL = 0;
      for (let i = 0; i < N; i++) {
        const val = i === N - 1 ? L - currentSumL : lPart;
        lPartsBalanced.push(val);
        currentSumL += val;
      }

      if (lPartsBalanced.every((l) => canFitInStock(l, W, stockSheets, orientation))) {
        let curX = 0;
        const subPieces = lPartsBalanced.map((l) => {
          const sp = { relX: curX, relY: 0, length: l, width: W };
          curX += l;
          return sp;
        });

        const minDim = Math.min(...subPieces.map((p) => Math.min(p.length, p.width)));
        const minArea = Math.min(...subPieces.map((p) => p.length * p.width));
        const avgArea = (L * W) / N;
        const variance = subPieces.reduce((acc, p) => acc + Math.pow(p.length * p.width - avgArea, 2), 0);

        candidates.push({
          subPieces,
          targetL: L,
          targetW: W,
          seamCount: N - 1,
          minPieceDimension: minDim,
          minPieceArea: minArea,
          variance,
        });
        break;
      }
    }

    // 4. Chia 2 chiều dạng Lưới Động (Dynamic 2D Grid: NL x NW)
    const minNL_2D = Math.max(1, Math.ceil(L / maxStockL));
    const minNW_2D = Math.max(1, Math.ceil(W / maxStockW));

    for (let NL = minNL_2D; NL <= minNL_2D + 2; NL++) {
      for (let NW = minNW_2D; NW <= minNW_2D + 2; NW++) {
        if (NL === 1 && NW === 1) continue;

        const lPart = Math.floor(L / NL);
        const wPart = Math.floor(W / NW);

        const lParts: number[] = [];
        let curL = 0;
        for (let i = 0; i < NL; i++) {
          const val = i === NL - 1 ? L - curL : lPart;
          lParts.push(val);
          curL += val;
        }

        const wParts: number[] = [];
        let curW = 0;
        for (let j = 0; j < NW; j++) {
          const val = j === NW - 1 ? W - curW : wPart;
          wParts.push(val);
          curW += val;
        }

        let allFit = true;
        const gridSubPieces: { relX: number; relY: number; length: number; width: number }[] = [];
        let currentY = 0;
        for (const w of wParts) {
          let currentX = 0;
          for (const l of lParts) {
            if (!canFitInStock(l, w, stockSheets, orientation)) {
              allFit = false;
              break;
            }
            gridSubPieces.push({ relX: currentX, relY: currentY, length: l, width: w });
            currentX += l;
          }
          if (!allFit) break;
          currentY += w;
        }

        if (allFit && gridSubPieces.length > 0) {
          const minDim = Math.min(...gridSubPieces.map((p) => Math.min(p.length, p.width)));
          const minArea = Math.min(...gridSubPieces.map((p) => p.length * p.width));
          const avgArea = (L * W) / gridSubPieces.length;
          const variance = gridSubPieces.reduce((acc, p) => acc + Math.pow(p.length * p.width - avgArea, 2), 0);

          candidates.push({
            subPieces: gridSubPieces,
            targetL: L,
            targetW: W,
            seamCount: gridSubPieces.length - 1,
            minPieceDimension: minDim,
            minPieceArea: minArea,
            variance,
          });
        }
      }
    }
  }

  // 5. Invariant Canonical Fallback: Nếu không có candidate nào vừa, bắt buộc sinh lưới chính xác
  if (candidates.length === 0) {
    const bestStock = stockSheets[0] || { length: 2440, width: 1220 };
    const maxSL = allowRot
      ? Math.max(bestStock.length, bestStock.width)
      : orientation === "horizontal"
      ? bestStock.width
      : bestStock.length;
    const maxSW = allowRot
      ? Math.min(bestStock.length, bestStock.width)
      : orientation === "horizontal"
      ? bestStock.length
      : bestStock.width;

    const cNL = Math.max(1, Math.ceil(pL / maxSL));
    const cNW = Math.max(1, Math.ceil(pW / maxSW));

    const lPart = Math.floor(pL / cNL);
    const wPart = Math.floor(pW / cNW);

    const subPieces: { relX: number; relY: number; length: number; width: number }[] = [];
    let curY = 0;
    for (let j = 0; j < cNW; j++) {
      const w = j === cNW - 1 ? pW - curY : wPart;
      let curX = 0;
      for (let i = 0; i < cNL; i++) {
        const l = i === cNL - 1 ? pL - curX : lPart;
        subPieces.push({ relX: curX, relY: curY, length: l, width: w });
        curX += l;
      }
      curY += w;
    }

    return {
      subPieces,
      targetL: pL,
      targetW: pW,
      seamCount: subPieces.length - 1,
      minPieceDimension: Math.min(...subPieces.map((p) => Math.min(p.length, p.width))),
      minPieceArea: Math.min(...subPieces.map((p) => p.length * p.width)),
      variance: 0,
    };
  }

  // Tiêu chí chọn phương án tối ưu:
  // 1. Số lượng mối nối (seamCount) là ÍT NHẤT TUYỆT ĐỐI
  // 2. Kích thước cạnh nhỏ nhất (minPieceDimension) là LỚN NHẤT (hạn chế tối đa mẩu vụn < 50mm)
  // 3. Diện tích mẩu nhỏ nhất (minPieceArea) là LỚN NHẤT
  // 4. Độ phân tán kích thước (variance) là NHỎ NHẤT (ưu tiên chia đều đẹp)
  candidates.sort((a, b) => {
    if (a.seamCount !== b.seamCount) return a.seamCount - b.seamCount;
    // Ưu tiên phương án có mẩu nhỏ nhất lớn hơn ngưỡng 50mm
    const aAboveThreshold = a.minPieceDimension >= config.minSubPieceSize;
    const bAboveThreshold = b.minPieceDimension >= config.minSubPieceSize;
    if (aAboveThreshold && !bAboveThreshold) return -1;
    if (!aAboveThreshold && bAboveThreshold) return 1;

    if (b.minPieceDimension !== a.minPieceDimension) return b.minPieceDimension - a.minPieceDimension;
    if (b.minPieceArea !== a.minPieceArea) return b.minPieceArea - a.minPieceArea;
    return a.variance - b.variance;
  });

  return candidates[0];
}

export function decomposeOversizedPieces(
  pieces: RequiredPieceInput[],
  stockSheets: StockSheetInput[],
  config: CalculationConfig
): {
  flatCutItems: (RequiredPieceInput | SubPiece)[];
  joinedDiagrams: JoinedPieceDiagram[];
} {
  const flatCutItems: (RequiredPieceInput | SubPiece)[] = [];
  const joinedDiagrams: JoinedPieceDiagram[] = [];

  if (stockSheets.length === 0) {
    return { flatCutItems: pieces, joinedDiagrams: [] };
  }

  for (const piece of pieces) {
    for (let q = 0; q < piece.quantity; q++) {
      const instanceId = q === 0 ? piece.id : `${piece.id}-${q + 1}`;
      const instanceName = piece.quantity > 1 ? `${piece.name} (#${q + 1})` : piece.name;

      const orient = piece.orientation || (piece.allowRotation === false ? "vertical" : "auto");
      const allowRot = orient === "auto";
      const optimal = findOptimalDecomposition(
        piece.length,
        piece.width,
        stockSheets,
        orient,
        config
      );

      const subPieces: SubPiece[] = optimal.subPieces.map((sp, idx) => ({
        id: optimal.seamCount === 0 ? instanceId : `sub-${instanceId}-${idx + 1}`,
        parentId: instanceId,
        parentName: instanceName,
        relX: sp.relX,
        relY: sp.relY,
        length: sp.length,
        width: sp.width,
        orientation: orient,
        allowRotation: allowRot,
      }));

      subPieces.forEach((sp) => flatCutItems.push(sp));

      joinedDiagrams.push({
        parentId: instanceId,
        parentName: instanceName,
        targetLength: optimal.targetL,
        targetWidth: optimal.targetW,
        subPieces,
        seamCount: optimal.seamCount,
      });
    }
  }

  return { flatCutItems, joinedDiagrams };
}
