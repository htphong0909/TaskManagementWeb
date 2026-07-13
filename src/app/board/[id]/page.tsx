"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import CardPopover from "@/components/CardPopover";
import BoardColumn from "@/components/BoardColumn";
import CardDetailModal from "@/components/CardDetailModal";

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

  // States quản lý Modal chi tiết Card
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedListTitle, setSelectedListTitle] = useState<string>("");
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPopoverBusy, setIsPopoverBusy] = useState(false);

  // Kéo thả states
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const [activeDragListId, setActiveDragListId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);

  const params = useParams();
  const boardId = params?.id as string;

  // Đồng bộ hoveredCard với dữ liệu cards mới nhất khi cards thay đổi
  useEffect(() => {
    if (hoveredCard) {
      const updated = cards.find((c) => c.id === hoveredCard.id);
      if (updated && updated !== hoveredCard) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHoveredCard(updated);
      }
    }
  }, [cards, hoveredCard]);

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

  const handleCardClick = (cardId: string, listTitle: string) => {
    setSelectedCardId(cardId);
    setSelectedListTitle(listTitle);
  };

  // Hover Popover events
  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    if (activeDragCardId || activeDragListId) return;
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
    }, 100);
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
    }, 100);
  };

  // Drag & Drop Lists
  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    setHoveredCard(null);
    setHoveredRect(null);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    e.dataTransfer.setData("text/list-id", listId);
    setActiveDragListId(listId);
  };

  const handleListEnd = () => {
    setActiveDragListId(null);
    setDragOverListId(null);
  };

  const handleListDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (activeDragCardId !== null) {
      // Kéo card qua cột
      const sourceCard = cards.find((c) => c.id === activeDragCardId);
      if (sourceCard && sourceCard.list_id !== listId) {
        // Chỉ dời sang cột mới nếu cột đó hiện chưa chứa card này hoặc không có card nào khác
        const otherCardsInList = cards.filter((c) => c.list_id === listId);
        if (otherCardsInList.length === 0) {
          const updatedCards = cards.map((c) => 
            c.id === activeDragCardId ? { ...c, list_id: listId } : c
          );
          setCards(updatedCards);
        }
      }
      setDragOverListId(listId);
    } else if (activeDragListId !== null && activeDragListId !== listId) {
      // Kéo cột qua cột khác
      const sourceIdx = lists.findIndex((l) => l.id === activeDragListId);
      const targetIdx = lists.findIndex((l) => l.id === listId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const updatedLists = [...lists];
        const [draggedList] = updatedLists.splice(sourceIdx, 1);
        updatedLists.splice(targetIdx, 0, draggedList);
        setLists(updatedLists);
      }
    }
  };

  const handleListDragLeave = () => {
    setDragOverListId(null);
  };

  const handleListDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverListId(null);
    setActiveDragListId(null);
    const sourceListId = e.dataTransfer.getData("text/list-id") || activeDragListId;
    if (!sourceListId) return;

    // Lúc này mảng lists đã được sắp xếp đúng thứ tự trên giao diện qua dragOver rồi.
    // Chúng ta chỉ cần cập nhật lại position của các cột trong DB
    const promises = lists.map((l, index) => {
      const newPos = index + 1;
      l.position = newPos;
      return supabase.from("lists").update({ position: newPos }).eq("id", l.id);
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error("Lỗi đồng bộ thứ tự cột:", err);
      await fetchBoardData();
    }
  };

  // Drag & Drop Cards
  const handleCardDragStart = (e: React.DragEvent, cardId: string, listId: string) => {
    setHoveredCard(null);
    setHoveredRect(null);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    e.dataTransfer.setData("text/card-id", cardId);
    e.dataTransfer.setData("text/source-list-id", listId);
    setActiveDragCardId(cardId);
  };

  const handleCardEnd = () => {
    setActiveDragCardId(null);
    setDragOverCardId(null);
    setDragOverListId(null);
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    if (!activeDragCardId || activeDragCardId === cardId) return;

    // Tìm index của card đang kéo và card đích trong mảng cards
    const sourceIdx = cards.findIndex((c) => c.id === activeDragCardId);
    const targetIdx = cards.findIndex((c) => c.id === cardId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const sourceCard = cards[sourceIdx];
    const targetCard = cards[targetIdx];

    // Sắp xếp lại danh sách cards cục bộ ngay lập tức
    if (sourceCard.list_id !== targetCard.list_id || sourceIdx !== targetIdx) {
      const updatedCards = [...cards];
      const [draggedCard] = updatedCards.splice(sourceIdx, 1);
      
      // Cập nhật list_id mới cho card đang kéo
      draggedCard.list_id = targetCard.list_id;

      // Tìm lại vị trí chèn đích mới trong mảng đã bị splice
      const newTargetIdx = updatedCards.findIndex((c) => c.id === cardId);
      if (newTargetIdx !== -1) {
        updatedCards.splice(newTargetIdx, 0, draggedCard);
      } else {
        updatedCards.splice(targetIdx, 0, draggedCard);
      }

      setCards(updatedCards);
    }
  };

  const handleCardDragLeave = () => {
    setDragOverCardId(null);
  };

  // Helper để đồng bộ thứ tự cards trong DB
  const saveCardsOrder = async (listId: string) => {
    const listCards = cards.filter((c) => c.list_id === listId);
    try {
      const promises = listCards.map((c, index) => {
        const newPos = index + 1;
        c.position = newPos;
        return supabase
          .from("cards")
          .update({ list_id: listId, position: newPos })
          .eq("id", c.id);
      });
      await Promise.all(promises);
    } catch (err) {
      console.error("Lỗi cập nhật thứ tự cards:", err);
      await fetchBoardData();
    }
  };

  const handleCardDropOnList = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setDragOverListId(null);
    const cardId = e.dataTransfer.getData("text/card-id") || activeDragCardId;
    if (!cardId) return;

    // Tìm card để xem source_list_id trước đó
    const card = cards.find((c) => c.id === cardId);
    const sourceListId = card?.list_id;

    await saveCardsOrder(targetListId);
    if (sourceListId && sourceListId !== targetListId) {
      await saveCardsOrder(sourceListId);
    }
    setActiveDragCardId(null);
  };

  const handleCardDropOnCard = async (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    const cardId = e.dataTransfer.getData("text/card-id") || activeDragCardId;
    if (!cardId) return;

    const sourceCard = cards.find((c) => c.id === cardId);
    const targetCard = cards.find((c) => c.id === targetCardId);
    if (!sourceCard || !targetCard) return;

    const sourceListId = sourceCard.list_id;
    const targetListId = targetCard.list_id;

    await saveCardsOrder(targetListId);
    if (sourceListId && sourceListId !== targetListId) {
      await saveCardsOrder(sourceListId);
    }
    setActiveDragCardId(null);
  };

  if (loadingWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
        <p className="text-slate-500 text-xs font-semibold mt-4">Đang tải không gian làm việc...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-tr from-[#bae6fd] via-[#c7d2fe] to-[#e0e7ff] p-6 flex flex-col gap-6 text-slate-800 relative overflow-hidden">
      {/* Background glowing pastel circles */}
      <div className="absolute top-[10%] left-[10%] h-[350px] w-[350px] rounded-full bg-violet-300/20 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] h-[350px] w-[350px] rounded-full bg-pink-300/20 blur-[80px] pointer-events-none"></div>

      {/* Header Board */}
      <div className="flex items-center justify-between border-b border-slate-300/50 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-600/10">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h1 className="text-[10px] font-bold tracking-wider text-violet-700 uppercase leading-none">Workspace</h1>
            <h2 className="text-base font-bold text-slate-800 select-none mt-1 leading-none">{boardTitle || "Bảng công việc"}</h2>
          </div>
        </div>
        <div className="text-xs font-bold text-violet-700 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full select-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          ✨ HTPhongNAThy
        </div>
      </div>

      {/* Board Columns Area */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-start select-none pt-1">
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
              onDragEndList={handleListEnd}
              onDragOverList={handleListDragOver}
              onDropList={handleListDrop}
              onDragStartCard={handleCardDragStart}
              onDragEndCard={handleCardEnd}
              onCardDropOnList={handleCardDropOnList}
              onCardDropOnCard={handleCardDropOnCard}
              onCardClick={(cardId) => handleCardClick(cardId, list.title)}
              // Enhanced drag states & handlers
              activeDragCardId={activeDragCardId}
              activeDragListId={activeDragListId}
              dragOverListId={dragOverListId}
              dragOverCardId={dragOverCardId}
              onDragLeaveList={handleListDragLeave}
              onDragOverCard={handleCardDragOver}
              onDragLeaveCard={handleCardDragLeave}
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

      {/* Hộp thoại chi tiết thẻ */}
      {selectedCardId && mounted && createPortal(
        <CardDetailModal
          cardId={selectedCardId}
          listTitle={selectedListTitle}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={fetchBoardData}
        />,
        document.body
      )}
    </div>
  );
}
