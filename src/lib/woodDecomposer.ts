import { RequiredPieceInput, StockSheetInput, CalculationConfig, SubPiece, JoinedPieceDiagram } from "@/types/woodCut";

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

  // Tìm kích thước tối đa của ván gốc
  let maxStockL = 0;
  let maxStockW = 0;
  for (const s of stockSheets) {
    maxStockL = Math.max(maxStockL, Math.max(s.length, s.width));
    maxStockW = Math.max(maxStockW, Math.min(s.length, s.width));
  }

  for (const piece of pieces) {
    const pL = piece.length;
    const pW = piece.width;

    // Kiểm tra xem tấm này có vừa trong ít nhất 1 loại ván gốc không
    const fitsDirectly = stockSheets.some((s) => {
      const fitNormal = pL <= s.length && pW <= s.width;
      const fitRotated = piece.allowRotation && pL <= s.width && pW <= s.length;
      return fitNormal || fitRotated;
    });

    if (fitsDirectly) {
      for (let q = 0; q < piece.quantity; q++) {
        flatCutItems.push({
          ...piece,
          id: q === 0 ? piece.id : `${piece.id}-${q + 1}`,
          quantity: 1,
        });
      }
      continue;
    }

    // Tấm vượt khổ ván -> Tiến hành phân rã cho từng bản sao số lượng
    for (let q = 0; q < piece.quantity; q++) {
      const instanceId = q === 0 ? piece.id : `${piece.id}-${q + 1}`;
      const instanceName = piece.quantity > 1 ? `${piece.name} (#${q + 1})` : piece.name;

      // Định hướng ghép
      let useL = pL;
      let useW = pW;
      if (piece.allowRotation && pW <= maxStockL && pL > maxStockL) {
        useL = pW;
        useW = pL;
      }

      // Phân tích chia theo chiều dài (L)
      const partsL: number[] = [];
      let remL = useL;
      while (remL > 0) {
        if (remL <= maxStockL) {
          partsL.push(remL);
          remL = 0;
        } else {
          let cutL = maxStockL;
          if (remL - cutL < config.minSubPieceSize && remL - cutL > 0) {
            cutL = Math.floor(remL / 2);
          }
          partsL.push(cutL);
          remL -= cutL;
        }
      }

      // Phân tích chia theo chiều rộng (W)
      const partsW: number[] = [];
      let remW = useW;
      while (remW > 0) {
        if (remW <= maxStockW) {
          partsW.push(remW);
          remW = 0;
        } else {
          let cutW = maxStockW;
          if (remW - cutW < config.minSubPieceSize && remW - cutW > 0) {
            cutW = Math.floor(remW / 2);
          }
          partsW.push(cutW);
          remW -= cutW;
        }
      }

      const subPieces: SubPiece[] = [];
      let currentY = 0;
      let pieceIndex = 1;
      for (const w of partsW) {
        let currentX = 0;
        for (const l of partsL) {
          const subPiece: SubPiece = {
            id: `sub-${instanceId}-${pieceIndex}`,
            parentId: instanceId,
            parentName: instanceName,
            relX: currentX,
            relY: currentY,
            length: l,
            width: w,
            allowRotation: piece.allowRotation,
          };
          subPieces.push(subPiece);
          flatCutItems.push(subPiece);
          currentX += l;
          pieceIndex++;
        }
        currentY += w;
      }

      joinedDiagrams.push({
        parentId: instanceId,
        parentName: instanceName,
        targetLength: useL,
        targetWidth: useW,
        subPieces,
        seamCount: subPieces.length - 1,
      });
    }
  }

  return { flatCutItems, joinedDiagrams };
}
