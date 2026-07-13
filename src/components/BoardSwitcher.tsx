import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  title: string;
  position?: number;
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
  const [mounted, setMounted] = useState(false);

  // Kéo thả board state
  const [activeDragBoardId, setActiveDragBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  
  const router = useRouter();

  const fetchBoards = useCallback(async () => {
    const { data } = await supabase
      .from("boards")
      .select("id, title, position")
      .order("position", { ascending: true });
    setBoards(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      fetchBoards();
    }, 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, [fetchBoards]);

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Tìm position lớn nhất hiện tại
    const maxPos = boards.reduce((max, b) => ((b.position || 0) > max ? (b.position || 0) : max), 0);
    const nextPos = maxPos > 0 ? maxPos + 1000 : 1000;

    const { data: newBoard } = await supabase
      .from("boards")
      .insert([{ title: newBoardTitle.trim(), user_id: user.id, position: nextPos }])
      .select("id")
      .single();

    if (newBoard) {
      setNewBoardTitle("");
      setShowAddModal(false);
      await fetchBoards();
      router.push(`/board/${newBoard.id}`);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, boardId: string) => {
    e.dataTransfer.setData("text/board-id", boardId);
    setActiveDragBoardId(boardId);
  };

  const handleDragEnd = () => {
    setActiveDragBoardId(null);
    setDragOverBoardId(null);
  };

  const handleDragOver = (e: React.DragEvent, boardId: string) => {
    e.preventDefault();
    if (activeDragBoardId !== boardId) {
      setDragOverBoardId(boardId);
    }
  };

  const handleDragLeave = () => {
    setDragOverBoardId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetBoardId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/board-id") || activeDragBoardId;
    if (!draggedId || draggedId === targetBoardId) return;

    const draggedIndex = boards.findIndex((b) => b.id === draggedId);
    const targetIndex = boards.findIndex((b) => b.id === targetBoardId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedBoards = [...boards];
    const [draggedBoard] = updatedBoards.splice(draggedIndex, 1);
    updatedBoards.splice(targetIndex, 0, draggedBoard);

    let newPosition: number;
    if (targetIndex === 0) {
      newPosition = (updatedBoards[1]?.position || 1000) / 2;
    } else if (targetIndex === updatedBoards.length - 1) {
      newPosition = (updatedBoards[updatedBoards.length - 2]?.position || 0) + 1000;
    } else {
      const prevPos = updatedBoards[targetIndex - 1]?.position || 0;
      const nextPos = updatedBoards[targetIndex + 1]?.position || 0;
      newPosition = (prevPos + nextPos) / 2;
    }

    draggedBoard.position = newPosition;
    setBoards(updatedBoards);

    const { error } = await supabase
      .from("boards")
      .update({ position: newPosition })
      .eq("id", draggedId);

    if (error) {
      console.error("Lỗi cập nhật thứ tự board:", error);
      fetchBoards();
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
          const isDraggingBoard = b.id === activeDragBoardId;
          const isDragOverBoard = b.id === dragOverBoardId;

          return (
            <div
              key={b.id}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, b.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, b.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, b.id)}
              className={`group flex items-center px-4 py-2 text-xs font-semibold rounded-t-xl transition-all duration-150 relative ${
                isActive
                  ? "bg-white/80 border-t border-x border-slate-200/60 text-violet-600 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] h-[90%]"
                  : "bg-white/30 border-t border-x border-transparent text-slate-500 hover:bg-white/50 h-[80%] cursor-pointer"
              } ${
                isDraggingBoard 
                  ? "opacity-30 scale-90 border-dashed border-violet-400 bg-violet-50/20" 
                  : ""
              } ${
                isDragOverBoard 
                  ? "ring-2 ring-violet-500/50 ring-offset-1 bg-white/70" 
                  : ""
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
      {showAddModal && mounted && createPortal(
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
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {boardToDelete && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Xóa bảng công việc?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa bảng <strong className="text-slate-700">&quot;{boardToDelete.title}&quot;</strong>? Tất cả các cột danh sách và thẻ công việc bên trong sẽ bị xóa vĩnh viễn và không thể khôi phục.
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
        </div>,
        document.body
      )}
    </div>
  );
}
