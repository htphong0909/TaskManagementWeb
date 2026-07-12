# Hướng dẫn Phát triển Dự án (my-task-app)

Tài liệu này chứa các quy chuẩn, lệnh chạy và hướng dẫn lập trình dành riêng cho dự án Task Management WebApp. Tất cả các AI Agent phải tuân thủ nghiêm ngặt các hướng dẫn này.

## 1. Lệnh chạy chính (Commands)

* **Chạy môi trường Phát triển (Development):** 
  * Chạy trên máy host (đã mount source): `npm run dev`
  * Chạy thông qua Docker: `docker compose up -d` (Ứng dụng chạy tại port `3000`)
* **Chạy kiểm thử (Testing):**
  * Chạy một lần: `npm run test` (Vitest)
  * Chạy ở chế độ quan sát: `npm run test:watch`
* **Kiểm tra cú pháp (Linting):** `npm run lint` (ESLint)
* **Biên dịch sản phẩm (Build):** `npm run build` (Next.js Build)

## 2. Hướng dẫn Lập trình & Phong cách Code (Coding Style)

### Framework & Thư viện
* **TypeScript:** Bắt buộc viết type rõ ràng cho tất cả các props, functions, state. Không lạm dụng kiểu `any`.
* **React 19 & Next.js 16 (App Router):**
  * Tách biệt rõ ràng giữa **React Server Components (RSC)** (mặc định) và **Client Components** (chỉ thêm `"use client"` khi thực sự cần tương tác như `useState`, `useEffect`, `useActionState`).
  * **Hành vi Async mới (Bắt buộc):** 
    * `params` và `searchParams` nhận được từ Page/Layout/Route Handler là các `Promise`. Bắt buộc phải dùng `await` trước khi truy cập thuộc tính (Ví dụ: `const { id } = await params;`).
    * Các API từ `next/headers` như `headers()`, `cookies()`, `draftMode()` trả về `Promise`. Bắt buộc phải viết `const cookieStore = await cookies();`.
* **Styling (CSS) & UI/UX (Chuẩn Premium Glass-Pastel):**
  * Sử dụng **Tailwind CSS v4** để thiết kế giao diện. Không dùng CSS tuỳ tiện khi có thể giải quyết bằng class của Tailwind.
  * **Màu nền (Background):** `bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]` (dải màu sáng pastel).
  * **Cột danh sách (Columns):** `bg-white/50 backdrop-blur-lg border border-white/30 shadow-sm rounded-2xl` (Góc bo 16px).
  * **Thẻ công việc (Cards):** `bg-white border border-slate-100/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-xl` (Góc bo 12px).
  * **Hiệu ứng hover thẻ:** `transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(139,92,246,0.06)] hover:border-violet-200/80`.
  * **Focus inputs:** `focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 outline-none transition-all`.
  * Hỗ trợ giao diện sáng sủa, thanh lịch, đơn giản nhưng cao cấp (tương tự thiết kế Trello hiện đại).
* **Database & API (Supabase):**
  * Sử dụng Supabase client được cấu hình sẵn tại `src/lib/supabase.ts` để kết nối cơ sở dữ liệu.
  * Luôn xử lý lỗi đầy đủ khi gọi API từ Supabase (Ví dụ: kiểm tra `error` trả về và thông báo cho người dùng hoặc log lỗi).
  * Đảm bảo các truy vấn tuân thủ đúng chính sách Row Level Security (RLS) trên Supabase.

### Cấu trúc kiểm thử (Testing)
* Đặt các file test trong thư mục `src/__tests__/` hoặc đặt cạnh component cần test với hậu tố `.test.ts` hoặc `.test.tsx`.
* Sử dụng **Vitest** kết hợp với `@testing-library/react` để viết test case cho giao diện và logic.
