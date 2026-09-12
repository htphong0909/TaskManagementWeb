import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import DiagramZoomModal from "../DiagramZoomModal";

describe("DiagramZoomModal - Scroll Lock & Zoom Controls", () => {
  it("locks document.body scroll when open and restores it when closed", () => {
    document.body.style.overflow = "visible";
    const { unmount } = render(
      <DiagramZoomModal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Content</div>
      </DiagramZoomModal>
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("visible");
  });

  it("handles wheel zoom without allowing default page scroll", () => {
    render(
      <DiagramZoomModal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Content</div>
      </DiagramZoomModal>
    );

    // Initial scale is 100%
    expect(screen.getByText("100%", { selector: "span" })).toBeInTheDocument();

    const canvas = screen.getByText("Content").closest(".flex-1");
    expect(canvas).toBeInTheDocument();

    if (canvas) {
      const wheelEvent = new WheelEvent("wheel", {
        deltaY: -100, // Zoom in
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(wheelEvent, "preventDefault");
      act(() => {
        canvas.dispatchEvent(wheelEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(screen.getByText("115%", { selector: "span" })).toBeInTheDocument();
    }
  });
});
