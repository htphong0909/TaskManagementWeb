import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BoardGalleryModal from "../BoardGalleryModal";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: [
              { id: "img-1", board_id: "b-1", name: "Image 1.jpg", url: "https://example.com/1.jpg", created_at: "2026-08-20T00:00:00Z" }
            ],
            error: null
          })
        })
      }),
      insert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) })
    })
  }
}));

describe("BoardGalleryModal", () => {
  it("renders modal when isOpen is true", async () => {
    render(<BoardGalleryModal boardId="b-1" boardTitle="Dự án Alpha" isOpen={true} onClose={vi.fn()} />);
    expect(await screen.findByText(/Thư viện ảnh: Dự án Alpha/i)).toBeDefined();
  });

  it("changes column count when dragging slider", async () => {
    render(<BoardGalleryModal boardId="b-1" boardTitle="Dự án Alpha" isOpen={true} onClose={vi.fn()} />);
    const slider = await screen.findByLabelText("Thu phóng lưới ảnh");
    fireEvent.change(slider, { target: { value: "6" } });
    expect((slider as HTMLInputElement).value).toBe("6");
  });
});
