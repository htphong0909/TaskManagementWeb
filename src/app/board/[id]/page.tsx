# Quản lý Thẻ công việc (Cards Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai các tính năng hiển thị thẻ, thêm thẻ mới (kèm chọn deadline), sửa tiêu đề thẻ trực tiếp (inline) và xóa thẻ.

**Architecture:**
- **Database:** Tạo file migration SQL bổ sung cột `due_date` cho bảng `cards`.
- **BoardDetailPage (`src/app/board/[id]/page.tsx`):**
  - Quản lý các trạng thái thêm thẻ mới theo từng cột (`addingCardListId`, `newCardTitle`, `newCardDueDate`).
  - Quản lý các trạng thái sửa tên thẻ (`editingCardId`, `editCardTitle`).
  - Quản lý trạng thái xóa thẻ (`cardToDelete`) và hiển thị Modal xác nhận qua React Portal.
  - Các hàm gọi Supabase API: `handleAddCard`, `handleRenameCard`, `handleDeleteCard`.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS v4, Supabase JS, Vitest.

---

### Task 1: Tạo file migration SQL bổ sung cột `due_date` cho bảng `cards`

**Files:**
- Create: `supabase/migrations/20260712161500_add_due_date_to_cards.sql`

- [ ] **Step 1: Tạo file SQL migration**

Tạo file `supabase/migrations/20260712161500_add_due_date_to_cards.sql` với câu lệnh:

```sql
-- Thêm cột due_date cho bảng cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260712161500_add_due_date_to_cards.sql
git commit -m "db: add due_date column to cards table migration"
```

---

### Task 2: Cập nhật trang `/board/[id]/page.tsx` với logic quản lý Thẻ

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Cập nhật mã nguồn của `src/app/board/[id]/page.tsx`**

Cập nhật `src/app/board/[id]/page.tsx` để tích hợp đầy đủ UI/UX thêm, sửa inline, xóa thẻ công việc và hiển thị ngày tạo, deadline:

