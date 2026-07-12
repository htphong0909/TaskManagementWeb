# Trải nghiệm chuyển đổi Board mượt mà & Quản lý Board nâng cao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ hiện tượng nhấp nháy (flickering) khi chuyển board bằng phương pháp Background Fetching, và tích hợp các tính năng Đổi tên Board (nhấp đúp tab) và Xóa Board trực tiếp trên Excel-switcher.

**Architecture:**
- **BoardSwitcher:** Bổ sung state `editingBoardId`. Render input inline khi double-click, gọi hàm `onRenameBoard` để cập nhật Supabase. Thêm nút xóa (`🗑`) xuất hiện khi hover, tích hợp Popup xác nhận xóa, gọi hàm `onDeleteBoard` và điều hướng về `/`.
- **BoardDetailPage:** Thay đổi logic loading. Thêm state `isFetching` để làm mờ nhẹ màn hình khi tải nền dữ liệu mới và hiện thanh progress bar mảnh ở top. Màn hình loading trung tâm chỉ chạy khi mở trang lần đầu.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, Supabase JS, Vitest, Testing Library.

---

### Task 1: Cập nhật component `BoardSwitcher.tsx` với tính năng Sửa & Xóa Board

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`

- [ ] **Step 1: Viết lại file `src/components/BoardSwitcher.tsx`**

Cập nhật mã nguồn của `BoardSwitcher.tsx` để tích hợp nhấp đúp đổi tên, nút xóa thùng rác và hộp thoại xác nhận xóa:

```typescript
import React, { useState, useEffect, useCallback } from "react";
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
  onBoardDeleted?: () => void;
  onBoardRenamed?: () => void;
}

export default function BoardSwitcher({
  activeBoardId,
  userEmail,
  onSignOut,
  onBoardDeleted,
  onBoardRenamed
}: BoardSwitcherProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  
  // Xóa board state
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  
  const router = useRouter();

  const fetchBoards = useCallback(async () => {
    const { data } = await supabase
      .from("boards")
      .select("id, title")
      .order("created_at", { ascending: true });
    setBoards(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBoards();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchBoards]);

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

  const handleStartRename = (board: Board) => {
    setEditingBoardId(board.id);
    setEditTitle(board.title);
  };

  const handleRenameSubmit = async (boardId: string) => {
    if (!editTitle.trim()) {
      setEditingBoardId(null);
      return;
    }

    const { error } = await supabase
      .from("boards")
      .update({ title: editTitle.trim() })
      .eq("id", boardId);

    if (!error) {
      setEditingBoardId(null);
      await fetchBoards();
      if (onBoardRenamed) onBoardRenamed();
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;

    const { error } = await supabase
      .from("boards")
      .delete()
      .eq("id", boardToDelete.id);

    if (!error) {
      setBoardToDelete(null);
      await fetchBoards();
      if (onBoardDeleted) {
        onBoardDeleted();
      } else {
        router.push("/");
      }
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-between px-6 bg-white/40 backdrop-blur-md border-t border-white/30 text-slate-700 select-none">
      {/* Cánh trái: Excel Sheet-like tabs */}
      <div className="flex items-end h-full gap-1 pt-2">
        {boards.map((b) => {
          const isActive = b.id === activeBoardId;
          const isEditing = b.id === editingBoardId;

          return (
            <div
              key={b.id}
              className={`group flex items-center px-4 py-2 text-xs font-semibold rounded-t-xl transition-all duration-150 relative ${
                isActive
                  ? "bg-white/80 border-t border-x border-slate-200/60 text-violet-600 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] h-[90%]"
                  : "bg-white/30 border-t border-x border-transparent text-slate-500 hover:bg-white/50 h-[80%] cursor-pointer"
              }`}
              onDoubleClick={() => isActive && handleStartRename(b)}
              onClick={() => !isActive && !isEditing && router.push(`/board/${b.id}`)}
            >
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRenameSubmit(b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(b.id);
                    if (e.key === "Escape") setEditingBoardId(null);
                  }}
                  className="bg-transparent border-b border-violet-500 outline-none text-violet-600 font-bold px-0.5 w-24 text-xs"
                  autoFocus
                />
              ) : (
                <span className="pr-4">{b.title}</span>
              )}

              {/* Nút Xoá bảng xuất hiện khi hover vào active tab */}
              {isActive && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBoardToDelete(b);
                  }}
                  className="hidden group-hover:flex absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 items-center justify-center rounded-full hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                  title="Xóa bảng"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        
        {/* Nút cộng thêm Board mới */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 mb-1 text-xs font-bold rounded-lg bg-white/50 border border-slate-200/50 hover:bg-white/80 transition cursor-pointer text-slate-600 flex items-center justify-center h-[70%]"
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

      {/* Delete Confirmation Modal */}
      {boardToDelete && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Xóa bảng công việc?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa bảng <strong className="text-slate-700">"{boardToDelete.title}"</strong>? Tất cả các cột danh sách và thẻ công việc bên trong sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBoardToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteBoard}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500 cursor-pointer shadow-md shadow-rose-600/10"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BoardSwitcher.tsx
git commit -m "feat: add rename on double-click and delete board option to switcher"
```

---

### Task 2: Cập nhật `src/app/board/[id]/page.tsx` loại bỏ hiện tượng nhấp nháy

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Thay thế logic fetch dữ liệu và làm mờ màn hình**

Cập nhật `src/app/board/[id]/page.tsx`. Bổ sung trạng thái `isFetching` để tải nền không giật khung hình:

```typescript
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const [loadingWorkspace, setLoadingWorkspace] = useState(true); // Chỉ dùng cho lần load đầu tiên
  const [isFetching, setIsFetching] = useState(false); // Dùng cho việc tải ngầm khi chuyển board

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

  const fetchBoardData = useCallback(async () => {
    setIsFetching(true);
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
      setIsFetching(false);
      setLoadingWorkspace(false);
    }
  }, [boardId]);

  // Tải dữ liệu lists và cards khi có boardId
  useEffect(() => {
    if (boardId && user) {
      const timer = setTimeout(() => {
        fetchBoardData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [boardId, user, fetchBoardData]);

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

      {/* Top progress bar when switching boards */}
      {isFetching && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse z-50"></div>
      )}

      {/* 1. Main Workspace (Kanban Area) */}
      <div className="h-[92%] w-full overflow-x-auto p-6 flex items-start gap-6 z-10">
        {loadingWorkspace ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className={`h-full flex items-start gap-6 transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
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
          </div>
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
          onBoardDeleted={() => router.push("/")}
          onBoardRenamed={() => fetchBoardData()}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: eliminate flickering with background fetching and top progress indicator"
```

---

### Task 3: Kiểm tra & Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Chạy build sản phẩm**

Run: `npm run build`
Expected: PASS
