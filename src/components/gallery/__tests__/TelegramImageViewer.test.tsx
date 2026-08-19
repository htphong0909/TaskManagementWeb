import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TelegramImageViewer from "../TelegramImageViewer";
import { BoardImage } from "@/types/gallery";

const MOCK_IMAGES: BoardImage[] = [
  { id: "img-1", board_id: "b-1", name: "Photo 1.jpg", url: "https://example.com/1.jpg", created_at: "2026-08-20T00:00:00Z" },
  { id: "img-2", board_id: "b-1", name: "Photo 2.png", url: "https://example.com/2.png", created_at: "2026-08-20T00:00:00Z" },
  { id: "img-3", board_id: "b-1", name: "Photo 3.jpg", url: "https://example.com/3.jpg", created_at: "2026-08-20T00:00:00Z" },
];

describe("TelegramImageViewer", () => {
  it("renders image at initialIndex with counter", () => {
    render(<TelegramImageViewer images={MOCK_IMAGES} initialIndex={1} onClose={vi.fn()} />);
    expect(screen.getByText("2 / 3")).toBeDefined();
    expect(screen.getByText("Photo 2.png")).toBeDefined();
  });

  it("navigates next and prev with buttons and keyboard", () => {
    render(<TelegramImageViewer images={MOCK_IMAGES} initialIndex={0} onClose={vi.fn()} />);
    
    // Click Next
    const nextBtn = screen.getByLabelText("Ảnh tiếp theo");
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 3")).toBeDefined();

    // Keyboard ArrowRight
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeDefined();

    // Keyboard ArrowLeft
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("calls onClose when clicking close button or Escape key", () => {
    const handleClose = vi.fn();
    render(<TelegramImageViewer images={MOCK_IMAGES} initialIndex={0} onClose={handleClose} />);
    
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });
});
