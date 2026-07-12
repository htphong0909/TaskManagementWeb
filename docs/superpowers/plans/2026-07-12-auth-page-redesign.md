# Tái thiết kế màn hình Đăng nhập (Auth Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay đổi giao diện màn hình Đăng nhập / Đăng ký sang chuẩn Premium Glass-Pastel màu sáng, đồng thời dọn dẹp loại bỏ phần Kanban Board cũ để chuẩn bị thiết kế chi tiết sau.

**Architecture:** Tái cơ cấu `src/app/page.tsx` thành màn hình chỉ tập trung vào đăng nhập. Khi chưa đăng nhập hiển thị form đăng nhập căn giữa dạng Card mờ trong suốt (Glassmorphism) trên nền gradient pastel. Khi đăng nhập thành công, hiển thị một Welcome Card tối giản kèm nút Đăng xuất.

**Tech Stack:** React 19, Next.js 16 (App Router), Tailwind CSS v4, Supabase JS, Vitest, Testing Library.

## Global Constraints
- **Màu nền (Background):** `bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]`
- **Cột/Thẻ mờ kính (Glassmorphism):** `bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl`
- **Bo góc (Border Radius):** Cột/Thẻ bo góc `rounded-2xl` (16px), Cards/Buttons bo góc `rounded-xl` (12px).
- **Tương tác vi mô:** Inputs khi active được bao quanh bằng bóng phát sáng màu tím pastel: `focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40`.

---

### Task 1: Tách biệt và Cập nhật Test Cases cho Auth Page

**Files:**
- Modify: `src/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: Supabase authentication state
- Produces: Test cases checking login header rendering and welcome page rendering

- [ ] **Step 1: Cập nhật file test với các test case mới**

Cập nhật `src/__tests__/page.test.tsx` để bổ sung thêm trường hợp kiểm tra giao diện chào mừng khi người dùng đã đăng nhập:

```typescript
import { expect, test, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import Home from '../app/page';
import { supabase } from '../lib/supabase';

// Mock Supabase to avoid network calls and authentication issues during testing
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

test('renders the task management homepage login form after initialization', async () => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);
  await act(async () => {
    render(<Home />);
  });
  const loginHeader = screen.getByText(/Đăng nhập Webapp/i);
  expect(loginHeader).toBeDefined();
});

test('renders the welcome dashboard when user is logged in', async () => {
  // Mock active session
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: mockUser } } as any });
  
  await act(async () => {
    render(<Home />);
  });
  
  const welcomeText = screen.getByText(/test@example.com/i);
  expect(welcomeText).toBeDefined();
});
```

- [ ] **Step 2: Chạy kiểm thử để đảm bảo các test case thất bại hoặc báo lỗi biên dịch (do chưa có code mới)**

Run: `npm run test`
Expected: FAIL (ở test case đăng nhập thành công do giao diện Welcome chưa được triển khai)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/page.test.tsx
git commit -m "test: add tests for authentication redesign views"
```

---

### Task 2: Triển khai giao diện đăng nhập Glass-Pastel và Welcome Card trong page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Supabase Client, Auth state
- Produces: Polished glassmorphism auth views and clean logged in landing state

- [ ] **Step 1: Viết lại page.tsx loại bỏ các code liên quan đến Kanban board và thay bằng UI/UX mới**

Thay thế hoàn toàn nội dung file `src/app/page.tsx` với code sau:

```typescript
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Listen to auth state
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setSubmittingAuth(true);

    if (!email || !password) {
      setAuthError("Vui lòng điền đầy đủ email và mật khẩu.");
      setSubmittingAuth(false);
      return;
    }

    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setAuthSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra trong quá trình xác thực.";
      setAuthError(errMsg);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Đang khởi động hệ thống...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/30 blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/30 blur-[80px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-2xl p-8 relative z-10 text-center">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
            Chào mừng trở lại,
          </h2>
          <p className="text-base font-semibold text-violet-600 mb-2 truncate">
            {user.email}
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Hệ thống quản lý công việc của bạn đang được thiết lập. Hãy quay lại sau!
          </p>
          <button
            onClick={handleSignOut}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 px-6 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/30 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/30 blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-2xl p-8 relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 shadow-md shadow-violet-500/10 mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {authMode === "signin" ? "Đăng nhập Webapp" : "Đăng ký tài khoản"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {authMode === "signin" ? "Chào mừng trở lại ứng dụng của bạn" : "Tạo tài khoản sử dụng riêng"}
          </p>
        </div>

        {authError && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-200 p-4 text-xs font-medium text-rose-600">
            {authError}
          </div>
        )}

        {authSuccess && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-200 p-4 text-xs font-medium text-emerald-600">
            {authSuccess}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40 focus:bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingAuth}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/15 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            {submittingAuth ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : null}
            {authMode === "signin" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200/60 pt-6">
          <button
            onClick={() => {
              setAuthMode(authMode === "signin" ? "signup" : "signin");
              setAuthError("");
              setAuthSuccess("");
            }}
            className="text-xs font-medium text-slate-500 hover:text-violet-600 transition cursor-pointer"
          >
            {authMode === "signin" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
