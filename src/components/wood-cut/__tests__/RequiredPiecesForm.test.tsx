import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RequiredPiecesForm from "../RequiredPiecesForm";
import { RequiredPieceInput } from "@/types/woodCut";

describe("RequiredPiecesForm - Orientation Controls", () => {
  it("renders orientation dropdown and allows changing per piece", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, orientation: "auto", allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} />);

    const orientSelect = screen.getByRole("combobox", { name: /Hướng đặt Tấm 1/i });
    expect(orientSelect).toBeInTheDocument();
    expect(orientSelect).toHaveValue("auto");

    fireEvent.change(orientSelect, { target: { value: "vertical" } });
    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", orientation: "vertical", allowRotation: false }),
    ]);
  });

  it("sets all orientations when bulk select is changed", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, orientation: "auto", allowRotation: true },
      { id: "p2", name: "Tấm 2", length: 400, width: 200, quantity: 1, orientation: "auto", allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} />);

    const bulkSelect = screen.getByRole("combobox", { name: /Đặt hướng cho tất cả/i });
    fireEvent.change(bulkSelect, { target: { value: "horizontal" } });

    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", orientation: "horizontal", allowRotation: false }),
      expect.objectContaining({ id: "p2", orientation: "horizontal", allowRotation: false }),
    ]);
  });
});
