# Tái cấu trúc cấu trúc Component Board & Tích hợp Kéo thả Drag and Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng click outside tự động lưu mô tả, tách file components `BoardCard` và `BoardColumn`, tích hợp kéo thả cột/thẻ bằng HTML5 Drag & Drop đồng bộ tức thời với Supabase.

---

## Global Constraints
- **Không phá vỡ RLS:** Các thay đổi cơ sở dữ liệu phải tương ứng với RLS hiện tại (cho phép update/delete/insert).
- **TypeScript 100%:** Biên dịch không sinh ra bất kỳ cảnh báo kiểu dữ liệu nào.

---

### Task 1: Click outside tự động lưu mô tả (CardPopover)

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Khai báo ref và useEffect click outside**

Thêm `descEditorRef` và `useEffect` xử lý bắt sự kiện click bên ngoài khung mô tả trong `src/components/CardPopover.tsx`:

```typescript
  const descEditorRef = useRef<HTMLDivElement>(null);

  // Tự động lưu mô tả khi click ra ngoài vùng soạn thảo
  useEffect(() => {
    if (!isEditingDesc) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (descEditorRef.current && !descEditorRef.current.contains(event.target as Node)) {
        handleSaveDescription();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingDesc, handleSaveDescription]);
```

- [ ] **Step 2: Gắn ref vào container soạn thảo mô tả**

Tìm khối JSX chứa textarea soạn thảo mô tả trong `src/components/CardPopover.tsx` và gắn ref vào container `div`:

```tsx
        {isEditingDesc ? (
          <div ref={descEditorRef} className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả thẻ công việc... (Hỗ trợ Markdown)"
              className="w-full h-32 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40 font-normal leading-relaxed resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) handleSaveDescription();
                if (e.key === "Escape") setIsEditingDesc(false);
              }}
            />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: auto-save markdown description when clicking outside in CardPopover"
```

---

### Task 2: Tạo components `BoardCard` và `BoardColumn`

**Files:**
- Create: `src/components/BoardCard.tsx`
- Create: `src/components/BoardColumn.tsx`

- [ ] **Step 1: Tạo tệp BoardCard.tsx**

Tạo mới file `src/components/BoardCard.tsx` hiển thị thẻ đơn lẻ và hỗ trợ các sự kiện kéo thẻ:

```typescript
import React from "react";

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
}

interface BoardCardProps {
  card: Card;
  isEditingCard: boolean;
  editCardTitle: string;
  setEditCardTitle: (title: string) => void;
  editingCardId: string | null;
  setEditingCardId: (id: string | null) => void;
  handleRenameCardSubmit: (id: string) => void;
  setCardToDelete: (card: Card) => void;
  handleCardMouseEnter: (card: Card, event: React.MouseEvent<HTMLDivElement>) => void;
  handleCardMouseLeave: () => void;
  onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
  onDragEndCard: (e: React.DragEvent) => void;
  onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
}

export default function BoardCard({
  card,
  isEditingCard,
  editCardTitle,
  setEditCardTitle,
  editingCardId,
  setEditingCardId,
  handleRenameCardSubmit,
  setCardToDelete,
  handleCardMouseEnter,
  handleCardMouseLeave,
  onDragStartCard,
  onDragEndCard,
  onCardDropOnCard,
}: BoardCardProps) {
  const formatCreatedAt = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDeadlineStyleAndText = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    const now = new Date();
    const due = new Date(dueDateStr);
    const timeDiff = due.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let className = "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold w-fit ";
    let text = "";

    const formatTime = (d: Date) => {
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${hours}:${minutes} ${day}/${month}`;
    };

    if (timeDiff < 0) {
      className += "bg-rose-50 text-rose-600 border border-rose-100";
      text = `Quá hạn (${formatTime(due)})`;
    } else if (daysDiff <= 1) {
      className += "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse";
      text = `Sắp hết hạn (${formatTime(due)})`;
    } else {
      className += "bg-emerald-50 text-emerald-600 border border-emerald-100";
      text = `Hạn chót: ${formatTime(due)}`;
    }

    return { className, text };
  };

  const dlInfo = getDeadlineStyleAndText(card.due_date);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartCard(e, card.id, card.list_id)}
      onDragEnd={onDragEndCard}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onCardDropOnCard(e, card.id)}
      onMouseEnter={(e) => handleCardMouseEnter(card, e)}
      onMouseLeave={handleCardMouseLeave}
      onDoubleClick={() => !isEditingCard && [setEditingCardId(card.id), setEditCardTitle(card.title)]}
      className="group/card bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] rounded-xl p-4 flex flex-col gap-2 relative transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 cursor-grab active:cursor-grabbing"
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
          <span className="text-[10px] text-slate-400 font-medium text-left">
            {formatCreatedAt(card.created_at)}
          </span>

          <span className="text-xs font-semibold text-slate-700 text-left select-none break-words line-clamp-2 pr-4">
            {card.title}
          </span>

          {dlInfo && (
            <div className={dlInfo.className}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{dlInfo.text}</span>
            </div>
          )}

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
}
```

- [ ] **Step 2: Tạo tệp BoardColumn.tsx**

Tạo mới file `src/components/BoardColumn.tsx` hiển thị cột và chứa các thẻ:

```typescript
import React from "react";
import BoardCard from "./BoardCard";

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

