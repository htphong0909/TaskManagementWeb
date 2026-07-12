# Cấu trúc Board & Trình chuyển đổi dạng Excel (Board Switcher) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng nhiều Board chuyển đổi nhanh dạng Excel tabs ở góc trái dưới (Soft Routing) và hiển thị cột, thẻ công việc cuộn ngang cùng tính năng hiển thị chi tiết khi rê chuột (Hover Popover).

**Architecture:** 
- Database: Tạo bảng `boards`, `lists`, `cards` trên Supabase với khoá ngoại CASCADE và RLS policies.
- Routing: `/` sẽ tự động chuyển hướng người dùng đến Board đầu tiên (hoặc tạo một Board mặc định nếu chưa có). Màn hình làm việc chi tiết nằm ở `/board/[id]`.
- UI Components:
  - `BoardSwitcher`: Nằm cố định góc trái dưới màn hình, hiển thị danh sách Board dưới dạng tab Excel.
  - `BoardView`: Giao diện Kanban hiển thị danh sách cột cuộn ngang.
  - `CardPopover`: Khung chi tiết của Card hiển thị ở bên trái/phải dựa vào toạ độ chuột so với cạnh màn hình.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, Supabase JS, Vitest, Testing Library.

## Global Constraints
- **Màu nền (Background):** `bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]`
- **Cột/Thẻ mờ kính (Glassmorphism):** `bg-white/50 backdrop-blur-lg border border-white/30`
- **Bo góc:** Cột/Tab là `rounded-2xl` (16px), Thẻ/Inputs/Nút bấm là `rounded-xl` (12px).
- **Kích thước cột:** Độ rộng cố định khoảng 20% màn hình (`min-w-[250px] w-[20vw]`).

---

### Task 1: Thiết lập Database Schema trên Supabase

**Files:**
- Create: `docs/superpowers/specs/2026-07-12-database-migrations.sql`

**Interfaces:**
- Consumes: Supabase SQL Client
- Produces: `boards`, `lists`, `cards` tables, RLS policies

- [ ] **Step 1: Viết script SQL migrations để chạy trên Supabase SQL Editor**

Tạo file `docs/superpowers/specs/2026-07-12-database-migrations.sql` chứa mã SQL thiết lập cơ sở dữ liệu:

```sql
-- 1. Tạo bảng boards
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    background TEXT DEFAULT 'from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own boards" 
ON public.boards 
FOR ALL 
USING (auth.uid() = user_id);

-- 2. Tạo bảng lists (Cột)
CREATE TABLE IF NOT EXISTS public.lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho lists
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage lists of their own boards" 
ON public.lists 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = lists.board_id AND boards.user_id = auth.uid()
    )
);

-- 3. Tạo bảng cards (Thẻ)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    position FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cards of their own lists" 
ON public.cards 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.lists
        JOIN public.boards ON boards.id = lists.board_id
        WHERE lists.id = cards.list_id AND boards.user_id = auth.uid()
    )
);
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-07-12-database-migrations.sql
git commit -m "db: create SQL migration script for board structures"
```

---

### Task 2: Chuyển hướng tự động tại trang chủ `/` sang Board hoạt động

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Supabase boards query
- Produces: Client-side redirect using Next.js `useRouter`

- [ ] **Step 1: Sửa đổi page.tsx để thực hiện tự động chuyển hướng**

