import React from "react";
import BoardCard from "./BoardCard";

interface List {
  id: string;
  title: string;
  position: number;
  description?: string | null;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
  is_completed?: boolean;
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
  editingListDescId: string | null;
  setEditingListDescId: (id: string | null) => void;
  editListDesc: string;
  setEditListDesc: (desc: string) => void;
  handleRenameListDescSubmit: (id: string) => void;
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
  onDragEndList: (e: React.DragEvent) => void;
  onDragOverList: (e: React.DragEvent, listId: string) => void;
  onDropList: (e: React.DragEvent, targetListId: string) => void;
  onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
  onDragEndCard: (e: React.DragEvent) => void;
  onCardDropOnList: (e: React.DragEvent, targetListId: string) => void;
  onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
  // Enhanced drag states & handlers
  activeDragCardId: string | null;
  activeDragListId: string | null;
  dragOverListId: string | null;
  dragOverCardId: string | null;
  onDragLeaveList: (e: React.DragEvent) => void;
  onDragOverCard: (e: React.DragEvent, cardId: string) => void;
  onDragLeaveCard: (e: React.DragEvent) => void;
  onCardClick: (cardId: string) => void;
  onCardDragOverListContainer: (e: React.DragEvent, listId: string) => void;
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
  editingListDescId,
  setEditingListDescId,
  editListDesc,
  setEditListDesc,
  handleRenameListDescSubmit,
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
  onDragEndList,
  onDragOverList,
  onDropList,
  onDragStartCard,
  onDragEndCard,
  onCardDropOnList,
  onCardDropOnCard,
  activeDragCardId,
  activeDragListId,
  dragOverListId,
  dragOverCardId,
  onDragLeaveList,
  onDragOverCard,
  onDragLeaveCard,
  onCardClick,
  onCardDragOverListContainer,
}: BoardColumnProps) {
  const isEditingList = list.id === editingListId;
  const isAddingCard = list.id === addingCardListId;

  const isDraggingList = list.id === activeDragListId;
  const isDragOverList = list.id === dragOverListId && activeDragCardId !== null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartList(e, list.id)}
      onDragEnd={onDragEndList}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverList(e, list.id);
      }}
      onDragLeave={onDragLeaveList}
      onDrop={(e) => {
        // Nếu đối tượng được kéo là card, cho phép drop vào danh sách này
        if (e.dataTransfer.types.includes("text/card-id")) {
          onCardDropOnList(e, list.id);
        } else {
          onDropList(e, list.id);
        }
      }}
      className={`backdrop-blur-md border rounded-2xl p-4 flex flex-col min-w-72 max-w-72 max-h-full shrink-0 transition-all duration-200
        ${isDraggingList 
          ? "opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]" 
          : "bg-white/80 border-slate-300 shadow-sm"
        }
        ${isDragOverList ? "ring-2 ring-violet-400 ring-offset-2 shadow-md bg-white/90" : ""}
      `}
    >
      {/* Header cột */}
      <div className="flex flex-col mb-3 group">
        <div className="flex items-center justify-between w-full">
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
                onDoubleClick={() => [setEditingListId(list.id), setEditListTitle(list.title)]}
                className="text-sm font-bold text-slate-800 cursor-pointer select-none line-clamp-2 break-words flex-1 text-left"
                title="Double click để sửa tên cột"
              >
                {list.title}
              </span>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
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

        {/* Subtitle / Description cột */}
        <div className="w-full mt-1 min-h-[16px]">
          {list.id === editingListDescId ? (
            <input
              type="text"
              value={editListDesc}
              onChange={(e) => setEditListDesc(e.target.value)}
              onBlur={() => handleRenameListDescSubmit(list.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameListDescSubmit(list.id);
                if (e.key === "Escape") setEditingListDescId(null);
              }}
              className="bg-white border border-violet-400 outline-none text-[11px] font-normal text-slate-600 rounded-lg px-2 py-0.5 w-full block text-left"
              autoFocus
              placeholder="Nhập mô tả cột..."
            />
          ) : (
            <span
              onDoubleClick={() => [setEditingListDescId(list.id), setEditListDesc(list.description || "")]}
              className={`text-[11px] leading-relaxed font-normal text-left break-words block w-full select-none cursor-pointer ${
                list.description ? "text-slate-500/80" : "text-slate-400/40 italic hover:text-slate-400/80"
              }`}
              title="Double click để sửa mô tả cột"
            >
              {list.description || "+ Thêm mô tả..."}
            </span>
          )}
        </div>
      </div>

      {/* Danh sách các Cards */}
      <div 
        className="space-y-3 flex-1 overflow-y-auto mb-3 pr-1 min-h-[100px] pt-1 pb-20"
        onDragOver={(e) => {
          e.preventDefault();
          onCardDragOverListContainer(e, list.id);
        }}
      >
        {listCards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            isEditingCard={card.id === editingCardId}
            editCardTitle={editCardTitle}
            setEditCardTitle={setEditCardTitle}
            setEditingCardId={setEditingCardId}
            handleRenameCardSubmit={handleRenameCardSubmit}
            setCardToDelete={setCardToDelete}
            handleCardMouseEnter={handleCardMouseEnter}
            handleCardMouseLeave={handleCardMouseLeave}
            onDragStartCard={onDragStartCard}
            onDragEndCard={onDragEndCard}
            onCardDropOnCard={onCardDropOnCard}
            activeDragCardId={activeDragCardId}
            dragOverCardId={dragOverCardId}
            onDragOverCard={onDragOverCard}
            onDragLeaveCard={onDragLeaveCard}
            onCardClick={onCardClick}
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