interface BoardColumnProps {
  list: List;
  listCards: Card[];
  editingListId: string | null;
  setEditingListId: (id: string | null) => void;
  editListTitle: string;
  setEditListTitle: (title: string) => void;
  handleRenameListSubmit: (id: string) => void;
  setListToDelete: (list: List) => void;
  // Card Creation Form
  addingCardListId: string | null;
  setAddingCardListId: (id: string | null) => void;
  newCardTitle: string;
  setNewCardTitle: (title: string) => void;
  newCardDueDate: string;
  setNewCardDueDate: (date: string) => void;
  handleAddCardSubmit: (e: React.FormEvent, listId: string) => void;
  // Card properties
  editingCardId: string | null;
  setEditingCardId: (id: string | null) => void;
  editCardTitle: string;
  setEditCardTitle: (title: string) => void;
  handleRenameCardSubmit: (id: string) => void;
  setCardToDelete: (card: Card) => void;
  handleCardMouseEnter: (card: Card, event: React.MouseEvent<HTMLDivElement>) => void;
  handleCardMouseLeave: () => void;
  // Drag & Drop handlers
  onDragStartList: (e: React.DragEvent, listId: string) => void;
  onDragOverList: (e: React.DragEvent) => void;
  onDropList: (e: React.DragEvent, targetListId: string) => void;
  onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
  onDragEndCard: (e: React.DragEvent) => void;
  onCardDropOnList: (e: React.DragEvent, targetListId: string) => void;
  onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
}