Cập nhật `src/app/page.tsx` để truy vấn danh sách Board của người dùng. Nếu chưa có Board nào, tự động tạo mới 1 Board mặc định có tên "Bảng của tôi" rồi chuyển hướng đến `/board/[id]`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Điều hướng khi đã đăng nhập
  useEffect(() => {
    if (user && !authLoading) {
      const handleRedirect = async () => {
        try {
          // Lấy danh sách boards
          const { data: boards, error } = await supabase
            .from("boards")
            .select("id")
            .order("created_at", { ascending: true });

          if (error) throw error;

          if (boards && boards.length > 0) {
            router.push(`/board/${boards[0].id}`);
          } else {
            // Chưa có board nào -> Tạo board mặc định đầu tiên
            const { data: newBoard, error: createError } = await supabase
              .from("boards")
              .insert([{ title: "Bảng đầu tiên", user_id: user.id }])
              .select("id")
              .single();

            if (createError) throw createError;
            if (newBoard) {
              router.push(`/board/${newBoard.id}`);
            }
          }
        } catch (err) {
          console.error("Lỗi điều hướng hoặc tạo Board mặc định:", err);
        }
      };
      handleRedirect();
    }
  }, [user, authLoading, router]);

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

  // Nếu user đã đăng nhập, hiển thị màn hình chờ điều hướng
  if (user) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Đang chuyển tới không gian làm việc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden text-slate-800">
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
```

- [ ] **Step 2: Chạy bộ kiểm thử để kiểm tra biên dịch**

Run: `npm run test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redirect user to active board or create default board on login"
```

---

### Task 3: Tạo giao diện chi tiết Board `/board/[id]` và Excel Switcher

**Files:**
- Create: `src/app/board/[id]/page.tsx`
- Create: `src/components/BoardSwitcher.tsx`
- Create: `src/components/CardPopover.tsx`

**Interfaces:**
- Consumes: Supabase Board state, dynamic params `id`
- Produces: Complete Kanban Workspace UI with Bottom Excel tabs and Hover Popover

- [ ] **Step 1: Viết Component hiển thị Popover chi tiết khi hover Card**

Tạo file `src/components/CardPopover.tsx` để xử lý hiển thị động bên trái hoặc bên phải:

```typescript
import React from "react";

interface CardPopoverProps {
  title: string;
  content: string | null;
  rect: DOMRect | null;
  onClose: () => void;
}

export default function CardPopover({ title, content, rect, onClose }: CardPopoverProps) {
  if (!rect) return null;

  const popupWidth = 320;
  const margin = 12;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;

  // Tính toán hiển thị bên phải hoặc trái
  const spaceOnRight = screenWidth - rect.right;
  const showOnRight = spaceOnRight > popupWidth + margin;

  const leftPosition = showOnRight 
    ? rect.right + margin 
    : rect.left - popupWidth - margin;

  const topPosition = rect.top;

  return (
    <div
      className="fixed bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl border border-white/40 p-5 w-80 z-50 transition-all duration-200"
      style={{
        left: `${leftPosition}px`,
        top: `${topPosition}px`,
      }}
      onMouseLeave={onClose}
    >
      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">
        {title}
      </h4>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
        {content || "Chưa có mô tả chi tiết cho thẻ này."}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Viết Component BoardSwitcher hiển thị dạng Tab Excel ở góc trái dưới**

Tạo file `src/components/BoardSwitcher.tsx`:

```typescript
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  title: string;
}

interface BoardSwitcherProps {
  activeBoardId: string;
  userEmail: string | undefined;
  onSignOut: () => void;
}

export default function BoardSwitcher({ activeBoardId, userEmail, onSignOut }: BoardSwitcherProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("boards")
      .select("id, title")
      .order("created_at", { ascending: true });
    setBoards(data || []);
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newBoard } = await supabase
      .from("boards")
      .insert([{ title: newBoardTitle.trim(), user_id: user.id }])
      .select("id")
      .single();

    if (newBoard) {
      setNewBoardTitle("");
      setShowAddModal(false);
      await fetchBoards();
      router.push(`/board/${newBoard.id}`);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-between px-6 bg-white/40 backdrop-blur-md border-t border-white/30 text-slate-700 select-none">
      {/* Cánh trái: Excel Sheet-like tabs */}
      <div className="flex items-end h-full gap-1 pt-2">
        {boards.map((b) => {
          const isActive = b.id === activeBoardId;
          return (
            <button
              key={b.id}
              onClick={() => router.push(`/board/${b.id}`)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-white/80 border-t border-x border-slate-200/60 text-violet-600 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] h-[90%]"
                  : "bg-white/30 border-t border-x border-transparent text-slate-500 hover:bg-white/50 h-[80%]"
              }`}
            >
              {b.title}
            </button>
          );
        })}
        
        {/* Nút cộng thêm Board mới */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 mb-1 text-xs font-bold rounded-lg bg-white/50 border border-slate-200/50 hover:bg-white/80 transition cursor-pointer text-slate-600 flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Cánh phải: Auth Info & Signout */}
      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
        <span className="truncate max-w-[150px]">{userEmail}</span>
        <button
          onClick={onSignOut}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white/40 hover:bg-white/80 transition cursor-pointer text-slate-600 font-semibold"
        >
          Đăng xuất
        </button>
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tạo bảng công việc mới</h3>
            <form onSubmit={handleAddBoard} className="space-y-4">
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="Tên Bảng (ví dụ: Marketing...)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40"
                required
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 cursor-pointer shadow-md shadow-violet-600/10"
                >
                  Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Viết Trang làm việc chi tiết của Board `/board/[id]/page.tsx`**

