import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RequiredPiecesForm from "../RequiredPiecesForm";
import { RequiredPieceInput } from "@/types/woodCut";

describe("RequiredPiecesForm - Grain Orientation Controls", () => {
  it("renders grain dropdown and allows changing per piece", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, orientation: "auto", allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} stockGrain="vertical" />);

    const grainSelect = screen.getByRole("combobox", { name: /Hướng đặt Tấm 1/i });
    expect(grainSelect).toBeInTheDocument();
    expect(grainSelect).toHaveValue("none");

    fireEvent.change(grainSelect, { target: { value: "vertical" } });
    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", grain: "vertical", orientation: "vertical", allowRotation: false }),
    ]);
  });

  it("sets all grains when bulk select is changed", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, grain: "none", orientation: "auto", allowRotation: true },
      { id: "p2", name: "Tấm 2", length: 400, width: 200, quantity: 1, grain: "none", orientation: "auto", allowRotation: true },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} stockGrain="vertical" />);

    const bulkSelect = screen.getByRole("combobox", { name: /Đặt hướng cho tất cả/i });
    fireEvent.change(bulkSelect, { target: { value: "horizontal" } });

    expect(setPieces).toHaveBeenCalledWith([
      expect.objectContaining({ id: "p1", grain: "horizontal", orientation: "horizontal", allowRotation: false }),
      expect.objectContaining({ id: "p2", grain: "horizontal", orientation: "horizontal", allowRotation: false }),
    ]);
  });

  it("disables grain selects and forces 'none' when stockGrain is 'none'", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm 1", length: 500, width: 300, quantity: 1, grain: "vertical", orientation: "vertical", allowRotation: false },
    ];
    const setPieces = vi.fn();
    render(<RequiredPiecesForm pieces={pieces} setPieces={setPieces} onCalculate={() => {}} stockGrain="none" />);

    const grainSelect = screen.getByRole("combobox", { name: /Hướng đặt Tấm 1/i });
    expect(grainSelect).toBeDisabled();
    expect(grainSelect).toHaveValue("none");

    const bulkSelect = screen.getByRole("combobox", { name: /Đặt hướng cho tất cả/i });
    expect(bulkSelect).toBeDisabled();
  });

  it("renders RequiredPiecesVisualizer with preview cards", () => {
    const pieces: RequiredPieceInput[] = [
      { id: "p1", name: "Tấm Cánh Tủ", length: 800, width: 400, quantity: 2, grain: "vertical", orientation: "vertical", allowRotation: false },
    ];
    render(<RequiredPiecesForm pieces={pieces} setPieces={() => {}} onCalculate={() => {}} stockGrain="vertical" />);

    expect(screen.getByText(/Mô phỏng mặt gỗ/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tấm Cánh Tủ/i).length).toBeGreaterThan(0);
  });
});
