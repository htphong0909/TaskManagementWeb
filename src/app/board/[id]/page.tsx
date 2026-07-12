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
  const [, setDraggedCardId] = useState<string | null>(null);
  const [, setDraggedListId] = useState<string | null>(null);

  const params = useParams();
  const router = useRouter();
  const boardId = params?.id as string;

  const fetchBoardData = useCallback(async () => {
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