export default function BoardColumn({
  list,
  listCards,
  editingListId,
  setEditingListId,
  editListTitle,
  setEditListTitle,
  handleRenameListSubmit,
  setListToDelete,
  addingCardListId,
  setAddingCardListId,
  newCardTitle,
  setNewCardTitle,
  newCardDueDate,
  setNewCardDueDate,
  handleAddCardSubmit,
  editingCardId,
  setEditingCardId,
  editCardTitle,
  setEditCardTitle,
  handleRenameCardSubmit,
  setCardToDelete,
  handleCardMouseEnter,
  handleCardMouseLeave,
  onDragStartList,
  onDragOverList,
  onDropList,
  onDragStartCard,
  onDragEndCard,
  onCardDropOnList,
  onCardDropOnCard,
}: BoardColumnProps) {
  const isEditingList = list.id === editingListId;
  const isAddingCard = list.id === addingCardListId;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartList(e, list.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverList(e);
      }}
      onDrop={(e) => {
        // Nếu đối tượng được kéo là card, cho phép drop vào danh sách này
        if (e.dataTransfer.types.includes("text/card-id")) {
          onCardDropOnList(e, list.id);
        } else {
          onDropList(e, list.id);
        }
      }}
      className="bg-slate-50/50 backdrop-blur-md border border-slate-200/50 rounded-2xl p-4 flex flex-col min-w-72 max-w-72 max-h-[calc(100vh-140px)] shrink-0 shadow-sm"
    >
      {/* Header cột */}
      <div className="flex items-center justify-between mb-3 group">
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
            className="bg-white border border-violet-400 outline-none text-sm font-bold text-slate-800 rounded-lg px-2.5 py-1 w-full"
            autoFocus
          />
        ) : (
          <>
            <span
              onClick={() => [setEditingListId(list.id), setEditListTitle(list.title)]}
              className="text-sm font-bold text-slate-800 cursor-pointer select-none truncate flex-1 text-left"
            >
              {list.title}
            </span>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <button
                onClick={() => setAddingCardListId(list.id)}
                className="h-6 w-6 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 flex items-center justify-center transition cursor-pointer"
                title="Thêm thẻ công việc"
              >
                +
              </button>
              <button
                onClick={() => setListToDelete(list)}
                className="h-6 w-6 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition cursor-pointer"
                title="Xóa danh sách"
              >
                ✕
              </button>
            </div>
          </>
        )}
      </div>

      {/* Danh sách các Cards */}
      <div className="space-y-3 flex-1 overflow-y-auto mb-3 pr-1 min-h-[50px]">
        {listCards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            isEditingCard={card.id === editingCardId}
            editCardTitle={editCardTitle}
            setEditCardTitle={setEditCardTitle}
            editingCardId={editingCardId}
            setEditingCardId={setEditingCardId}
            handleRenameCardSubmit={handleRenameCardSubmit}
            setCardToDelete={setCardToDelete}
            handleCardMouseEnter={handleCardMouseEnter}
            handleCardMouseLeave={handleCardMouseLeave}
            onDragStartCard={onDragStartCard}
            onDragEndCard={onDragEndCard}
            onCardDropOnCard={onCardDropOnCard}
          />
        ))}
      </div>

      {/* Form thêm card mới */}
      {isAddingCard ? (
        <form
          onSubmit={(e) => handleAddCardSubmit(e, list.id)}
          className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] rounded-xl p-3 flex flex-col gap-3"
        >
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 text-left">Tiêu đề thẻ</label>
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
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 text-left">Hạn chót (Deadline)</label>
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
          className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 hover:border-violet-300 hover:bg-violet-50/20 text-slate-400 hover:text-violet-600 text-[11px] font-bold tracking-wide transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>+</span> THÊM THẺ MỚI
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit các file mới**

```bash
git add src/components/BoardCard.tsx src/components/BoardColumn.tsx
git commit -m "feat: decompose Kanban Board UI into BoardCard and BoardColumn components"
```

---

### Task 3: Tích hợp Kéo thả Drag and Drop vào page.tsx

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Viết lại page.tsx để xử lý Drag & Drop và import components mới**

Sửa đổi toàn bộ tệp [src/app/board/[id]/page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/[id]/page.tsx) để thay thế code render HTML inline bằng các components mới, thêm các bộ lắng nghe sự kiện kéo thả HTML5, đồng bộ lập tức vị trí cột/thẻ xuống Supabase:

```typescript
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import CardPopover from "@/components/CardPopover";
import BoardColumn from "@/components/BoardColumn";

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

export default function BoardPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [boardTitle, setBoardTitle] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [mounted, setMounted] = useState(false);

  // States quản lý Cột (List)
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListTitle, setEditListTitle] = useState("");
  const [listToDelete, setListToDelete] = useState<List | null>(null);

  // States quản lý Thẻ (Card)
  const [addingCardListId, setAddingCardListId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDueDate, setNewCardDueDate] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardTitle, setEditCardTitle] = useState("");
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);

  // Popover state cho Card
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPopoverBusy, setIsPopoverBusy] = useState(false);

  // Kéo thả states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedListId, setDraggedListId] = useState<string | null>(null);

  const params = useParams();
  const router = useRouter();
  const boardId = params?.id as string;

  const fetchBoardData = useCallback(async () => {
    setIsFetching(true);
    try {
      // 1. Tải thông tin Board
      const { data: boardData } = await supabase
        .from("boards")
        .select("title")
        .eq("id", boardId)
        .single();
      if (boardData) setBoardTitle(boardData.title);

      // 2. Tải danh sách Lists
      const { data: listData } = await supabase
        .from("lists")
        .select("id, title, position")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      const currentLists = listData || [];
      setLists(currentLists);

      // 3. Tải tất cả Cards
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
    if (boardId) {
      const timer = setTimeout(() => {
        setMounted(true);
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
      const nextPosition = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) + 1 : 1;
      const { error } = await supabase.from("lists").insert([
        {
          board_id: boardId,
          title: newListTitle.trim(),
          position: nextPosition,
        },
      ]);

      if (error) throw error;
      setNewListTitle("");
      setIsAddingList(false);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi thêm cột mới:", err);
    }
  };

  // Đổi tên Cột
  const handleRenameListSubmit = async (id: string) => {
    if (!editListTitle.trim()) return;
    try {
      const { error } = await supabase
        .from("lists")
        .update({ title: editListTitle.trim() })
        .eq("id", id);

      if (error) throw error;
      setEditingListId(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi đổi tên cột:", err);
    }
  };

  // Xóa Cột
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
      console.error("Lỗi xóa cột:", err);
    }
  };

  // Thêm thẻ mới
  const handleAddCardSubmit = async (e: React.FormEvent, listId: string) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      const listCards = cards.filter((c) => c.list_id === listId);
      const nextPosition = listCards.length > 0 ? Math.max(...listCards.map((c) => c.position)) + 1 : 1;

      const { error } = await supabase.from("cards").insert([
        {
          list_id: listId,
          title: newCardTitle.trim(),
          position: nextPosition,
          due_date: newCardDueDate ? new Date(newCardDueDate).toISOString() : null,
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

  // Đổi tên thẻ
  const handleRenameCardSubmit = async (id: string) => {
    if (!editCardTitle.trim()) return;
    try {
      const { error } = await supabase
        .from("cards")
        .update({ title: editCardTitle.trim() })
        .eq("id", id);

      if (error) throw error;
      setEditingCardId(null);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi đổi tên thẻ:", err);
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

  // Hover Popover events
  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    if (isPopoverBusy) return;
    if (editingCardId === card.id) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard(card);
    setHoveredRect(rect);
  };

  const handleCardMouseLeave = () => {
    if (isPopoverBusy) return;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }, 200);
  };

  const handlePopoverMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (isPopoverBusy) return;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }, 200);
  };

  // Drag & Drop Lists
  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    e.dataTransfer.setData("text/list-id", listId);
    setDraggedListId(listId);
  };

  const handleListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleListDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    const sourceListId = e.dataTransfer.getData("text/list-id");
    if (!sourceListId || sourceListId === targetListId) return;

    const sourceList = lists.find((l) => l.id === sourceListId);
    const targetList = lists.find((l) => l.id === targetListId);
    if (!sourceList || !targetList) return;

    // Swap positions
    const newLists = [...lists];
    const sourceIdx = newLists.findIndex((l) => l.id === sourceListId);
    const targetIdx = newLists.findIndex((l) => l.id === targetListId);

    const tempPos = sourceList.position;
    sourceList.position = targetList.position;
    targetList.position = tempPos;

    newLists[sourceIdx] = targetList;
    newLists[targetIdx] = sourceList;
    setLists(newLists.sort((a, b) => a.position - b.position));

    try {
      await Promise.all([
        supabase.from("lists").update({ position: sourceList.position }).eq("id", sourceList.id),
        supabase.from("lists").update({ position: targetList.position }).eq("id", targetList.id),
      ]);
    } catch (err) {
      console.error("Lỗi đồng bộ thứ tự cột:", err);
    }
  };

  // Drag & Drop Cards
  const handleCardDragStart = (e: React.DragEvent, cardId: string, listId: string) => {
    e.dataTransfer.setData("text/card-id", cardId);
    e.dataTransfer.setData("text/source-list-id", listId);
    setDraggedCardId(cardId);
  };

  const handleCardEnd = () => {
    setDraggedCardId(null);
  };

  const handleCardDropOnList = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/card-id");
    const sourceListId = e.dataTransfer.getData("text/source-list-id");
    if (!cardId) return;

    // Nếu thả vào cột khác hoặc thay đổi cấu trúc
    const listCards = cards.filter((c) => c.list_id === targetListId);
    const nextPosition = listCards.length > 0 ? Math.max(...listCards.map((c) => c.position)) + 1 : 1;

    const updatedCards = cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, list_id: targetListId, position: nextPosition };
      }
      return c;
    });
    setCards(updatedCards);

    try {
      const { error } = await supabase
        .from("cards")
        .update({ list_id: targetListId, position: nextPosition })
        .eq("id", cardId);
      if (error) throw error;
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi thả card vào cột:", err);
    }
  };

  const handleCardDropOnCard = async (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const cardId = e.dataTransfer.getData("text/card-id");
    if (!cardId || cardId === targetCardId) return;

    const sourceCard = cards.find((c) => c.id === cardId);
    const targetCard = cards.find((c) => c.id === targetCardId);
    if (!sourceCard || !targetCard) return;

    const targetListId = targetCard.list_id;

    // Sắp xếp lại danh sách cards của cột mục tiêu
    const listCards = cards.filter((c) => c.list_id === targetListId && c.id !== cardId).sort((a, b) => a.position - b.position);
    const targetIdx = listCards.findIndex((c) => c.id === targetCardId);

    // Chèn sourceCard vào vị trí của targetCard
    listCards.splice(targetIdx, 0, { ...sourceCard, list_id: targetListId });

    // Cập nhật lại thuộc tính position tuần tự
    const promises = listCards.map((c, index) => {
      const newPos = index + 1;
      return supabase.from("cards").update({ list_id: targetListId, position: newPos }).eq("id", c.id);
    });

    try {
      await Promise.all(promises);
      await fetchBoardData();
    } catch (err) {
      console.error("Lỗi sắp xếp lại các card:", err);
    }
  };

  if (loadingWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="text-slate-400 text-xs font-semibold mt-4">Đang tải không gian làm việc...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-6 flex flex-col gap-6 text-slate-100">
      {/* Header Board */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="px-3.5 py-1.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold transition duration-150 cursor-pointer"
          >
            ← Bảng điều khiển
          </button>
          <h2 className="text-lg font-black tracking-tight text-white select-none">{boardTitle || "Bảng công việc"}</h2>
        </div>
      </div>

      {/* Board Columns Area */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-start select-none">
        {lists.map((list) => {
          const listCards = cards.filter((c) => c.list_id === list.id).sort((a, b) => a.position - b.position);

          return (
            <BoardColumn
              key={list.id}
              list={list}
              listCards={listCards}
              editingListId={editingListId}
              setEditingListId={setEditingListId}
              editListTitle={editListTitle}
              setEditListTitle={setEditListTitle}
              handleRenameListSubmit={handleRenameListSubmit}
              setListToDelete={setListToDelete}
              addingCardListId={addingCardListId}
              setAddingCardListId={setAddingCardListId}
              newCardTitle={newCardTitle}
              setNewCardTitle={setNewCardTitle}
              newCardDueDate={newCardDueDate}
              setNewCardDueDate={setNewCardDueDate}
              handleAddCardSubmit={handleAddCardSubmit}
              editingCardId={editingCardId}
              setEditingCardId={setEditingCardId}
              editCardTitle={editCardTitle}
              setEditCardTitle={setEditCardTitle}
              handleRenameCardSubmit={handleRenameCardSubmit}
              setCardToDelete={setCardToDelete}
              handleCardMouseEnter={handleCardMouseEnter}
              handleCardMouseLeave={handleCardMouseLeave}
              onDragStartList={handleListDragStart}
              onDragOverList={handleListDragOver}
              onDropList={handleListDrop}
              onDragStartCard={handleCardDragStart}
              onDragEndCard={handleCardEnd}
              onCardDropOnList={handleCardDropOnList}
              onCardDropOnCard={handleCardDropOnCard}
            />
          );
        })}

        {/* Thêm cột danh sách mới */}
        <div className="min-w-72 max-w-72 shrink-0">
          {isAddingList ? (
            <form
              onSubmit={handleAddListSubmit}
              className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
            >
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 text-left">Tên danh sách</label>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Nhập tên cột..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/40"
                  required
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 cursor-pointer shadow-md shadow-violet-600/10"
                >
                  Thêm cột
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListTitle("");
                  }}
                  className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center"
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

      {/* Floating Card Popover */}
      {hoveredCard && hoveredRect && (
        <CardPopover
          card={hoveredCard}
          rect={hoveredRect}
          onClose={() => {
            setHoveredCard(null);
            setHoveredRect(null);
          }}
          onCardUpdated={fetchBoardData}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onBusyChange={setIsPopoverBusy}
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
              Bạn có chắc chắn muốn xóa thẻ <strong className="text-slate-700">&quot;{cardToDelete.title}&quot;</strong>? Thẻ này sẽ bị xóa vĩnh viễn và không thể khôi phục.
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: integrate BoardColumn and BoardCard components with HTML5 Drag & Drop reordering in Board page"
```

---

### Task 4: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
