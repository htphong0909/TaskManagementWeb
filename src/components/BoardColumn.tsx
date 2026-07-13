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
  const isDraggingList = activeDragListId === list.id;
  const isAddingCard = list.id === addingCardListId;

  return (
    <div
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
      className={`min-w-72 max-w-72 rounded-2xl flex flex-col h-full relative transition-all duration-300
        ${isDraggingList 
          ? "opacity-30 scale-95 border-dashed border-violet-400 bg-violet-50/20" 
          : "bg-slate-100/70 border border-slate-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
        }
        ${dragOverListId === list.id && activeDragListId !== list.id && activeDragCardId === null
          ? "ring-2 ring-violet-500/50 ring-offset-2 bg-slate-200/80 scale-[1.01]" 
          : ""
        }
      `}
    >
      {/* Khung tiêu đề cột */}
      <div 
        draggable
        onDragStart={(e) => onDragStartList(e, list.id)}
        onDragEnd={onDragEndList}
        className="flex items-center justify-between p-4 cursor-grab active:cursor-grabbing border-b border-slate-200/50 bg-white/50 backdrop-blur-sm rounded-t-2xl select-none"
      >
        {editingListId === list.id ? (
          <input
            type="text"
            value={editListTitle}
            onChange={(e) => setEditListTitle(e.target.value)}
            onBlur={() => handleRenameListSubmit(list.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameListSubmit(list.id);
              if (e.key === "Escape") setEditingListId(null);
            }}
            className="w-full rounded-lg border border-violet-400 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-violet-200/40"
            autoFocus
          />
        ) : (
          <>
            <h3 
              onDoubleClick={() => [setEditingListId(list.id), setEditListTitle(list.title)]}
              className="text-xs font-bold text-slate-800 line-clamp-2 break-words max-w-[200px]"
            >
              {list.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-md min-w-4 text-center">
                {listCards.length}
              </span>
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
      <div 
        className="space-y-3 flex-1 overflow-y-auto mb-3 pr-1 min-h-[50px] pt-1"
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
