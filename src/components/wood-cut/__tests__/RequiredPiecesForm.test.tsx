import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RequiredPiecesForm from "../RequiredPiecesForm";
import { RequiredPieceInput } from "@/types/woodCut";

describe("RequiredPiecesForm - Rotation Controls", () => {
  it("renders rotation checkbox and allows toggling per piece", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} />);

    const rotCheckbox = screen.getByRole("checkbox", { name: /Cho phép xoay 90° Tấm 1/i });
    expect(rotCheckbox).toBeInTheDocument();
    expect(rotCheckbox).toBeChecked();

    fireEvent.click(rotCheckbox);
    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", allowRotation: false }),
    ]);

  });

  it("toggles all rotation checkboxes when bulk toggle button is clicked", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, allowRotation: true },
      { id: "p2", name: "Tấm 2", length: 400, width: 200, quantity: 1, allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} />);

    const bulkBtn = screen.getByText(/Tắt xoay tất cả/i);
    fireEvent.click(bulkBtn);

    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", allowRotation: false }),
      expect.objectContaining({ id: "p2", allowRotation: false }),
    ]);
  });
});
