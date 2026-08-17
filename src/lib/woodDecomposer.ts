import {
  RequiredPieceInput,
  StockSheetInput,
  CalculationConfig,
  SubPiece,
  JoinedPieceDiagram,
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
  allowRotation: boolean
): boolean {
  return stockSheets.some((s) => {
    const fitNormal = l <= s.length && w <= s.width;
    const fitRotated = allowRotation && l <= s.width && w <= s.length;
    return fitNormal || fitRotated;
  });
}

// Tìm phương án phân rã tối ưu toàn cục cho 1 mặt gỗ
function findOptimalDecomposition(
  pL: number,
  pW: number,
  stockSheets: StockSheetInput[],
  allowRotation: boolean,
  config: CalculationConfig
): CandidateDecomposition {
  const candidates: CandidateDecomposition[] = [];

  // Thử cả 2 hướng xoay của mặt gỗ ban đầu
  const orientations = [{ L: pL, W: pW }];
  if (allowRotation && pL !== pW) {
    orientations.push({ L: pW, W: pL });
  }

  for (const { L, W } of orientations) {
    // 1. Trường hợp 1 mảnh nguyên (0 vết nối)
    if (canFitInStock(L, W, stockSheets, allowRotation)) {
      candidates.push({
        subPieces: [{ relX: 0, relY: 0, length: L, width: W }],
        targetL: L,
        targetW: W,
        seamCount: 0,
        minPieceDimension: Math.min(L, W),
        minPieceArea: L * W,
        variance: 0,
      });
      continue;
    }

    // 2. Chia 1 chiều theo Chiều Rộng (W) thành N phần
    for (let N = 2; N <= 8; N++) {
      // Cách 2.1: Chia đều (Balanced split)
      const wPart = Math.floor(W / N);
      const wPartsBalanced: number[] = [];
      let currentSumW = 0;
      for (let i = 0; i < N; i++) {
        const val = i === N - 1 ? W - currentSumW : wPart;
        wPartsBalanced.push(val);
        currentSumW += val;
      }

      if (wPartsBalanced.every((w) => canFitInStock(L, w, stockSheets, allowRotation))) {
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
        break; // Đã tìm thấy N nhỏ nhất cho kiểu chia đều theo W
      }

      // Cách 2.2: Chia lấy khổ cực đại trước (Greedy Max-Stock split)
      // Tìm max stock width phù hợp với L
      let maxFeasibleW = 0;
      for (const s of stockSheets) {
        if (L <= s.length) maxFeasibleW = Math.max(maxFeasibleW, s.width);
        if (allowRotation && L <= s.width) maxFeasibleW = Math.max(maxFeasibleW, s.length);
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

        if (wPartsGreedy.every((w) => canFitInStock(L, w, stockSheets, allowRotation))) {
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
    for (let N = 2; N <= 8; N++) {
      // Cách 3.1: Chia đều (Balanced split)
      const lPart = Math.floor(L / N);
      const lPartsBalanced: number[] = [];
      let currentSumL = 0;
      for (let i = 0; i < N; i++) {
        const val = i === N - 1 ? L - currentSumL : lPart;
        lPartsBalanced.push(val);
        currentSumL += val;
      }

      if (lPartsBalanced.every((l) => canFitInStock(l, W, stockSheets, allowRotation))) {
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
        break; // Đã tìm thấy N nhỏ nhất cho kiểu chia đều theo L
      }
    }

    // 4. Chia 2 chiều dạng Lưới (2D Grid: NL x NW)
    for (let NL = 2; NL <= 4; NL++) {
      for (let NW = 2; NW <= 4; NW++) {
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
            if (!canFitInStock(l, w, stockSheets, allowRotation)) {
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

    // 5. Chia Guillotine Asymmetric T-Cut (1 mảng lớn nguyên + 1 dải còn lại)
    // Thử cắt theo L tại điểm splitL
    let maxFeasibleL = 0;
    for (const s of stockSheets) {
      maxFeasibleL = Math.max(maxFeasibleL, Math.max(s.length, s.width));
    }

    if (L > maxFeasibleL && maxFeasibleL > 0) {
      const mainL = maxFeasibleL;
      const remL = L - mainL;
      // R1: mainL x W, R2: remL x W
      // Nếu R1 chia theo W thành K1 mảnh, R2 chia theo W thành K2 mảnh
      for (let N1 = 1; N1 <= 4; N1++) {
        for (let N2 = 1; N2 <= 4; N2++) {
          const wPart1 = Math.floor(W / N1);
          const wPart2 = Math.floor(W / N2);

          const wParts1 = Array.from({ length: N1 }, (_, i) => i === N1 - 1 ? W - wPart1 * (N1 - 1) : wPart1);
          const wParts2 = Array.from({ length: N2 }, (_, i) => i === N2 - 1 ? W - wPart2 * (N2 - 1) : wPart2);

          const r1Fit = wParts1.every((w) => canFitInStock(mainL, w, stockSheets, allowRotation));
          const r2Fit = wParts2.every((w) => canFitInStock(remL, w, stockSheets, allowRotation));

          if (r1Fit && r2Fit) {
            const tSubPieces: { relX: number; relY: number; length: number; width: number }[] = [];
            let y1 = 0;
            wParts1.forEach((w) => {
              tSubPieces.push({ relX: 0, relY: y1, length: mainL, width: w });
              y1 += w;
            });
            let y2 = 0;
            wParts2.forEach((w) => {
              tSubPieces.push({ relX: mainL, relY: y2, length: remL, width: w });
              y2 += w;
            });

            const minDim = Math.min(...tSubPieces.map((p) => Math.min(p.length, p.width)));
            const minArea = Math.min(...tSubPieces.map((p) => p.length * p.width));
            const avgArea = (L * W) / tSubPieces.length;
            const variance = tSubPieces.reduce((acc, p) => acc + Math.pow(p.length * p.width - avgArea, 2), 0);

            candidates.push({
              subPieces: tSubPieces,
              targetL: L,
              targetW: W,
              seamCount: tSubPieces.length - 1,
              minPieceDimension: minDim,
              minPieceArea: minArea,
              variance,
            });
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback nếu kích thước quá đặc biệt
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

      const optimal = findOptimalDecomposition(
        piece.length,
        piece.width,
        stockSheets,
        piece.allowRotation,
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
        allowRotation: piece.allowRotation,
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
