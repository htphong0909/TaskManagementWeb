import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LoveDaysCounter from "@/components/celebrate/LoveDaysCounter";
import TypewriterLetter from "@/components/celebrate/TypewriterLetter";
import PolaroidGallery from "@/components/celebrate/PolaroidGallery";
import FloatingGiftBox from "@/components/celebrate/FloatingGiftBox";
import Happy2010Page from "@/app/happy-20-10/page";

let currentMockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => currentMockPathname,
}));

describe("20/10 Celebration Components", () => {
  it("tính toán chính xác số ngày yêu nhau từ ngày 25/04/2026", () => {
    render(<LoveDaysCounter startDate="2026-04-25T00:00:00" />);
    // Ngày hiện tại là 20/10/2026 => đã qua ít nhất 178 ngày
    const daysElement = screen.getByTestId("love-days-count");
    expect(parseInt(daysElement.textContent || "0", 10)).toBeGreaterThanOrEqual(178);
  });

  it("hiển thị đúng nội dung bức thư tình chúc mừng 20/10", () => {
    const message = "Hôm nay là ngày 20/10, chúc em yêu xinh đẹp của anh càng ngày càng khoẻ mạnh, xinh đẹp, để mình cùng đi tiếp tục đến mãi sau này.";
    render(<TypewriterLetter message={message} speed={0} />);
    const textElement = screen.getByText((content) => content.includes("Hôm nay là ngày 20/10"));
    expect(textElement).toBeDefined();
  });

  it("renders danh sách 8 bức ảnh Polaroid kỷ niệm", () => {
    render(<PolaroidGallery onSelectImage={vi.fn()} />);
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(8);
  });

  it("renders FloatingGiftBox widget với đường dẫn tới /happy-20-10", () => {
    currentMockPathname = "/";
    render(<FloatingGiftBox />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/happy-20-10");
  });

  it("ẩn FloatingGiftBox khi đang ở route /happy-20-10", () => {
    currentMockPathname = "/happy-20-10";
    const { container } = render(<FloatingGiftBox />);
    expect(container.firstChild).toBeNull();
  });

  it("mở nắp hộp quà trên trang Happy2010Page và hiển thị toàn bộ nội dung kỷ niệm", () => {
    render(<Happy2010Page />);
    const giftBoxButton = screen.getByRole("button", { name: /mở hộp quà/i });
    expect(giftBoxButton).toBeDefined();

    // Click mở hộp quà
    fireEvent.click(giftBoxButton);

    // Xác nhận xuất hiện thư tình và cột mốc
    expect(screen.getByText(/Gửi em yêu của anh/i)).toBeDefined();
    expect(screen.getByText(/CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20\/10/i)).toBeDefined();
  });
});
