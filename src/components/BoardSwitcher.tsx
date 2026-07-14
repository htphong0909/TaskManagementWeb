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
  onToggleSidebar: () => void;
}

export default function BoardSwitcher({
  activeBoardId,
  userEmail,
  onSignOut,
  onBoardDeleted,
  onBoardRenamed,
  onToggleSidebar
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
  const [mouseDownCoords, setMouseDownCoords] = useState<{ x: number; y: number } | null>(null);
  
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
    if (!activeDragBoardId || activeDragBoardId === boardId) return;

    const draggedIndex = boards.findIndex((b) => b.id === activeDragBoardId);
    const targetIndex = boards.findIndex((b) => b.id === boardId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedBoards = [...boards];
    const [draggedBoard] = updatedBoards.splice(draggedIndex, 1);
    updatedBoards.splice(targetIndex, 0, draggedBoard);
    setBoards(updatedBoards);
  };

  const handleDragLeave = () => {
    setDragOverBoardId(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/board-id") || activeDragBoardId;
    if (!draggedId) return;

    const targetIndex = boards.findIndex((b) => b.id === draggedId);
    if (targetIndex === -1) return;

    let newPosition: number;
    if (targetIndex === 0) {
      newPosition = (boards[1]?.position || 1000) / 2;
    } else if (targetIndex === boards.length - 1) {
      newPosition = (boards[boards.length - 2]?.position || 0) + 1000;
    } else {
      const prevPos = boards[targetIndex - 1]?.position || 0;
      const nextPos = boards[targetIndex + 1]?.position || 0;
      newPosition = (prevPos + nextPos) / 2;
    }

    const updatedBoards = boards.map((b) => (b.id === draggedId ? { ...b, position: newPosition } : b));
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
    <div className="h-full w-full flex flex-col justify-between p-4 text-slate-700 select-none">
      {/* Header Branding & Collapse button */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-500/10">
              T
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              TaskApp Workspace
            </span>
          </div>
          
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Đóng sidebar"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
          Danh sách bảng
        </div>

        {/* Vertical Scrollable Boards list */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
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
                onDrop={(e) => handleDrop(e)}
                onMouseDown={(e) => setMouseDownCoords({ x: e.clientX, y: e.clientY })}
                className={`group flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 relative ${
                  isActive
                    ? "bg-violet-500/10 text-violet-600 border border-violet-500/20 shadow-[0_2px_8px_rgba(139,92,246,0.03)]"
                    : "text-slate-600 hover:bg-white/40 hover:text-slate-800"
                } ${
                  isDraggingBoard 
                    ? "opacity-30 scale-95 border-dashed border-violet-400 bg-violet-50/20" 
                    : ""
                } ${
                  isDragOverBoard 
                    ? "ring-2 ring-violet-500/50 ring-offset-1 bg-white/70" 
                    : ""
                }`}
                onDoubleClick={() => isActive && handleStartRename(b)}
                onClick={(e) => {
                  if (mouseDownCoords) {
                    const dist = Math.sqrt(
                      Math.pow(e.clientX - mouseDownCoords.x, 2) + Math.pow(e.clientY - mouseDownCoords.y, 2)
                    );
                    if (dist > 5) return;
                  }
                  if (!isActive && !isEditing) router.push(`/board/${b.id}`);
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  {/* Folder icon */}
                  <svg className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>

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
                      className="bg-transparent border-b border-violet-500 outline-none text-violet-600 font-bold px-0.5 w-full text-xs"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate flex-1" title={b.title}>
                      {b.title}
                    </span>
                  )}
                </div>

                {/* Delete Board Button */}
                {isActive && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBoardToDelete(b);
                    }}
                    className="hidden group-hover:flex h-4.5 w-4.5 items-center justify-center rounded-lg hover:bg-rose-50 text-rose-500 transition cursor-pointer shrink-0 ml-2"
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

          {/* Inline Add Board button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white/40 border border-slate-200/50 hover:bg-white/70 transition cursor-pointer text-slate-500 hover:text-slate-700 flex items-center gap-2 justify-center"
          >
            <span>+ Tạo bảng mới</span>
          </button>
        </div>
      </div>

      {/* Footer Section: User profile and logout */}
      <div className="pt-4 border-t border-slate-200/50 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2">
          <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase shadow-inner">
            {userEmail ? userEmail[0] : "?"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] text-slate-400 font-medium leading-none">Tài khoản</span>
            <span className="text-xs text-slate-600 font-semibold truncate max-w-[170px] mt-0.5" title={userEmail}>
              {userEmail}
            </span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/40 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition cursor-pointer text-slate-600 font-semibold text-xs flex items-center gap-2 justify-center"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Đăng xuất</span>
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