```typescript
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import CardPopover from "@/components/CardPopover";
import { createPortal } from "react-dom";

interface List {
  id: string;
  title: string;
  position: number;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
}

export default function BoardDetailPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [mounted, setMounted] = useState(false);

  // States thêm cột mới
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  // States đổi tên cột
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState("");

  // States xóa cột
  const [listToDelete, setListToDelete] = useState<List | null>(null);

  // States thêm thẻ mới
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDueDate, setNewCardDueDate] = useState("");

  // States đổi tên thẻ
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");

  // States xóa thẻ
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);

  // Popover state cho Card
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

  const params = useParams();
  const boardId = params?.id as string;

  const fetchBoardData = useCallback(async () => {
    setIsFetching(true);
    try {
      // 1. Tải danh sách Lists
      const { data: listData } = await supabase
        .from("lists")
        .select("id, title, position")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      const currentLists = listData || [];
      setLists(currentLists);

      // 2. Tải tất cả Cards cho các lists
      if (currentLists.length > 0) {
        const listIds = currentLists.map((l) => l.id);
        const { data: cardData } = await supabase
          .from("cards")
          .select("id, list_id, title, content, position, due_date, created_at")
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

  useEffect(() => {
    setMounted(true);
    if (boardId) {
      const timer = setTimeout(() => {
        fetchBoardData();
      }, 0);
      return () => {
        clearTimeout(timer);
        setMounted(false);
      };
    }
  }, [boardId, fetchBoardData]);

  // Thêm danh sách cột mới
  const handleAddListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    try {
      const maxPosition = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) : 0;
      const newPosition = maxPosition + 1000;

      const { error } = await supabase
        .from("lists")
        .insert([
          {
            title: newListTitle.trim(),
            board_id: boardId,
            position: newPosition,
          },
        ]);

      if (error) throw error;

      setNewListTitle("");
      setIsAddingList(false);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi thêm danh sách cột:", err);
    }
  };

  // Sửa tên cột
  const handleRenameListSubmit = async (listId: string) => {
    if (!editListTitle.trim()) {
      setEditingListId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("lists")
        .update({ title: editListTitle.trim() })
        .eq("id", listId);

      if (error) throw error;

      setEditingListId(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi cập nhật tên cột:", err);
    }
  };

  // Xóa danh sách cột
  const handleDeleteListSubmit = async () => {
    if (!listToDelete) return;

    try {
      const { error } = await supabase
        .from("lists")
        .delete()
        .eq("id", listToDelete.id);

      if (error) throw error;

      setListToDelete(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi xóa danh sách cột:", err);
    }
  };

  // Thêm thẻ mới
  const handleAddCardSubmit = async (e: React.FormEvent, listId: string) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      const listCards = cards.filter((c) => c.list_id === listId);
      const maxPosition = listCards.length > 0 ? Math.max(...listCards.map((c) => c.position)) : 0;
      const newPosition = maxPosition + 1000;

      const formattedDueDate = newCardDueDate ? new Date(newCardDueDate).toISOString() : null;

      const { error } = await supabase
        .from("cards")
        .insert([
          {
            title: newCardTitle.trim(),
            list_id: listId,
            position: newPosition,
            due_date: formattedDueDate,
          },
        ]);

      if (error) throw error;

      setNewCardTitle("");
      setNewCardDueDate("");
      setAddingCardListId(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi thêm thẻ mới:", err);
    }
  };

  // Sửa tiêu đề thẻ
  const handleRenameCardSubmit = async (cardId: string) => {
    if (!editCardTitle.trim()) {
      setEditingCardId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("cards")
        .update({ title: editCardTitle.trim() })
        .eq("id", cardId);

      if (error) throw error;

      setEditingCardId(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi cập nhật tiêu đề thẻ:", err);
    }
  };

  // Xóa thẻ
  const handleDeleteCardSubmit = async () => {
    if (!cardToDelete) return;

    try {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardToDelete.id);

      if (error) throw error;

      setCardToDelete(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi xóa thẻ:", err);
    }
  };

  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    // Chỉ hiển thị Popover khi KHÔNG ở chế độ edit tên thẻ
    if (editingCardId === card.id) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard(card);
    setHoveredRect(rect);
  };

  const handleCardMouseLeave = () => {
    setHoveredCard(null);
    setHoveredRect(null);
  };

  // Định dạng ngày tạo
  const formatCreatedAt = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Định dạng Deadline và tính màu sắc khẩn cấp
  const getDeadlineStyleAndText = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;

    const d = new Date(dueDateStr);
    const now = new Date();

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    const text = `${hours}:${minutes} - ${day}/${month}/${year}`;

    // Tính khẩn cấp
    const diffMs = d.getTime() - now.getTime();
    const isOverdue = diffMs < 0;
    const isApproaching = diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000; // Trong 24h

    let className = "text-[11px] font-bold px-2 py-1 rounded-lg border w-max flex items-center gap-1.5 ";
    if (isOverdue) {
      className += "text-rose-600 bg-rose-50 border-rose-100";
    } else if (isApproaching) {
      className += "text-amber-600 bg-amber-50 border-amber-100";
    } else {
      className += "text-violet-600 bg-violet-50 border-violet-100";
    }

    return { text, className };
  };

  if (loadingWorkspace && !isFetching) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Top progress bar when switching boards */}
      {isFetching && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse z-50"></div>
      )}

      {/* Main Workspace (Kanban Area) */}
      <div className="h-full w-full overflow-x-auto p-6 flex items-start gap-6">
        <div className={`h-full flex items-start gap-6 transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
          {lists.map((list) => {
            const listCards = cards.filter((c) => c.list_id === list.id);
            const isEditingList = list.id === editingListId;
            const isAddingCard = list.id === addingCardListId;

            return (
              <div
                key={list.id}
                className="min-w-[250px] w-[20vw] flex-shrink-0 bg-white/50 backdrop-blur-lg border border-white/30 shadow-sm rounded-2xl p-4 flex flex-col max-h-full overflow-y-auto"
              >
                {/* Tiêu đề danh sách cột */}
                <div className="group/title flex items-center justify-between mb-3 px-1 relative">
                  {isEditingList ? (
                    <input
                      type="text"
                      value={editListTitle}
                      onChange={(e) => setEditListTitle(e.target.value)}
                      onBlur={() => handleRenameListSubmit(list.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameListSubmit(list.id);
                        if (e.key === "Escape") setEditingListId(null);
                      }}
                      className="bg-white border border-violet-400 outline-none text-slate-700 font-bold rounded-lg px-2 py-1 text-sm w-full"
                      autoFocus
                    />
                  ) : (
                    <>
                      <h3
                        onClick={() => handleStartRenameList(list)}
                        className="text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100/50 rounded-lg px-1 py-0.5 flex-1 select-none break-words pr-6"
                      >
                        {list.title}
                      </h3>
                      <button
                        onClick={() => setListToDelete(list)}
                        className="hidden group-hover/title:flex absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 items-center justify-center rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Xóa danh sách"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Các Thẻ công việc */}
                <div className="space-y-3 flex-1 overflow-y-auto mb-3">
                  {listCards.map((card) => {
                    const isEditingCard = card.id === editingCardId;
                    const dlInfo = getDeadlineStyleAndText(card.due_date);

                    return (
                      <div
                        key={card.id}
                        onMouseEnter={(e) => handleCardMouseEnter(card, e)}
                        onMouseLeave={handleCardMouseLeave}
                        onDoubleClick={() => !isEditingCard && [setEditingCardId(card.id), setEditCardTitle(card.title)]}
                        className="group/card bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] rounded-xl p-4 flex flex-col gap-2 relative transition duration-150 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 cursor-pointer"
                      >
                        {isEditingCard ? (
                          <input
                            type="text"
                            value={editCardTitle}
                            onChange={(e) => setEditCardTitle(e.target.value)}
                            onBlur={() => handleRenameCardSubmit(card.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameCardSubmit(card.id);
                              if (e.key === "Escape") setEditingCardId(null);
                            }}
                            className="bg-white border border-violet-400 outline-none text-slate-700 font-semibold rounded-lg px-2 py-1 text-xs w-full"
                            autoFocus
                          />
                        ) : (
                          <>
                            {/* Góc trái trên: Ngày tạo */}
                            <span className="text-[10px] text-slate-400 font-medium text-left">
                              {formatCreatedAt(card.created_at)}
                            </span>

                            {/* Chính giữa: Tiêu đề */}
                            <span className="text-xs font-semibold text-slate-700 text-left select-none break-words line-clamp-2 pr-4">
                              {card.title}
                            </span>

                            {/* Góc trái dưới: Deadline */}
                            {dlInfo && (
                              <div className={dlInfo.className}>
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{dlInfo.text}</span>
                              </div>
                            )}

                            {/* Nút xóa thẻ xuất hiện khi hover */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardToDelete(card);
                              }}
                              className="hidden group-hover/card:flex absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              title="Xóa thẻ"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Form thêm thẻ mới */}
                {isAddingCard ? (
                  <form
                    onSubmit={(e) => handleAddCardSubmit(e, list.id)}
                    className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] rounded-xl p-3 flex flex-col gap-3"
                  >
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Tiêu đề thẻ</label>
                      <input
                        type="text"
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        placeholder="Nhập tiêu đề thẻ..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Hạn chót (Deadline)</label>
                      <input
                        type="datetime-local"
                        value={newCardDueDate}
                        onChange={(e) => setNewCardDueDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-500 cursor-pointer shadow-md shadow-violet-600/10"
                      >
                        Thêm thẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCardListId(null);
                          setNewCardTitle("");
                          setNewCardDueDate("");
                        }}
                        className="h-7 w-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingCardListId(list.id)}
                    className="w-full bg-white/30 hover:bg-white/50 border border-transparent text-slate-500 hover:text-slate-600 rounded-xl py-2 cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5 transition duration-150"
                  >
                    <span>+</span> Thêm thẻ mới
                  </button>
                )}
              </div>
            );
          })}

          {/* Khối thêm Cột mới */}
          <div className="min-w-[250px] w-[20vw] flex-shrink-0">
            {isAddingList ? (
              <form
                onSubmit={handleAddListSubmit}
                className="bg-white/60 backdrop-blur-lg border border-white/40 shadow-sm rounded-2xl p-4 space-y-3"
              >
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Nhập tiêu đề danh sách..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40"
                  required
                  autoFocus
                />
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 cursor-pointer shadow-md shadow-violet-600/10"
                  >
                    Thêm danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListTitle("");
                    }}
                    className="h-8 w-8 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full bg-white/20 hover:bg-white/35 border-dashed border-2 border-slate-300/60 text-slate-500 hover:text-slate-600 rounded-2xl p-4 cursor-pointer text-sm font-semibold h-14 flex items-center justify-center gap-2 transition duration-200"
              >
                <span className="text-base">+</span> Thêm danh sách
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Card Popover */}
      {hoveredCard && hoveredRect && (
        <CardPopover
          title={hoveredCard.title}
          content={hoveredCard.content}
          rect={hoveredRect}
          onClose={() => setHoveredCard(null)}
        />
      )}

      {/* Hộp thoại xác nhận xóa Cột (Render qua React Portal) */}
      {listToDelete && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Xóa danh sách cột?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa danh sách <strong className="text-slate-700">&quot;{listToDelete.title}&quot;</strong>? Tất cả các thẻ công việc bên trong sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setListToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteListSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500 cursor-pointer shadow-md shadow-rose-600/10"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hộp thoại xác nhận xóa Thẻ (Render qua React Portal) */}
      {cardToDelete && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Xóa thẻ công việc?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa thẻ công việc <strong className="text-slate-700">&quot;{cardToDelete.title}&quot;</strong>? Thao tác này sẽ xóa thẻ vĩnh viễn và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteCardSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-500 cursor-pointer shadow-md shadow-rose-600/10"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
