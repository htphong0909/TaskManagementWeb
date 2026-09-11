import { describe, it, expect } from "vitest";
import { CalculationConfig, RequiredPieceInput, WoodGrain } from "@/types/woodCut";

describe("Wood Grain Types", () => {
  it("should allow assigning valid WoodGrain values", () => {
    const grains: WoodGrain[] = ["none", "horizontal", "vertical"];
    expect(grains).toHaveLength(3);
  });

  it("should support stockGrain in CalculationConfig", () => {
    const config: CalculationConfig = {
      kerf: 3,
      minSubPieceSize: 50,
      stockGrain: "horizontal",
    };
    expect(config.stockGrain).toBe("horizontal");
  });

  it("should support grain in RequiredPieceInput", () => {
    const piece: RequiredPieceInput = {
      id: "p-1",
      name: "Tấm thử",
      length: 800,
      width: 400,
      quantity: 1,
      grain: "vertical",
    };
    expect(piece.grain).toBe("vertical");
  });
});