Tạo file `src/app/board/[id]/page.tsx` để liên kết BoardSwitcher, hiển thị Kanban Board và Hover Popover:

```typescript
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter, useParams } from "next/navigation";
import BoardSwitcher from "@/components/BoardSwitcher";
import CardPopover from "@/components/CardPopover";

interface List {
  id: string;
  title: string;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
}

export default function BoardDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);

  // Popover state
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

  const router = useRouter();
  const params = useParams();
  const boardId = params?.id as string;

  // Lắng nghe auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Chuyển về trang chủ nếu logout
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Tải dữ liệu lists và cards khi có boardId
  useEffect(() => {
    if (boardId && user) {
      fetchBoardData();
    }
  }, [boardId, user]);

  const fetchBoardData = async () => {
    setLoadingWorkspace(true);
    try {
      // 1. Tải danh sách Lists
      const { data: listData } = await supabase
        .from("lists")
        .select("id, title")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      const currentLists = listData || [];
      setLists(currentLists);

      // 2. Tải tất cả Cards cho các lists
      if (currentLists.length > 0) {
        const listIds = currentLists.map((l) => l.id);
        const { data: cardData } = await supabase
          .from("cards")
          .select("id, list_id, title, content")
          .in("list_id", listIds)
          .order("position", { ascending: true });
        setCards(cardData || []);
      } else {
        setCards([]);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu Board:", err);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard(card);
    setHoveredRect(rect);
  };

  const handleCardMouseLeave = () => {
    // Không tắt ngay, để popover tự quản lý hoặc tắt khi mouseLeave
    setHoveredCard(null);
    setHoveredRect(null);
  };

  if (authLoading || !user) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center text-slate-800">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] h-screen w-full flex flex-col overflow-hidden text-slate-800 relative select-none">
      {/* Background Blobs */}
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/20 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/20 blur-[80px] pointer-events-none"></div>

      {/* 1. Main Workspace (Kanban Area) */}
      <div className="h-[92%] w-full overflow-x-auto p-6 flex items-start gap-6 z-10">
        {loadingWorkspace ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {lists.map((list) => {
              const listCards = cards.filter((c) => c.list_id === list.id);
              return (
                <div
                  key={list.id}
                  className="min-w-[250px] w-[20vw] flex-shrink-0 bg-white/50 backdrop-blur-lg border border-white/30 shadow-sm rounded-2xl p-4 flex flex-col max-h-full overflow-y-auto"
                >
                  <h3 className="text-sm font-bold text-slate-700 mb-3 px-1">{list.title}</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {listCards.map((card) => (
                      <div
                        key={card.id}
                        onMouseEnter={(e) => handleCardMouseEnter(card, e)}
                        onMouseLeave={handleCardMouseLeave}
                        className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] rounded-xl p-3 text-xs font-medium text-slate-700 cursor-pointer transition duration-150 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 truncate"
                      >
                        {card.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {lists.length === 0 && (
              <div className="h-full w-full flex items-center justify-center flex-col text-slate-500 text-xs gap-2">
                <span>Không gian làm việc chưa được thiết lập.</span>
                <span>Hãy thêm danh sách cột để bắt đầu!</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. Floating Card Popover */}
      {hoveredCard && hoveredRect && (
        <CardPopover
          title={hoveredCard.title}
          content={hoveredCard.content}
          rect={hoveredRect}
          onClose={() => setHoveredCard(null)}
        />
      )}

      {/* 3. Bottom Excel Switcher Bar */}
      <div className="h-[8%] w-full z-20">
        <BoardSwitcher
          activeBoardId={boardId}
          userEmail={user.email}
          onSignOut={handleSignOut}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy bộ kiểm thử để xác minh**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CardPopover.tsx src/components/BoardSwitcher.tsx src/app/board/[id]/page.tsx
git commit -m "feat: implement board details dynamic page, excel switcher, and card hover popover"
```

---

### Task 4: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Chạy build sản phẩm**

Run: `npm run build`
Expected: PASS
