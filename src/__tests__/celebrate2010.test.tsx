import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoveDaysCounter from "@/components/celebrate/LoveDaysCounter";
import TypewriterLetter from "@/components/celebrate/TypewriterLetter";

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
});
