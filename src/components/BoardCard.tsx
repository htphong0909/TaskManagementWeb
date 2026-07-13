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
  setEditingCardId: (id: string | null) => void;
  handleRenameCardSubmit: (id: string) => void;
  setCardToDelete: (card: Card) => void;
  handleCardMouseEnter: (card: Card, event: React.MouseEvent<HTMLDivElement>) => void;
  handleCardMouseLeave: () => void;
  onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
  onDragEndCard: (e: React.DragEvent) => void;
  onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
  activeDragCardId: string | null;
  dragOverCardId: string | null;
  onDragOverCard: (e: React.DragEvent, cardId: string) => void;
  onDragLeaveCard: (e: React.DragEvent) => void;
}

export default function BoardCard({
  card,
  isEditingCard,
  editCardTitle,
  setEditCardTitle,
  setEditingCardId,
  handleRenameCardSubmit,
  setCardToDelete,
  handleCardMouseEnter,
  handleCardMouseLeave,
  onDragStartCard,
  onDragEndCard,
  onCardDropOnCard,
  activeDragCardId,
  dragOverCardId,
  onDragOverCard,
  onDragLeaveCard,
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

  const isDragging = card.id === activeDragCardId;
  const isDragOver = card.id === dragOverCardId && activeDragCardId !== card.id;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStartCard(e, card.id, card.list_id);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        onDragEndCard(e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard(e, card.id);
      }}
      onDragLeave={onDragLeaveCard}
      onDrop={(e) => onCardDropOnCard(e, card.id)}
      onMouseEnter={(e) => handleCardMouseEnter(card, e)}
      onMouseLeave={handleCardMouseLeave}
      onDoubleClick={() => !isEditingCard && [setEditingCardId(card.id), setEditCardTitle(card.title)]}
      className={`group/card bg-white border rounded-xl p-4 flex flex-col gap-2 relative transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragging 
          ? "opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]" 
          : "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80"
        }
        ${isDragOver ? "border-violet-400 bg-violet-50/20" : ""}
      `}
    >
      {/* Đường chỉ thị vị trí thả không làm lệch Layout (Jitter-free indicator) */}
      {isDragOver && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500 rounded-t-xl pointer-events-none z-20" />
      )}
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
