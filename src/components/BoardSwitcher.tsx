import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

interface Folder {
  id: string;
  title: string;
  position: number;
}

interface Board {
  id: string;
  title: string;
  position?: number;
  folder_id?: string | null;
  created_at?: string;
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderTitle, setEditFolderTitle] = useState("");
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [mounted, setMounted] = useState(false);

  // Kéo thả board state
  const [activeDragBoardId, setActiveDragBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverUngrouped, setDragOverUngrouped] = useState(false);
  const [mouseDownCoords, setMouseDownCoords] = useState<{ x: number; y: number } | null>(null);
  
  const router = useRouter();

  const fetchFoldersAndBoards = useCallback(async () => {
    // 1. Fetch folders
    const { data: folderData } = await supabase
      .from("folders")
      .select("id, title, position")
      .order("position", { ascending: true });
    setFolders(folderData || []);

    // 2. Fetch boards
    const { data: boardData } = await supabase
      .from("boards")
      .select("id, title, position, folder_id, created_at")
      .order("position", { ascending: true });
    setBoards(boardData || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      fetchFoldersAndBoards();
    }, 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, [fetchFoldersAndBoards]);

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
      await fetchFoldersAndBoards();
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
    setDragOverFolderId(null);
    setDragOverUngrouped(false);
  };

  const handleDragOver = (e: React.DragEvent, boardId: string) => {
    e.preventDefault();
    if (!activeDragBoardId || activeDragBoardId === boardId) return;

    const draggedBoard = boards.find((b) => b.id === activeDragBoardId);
    const targetBoard = boards.find((b) => b.id === boardId);
    if (!draggedBoard || !targetBoard) return;

    // Chỉ cho phép sắp xếp vị trí nếu ở cùng thư mục
    if (draggedBoard.folder_id !== targetBoard.folder_id) return;

    const draggedIndex = boards.findIndex((b) => b.id === activeDragBoardId);
    const targetIndex = boards.findIndex((b) => b.id === boardId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedBoards = [...boards];
    const [dragBoard] = updatedBoards.splice(draggedIndex, 1);
    updatedBoards.splice(targetIndex, 0, dragBoard);
    setBoards(updatedBoards);
  };

  const handleDragLeave = () => {
    setDragOverBoardId(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/board-id") || activeDragBoardId;
    
    // Reset dragging states immediately
    setActiveDragBoardId(null);
    setDragOverBoardId(null);

    if (!draggedId) return;

    const draggedBoard = boards.find((b) => b.id === draggedId);
    if (!draggedBoard) return;
    const folderId = draggedBoard.folder_id || null;

    // Lọc các board trong cùng thư mục
    const siblingBoards = boards.filter((b) => (b.folder_id || null) === folderId);
    const siblingIndex = siblingBoards.findIndex((b) => b.id === draggedId);
    if (siblingIndex === -1) return;

    let newPosition: number;
    if (siblingBoards.length === 1) {
      newPosition = 1000;
    } else if (siblingIndex === 0) {
      newPosition = (siblingBoards[1]?.position || 1000) / 2;
    } else if (siblingIndex === siblingBoards.length - 1) {
      newPosition = (siblingBoards[siblingBoards.length - 2]?.position || 0) + 1000;
    } else {
      const prevPos = siblingBoards[siblingIndex - 1]?.position || 0;
      const nextPos = siblingBoards[siblingIndex + 1]?.position || 0;
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
      fetchFoldersAndBoards();
    }
  };

  const handleDragOverFolderHeader = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (!activeDragBoardId) return;
    const draggedBoard = boards.find((b) => b.id === activeDragBoardId);
    if (draggedBoard && draggedBoard.folder_id !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleDropOnFolderHeader = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const draggedId = e.dataTransfer.getData("text/board-id") || activeDragBoardId;
    
    // Reset dragging states immediately
    setActiveDragBoardId(null);
    setDragOverBoardId(null);

    if (!draggedId) return;

    const draggedBoard = boards.find((b) => b.id === draggedId);
    if (!draggedBoard || draggedBoard.folder_id === folderId) return;

    // Tìm position lớn nhất trong thư mục mới
    const targetBoards = boards.filter((b) => b.folder_id === folderId);
    const maxPos = targetBoards.reduce((max, b) => ((b.position || 0) > max ? (b.position || 0) : max), 0);
    const nextPos = maxPos > 0 ? maxPos + 1000 : 1000;

    // Cập nhật local state trước để mượt
    setBoards((prev) =>
      prev.map((b) => (b.id === draggedId ? { ...b, folder_id: folderId, position: nextPos } : b))
    );

    const { error } = await supabase
      .from("boards")
      .update({ folder_id: folderId, position: nextPos })
      .eq("id", draggedId);

    if (error) {
      console.error("Lỗi chuyển board vào thư mục:", error);
    }
    await fetchFoldersAndBoards();
  };

  const handleDragOverUngrouped = (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeDragBoardId) return;
    const draggedBoard = boards.find((b) => b.id === activeDragBoardId);
    if (draggedBoard && draggedBoard.folder_id !== null) {
      setDragOverUngrouped(true);
    }
  };

  const handleDropOnUngrouped = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverUngrouped(false);
    const draggedId = e.dataTransfer.getData("text/board-id") || activeDragBoardId;
    
    // Reset dragging states immediately
    setActiveDragBoardId(null);
    setDragOverBoardId(null);

    if (!draggedId) return;

    const draggedBoard = boards.find((b) => b.id === draggedId);
    if (!draggedBoard || draggedBoard.folder_id === null) return;

    // Tìm position lớn nhất trong các bảng tự do
    const targetBoards = boards.filter((b) => b.folder_id === null || b.folder_id === undefined);
    const maxPos = targetBoards.reduce((max, b) => ((b.position || 0) > max ? (b.position || 0) : max), 0);
    const nextPos = maxPos > 0 ? maxPos + 1000 : 1000;

    // Cập nhật local state
    setBoards((prev) =>
      prev.map((b) => (b.id === draggedId ? { ...b, folder_id: null, position: nextPos } : b))
    );

    const { error } = await supabase
      .from("boards")
      .update({ folder_id: null, position: nextPos })
      .eq("id", draggedId);

    if (error) {
      console.error("Lỗi chuyển board ra khỏi thư mục:", error);
    }
    await fetchFoldersAndBoards();
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
      await fetchFoldersAndBoards();
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
      await fetchFoldersAndBoards();
      if (onBoardDeleted) {
        onBoardDeleted();
      } else {
        router.push("/");
      }
    }
  };

  // Load collapsed folder state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("collapsedFolderIds");
      if (stored) {
        setCollapsedFolderIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse collapsedFolderIds from localStorage", e);
    }
  }, []);

  // Toggle collapse state
  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const updated = prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId];
      localStorage.setItem("collapsedFolderIds", JSON.stringify(updated));
      return updated;
    });
  };

  // CRUD folders
  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxPos = folders.reduce((max, f) => (f.position > max ? f.position : max), 0);
    const nextPos = maxPos > 0 ? maxPos + 1000 : 1000;

    const { error } = await supabase
      .from("folders")
      .insert([{ title: newFolderTitle.trim(), user_id: user.id, position: nextPos }]);

    if (!error) {
      setNewFolderTitle("");
      setShowAddFolderModal(false);
      await fetchFoldersAndBoards();
    }
  };

  const handleStartRenameFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditFolderTitle(folder.title);
  };

  const handleRenameFolderSubmit = async (folderId: string) => {
    if (!editFolderTitle.trim()) {
      setEditingFolderId(null);
      return;
    }

    const { error } = await supabase
      .from("folders")
      .update({ title: editFolderTitle.trim() })
      .eq("id", folderId);

    if (!error) {
      setEditingFolderId(null);
      await fetchFoldersAndBoards();
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderToDelete.id);

    if (!error) {
      setFolderToDelete(null);
      await fetchFoldersAndBoards();
    }
  };

  const handleMoveFolder = async (folderId: string, direction: "up" | "down") => {
    const idx = folders.findIndex((f) => f.id === folderId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === folders.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentFolder = { ...folders[idx] };
    const targetFolder = { ...folders[targetIdx] };

    const tempPos = currentFolder.position;
    currentFolder.position = targetFolder.position;
    targetFolder.position = tempPos;

    // Swap locally for instant responsiveness
    const updatedFolders = [...folders];
    updatedFolders[idx] = targetFolder;
    updatedFolders[targetIdx] = currentFolder;
    setFolders(updatedFolders);

    // Save changes in Supabase database
    await Promise.all([
      supabase.from("folders").update({ position: currentFolder.position }).eq("id", currentFolder.id),
      supabase.from("folders").update({ position: targetFolder.position }).eq("id", targetFolder.id),
    ]);
    await fetchFoldersAndBoards();
  };

  const renderBoardItem = (b: Board) => {
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
        className={`group flex items-start justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 relative ${
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
        <div className="flex flex-col flex-1 min-w-0">
          {b.created_at && (
            <span className="text-[9px] text-slate-400 font-normal select-none -mt-1 mb-0.5 text-left">
              {new Date(b.created_at).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <div className="flex items-start gap-2 overflow-hidden flex-1 pt-0.5">
            {/* Board icon */}
            <svg className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-violet-500 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
              <span className="line-clamp-2 break-words flex-1 text-left" title={b.title}>
                {b.title}
              </span>
            )}
          </div>
        </div>

        {/* Delete Board Button */}
        {isActive && !isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBoardToDelete(b);
            }}
            className="hidden group-hover:flex h-4.5 w-4.5 items-center justify-center rounded-lg hover:bg-rose-50 text-rose-500 transition cursor-pointer shrink-0 ml-2 mt-0.5"
            title="Xóa bảng"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col justify-between p-4 text-slate-700 select-none">
      {/* Header Branding & Morphing toggle button */}
      <div>
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200/50 mb-4">
          <button
            onClick={onToggleSidebar}
            className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-500/10 cursor-pointer transition-colors duration-150 group shrink-0"
            title="Đóng sidebar"
          >
            <span className="block group-hover:hidden">T</span>
            <svg className="h-4 w-4 text-white hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
            TaskApp Workspace
          </span>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
          Danh sách bảng
        </div>

        {/* Vertical Scrollable Boards list */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
          {/* Loop over folders */}
          {folders.map((folder) => {
            const isFolderCollapsed = collapsedFolderIds.includes(folder.id);
            const isEditingFolder = folder.id === editingFolderId;
            const isDragOverFolder = folder.id === dragOverFolderId;
            const folderBoards = boards.filter((b) => b.folder_id === folder.id);

            return (
              <div
                key={folder.id}
                onDragOver={(e) => handleDragOverFolderHeader(e, folder.id)}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => handleDropOnFolderHeader(e, folder.id)}
                className={`flex flex-col gap-1 rounded-xl p-1 transition-all duration-150 ${
                  isDragOverFolder ? "bg-violet-500/10 ring-2 ring-violet-500/50 ring-inset" : "bg-transparent"
                }`}
              >
                {/* Folder Header */}
                <div
                  className="group flex items-start justify-between px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100/50 cursor-pointer"
                  onClick={() => toggleFolderCollapse(folder.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRenameFolder(folder);
                  }}
                >
                  <div className="flex items-start gap-1.5 overflow-hidden flex-1 pt-0.5">
                    {/* Expand/Collapse arrow */}
                    <span className="text-[9px] text-slate-400 shrink-0 mt-0.5">
                      {isFolderCollapsed ? "▶" : "▼"}
                    </span>
                    {/* Folder icon */}
                    <svg className="h-4.5 w-4.5 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    
                    {isEditingFolder ? (
                      <input
                        type="text"
                        value={editFolderTitle}
                        onChange={(e) => setEditFolderTitle(e.target.value)}
                        onBlur={() => handleRenameFolderSubmit(folder.id)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolderSubmit(folder.id);
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="bg-transparent border-b border-violet-500 outline-none text-slate-800 font-bold px-0.5 w-full text-xs"
                        autoFocus
                      />
                    ) : (
                      <span className="line-clamp-2 break-words flex-1" title={folder.title}>
                        {folder.title}
                      </span>
                    )}
                  </div>

                  {/* Move up / down & Delete folder buttons */}
                  {!isEditingFolder && (
                    <div className="hidden group-hover:flex items-start gap-1 shrink-0 ml-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleMoveFolder(folder.id, "up")}
                        className="h-4.5 w-4.5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Di chuyển lên"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveFolder(folder.id, "down")}
                        className="h-4.5 w-4.5 flex items-center justify-center rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Di chuyển xuống"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => setFolderToDelete(folder)}
                        className="h-4.5 w-4.5 flex items-center justify-center rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Xóa thư mục"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Folder Boards (if not collapsed) */}
                {!isFolderCollapsed && (
                  <div className="flex flex-col gap-1 pl-3.5 border-l border-slate-200/50 ml-3">
                    {folderBoards.length === 0 ? (
                      <div className="text-[10px] text-slate-400 italic py-1 pl-2">Thư mục trống (Kéo bảng vào đây)</div>
                    ) : (
                      folderBoards.map((b) => renderBoardItem(b))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Independent Boards Section */}
          <div
            onDragOver={handleDragOverUngrouped}
            onDragLeave={() => setDragOverUngrouped(false)}
            onDrop={handleDropOnUngrouped}
            className={`flex flex-col gap-1 rounded-xl p-1 transition-all duration-150 mt-2 border-t border-slate-200/40 pt-2 ${
              dragOverUngrouped ? "bg-violet-500/10 ring-2 ring-violet-500/50 ring-inset" : "bg-transparent"
            }`}
          >
            <div className="text-[10px] font-bold text-slate-400 px-2 mb-1">Bảng tự do</div>
            {boards.filter((b) => !b.folder_id).length === 0 ? (
              <div className="text-[10px] text-slate-400 italic py-1 px-2">Không có bảng tự do</div>
            ) : (
              boards.filter((b) => !b.folder_id).map((b) => renderBoardItem(b))
            )}
          </div>

          {/* Add buttons */}
          <div className="flex gap-1.5 mt-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 px-2 py-2 text-[11px] font-semibold rounded-xl bg-white/40 border border-slate-200/50 hover:bg-white/70 transition cursor-pointer text-slate-500 hover:text-slate-700 flex items-center gap-1.5 justify-center"
            >
              <span>+ Tạo bảng</span>
            </button>
            <button
              onClick={() => setShowAddFolderModal(true)}
              className="flex-1 px-2 py-2 text-[11px] font-semibold rounded-xl bg-white/40 border border-slate-200/50 hover:bg-white/70 transition cursor-pointer text-slate-500 hover:text-slate-700 flex items-center gap-1.5 justify-center"
            >
              <span>+ Tạo thư mục</span>
            </button>
          </div>
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

      {/* Quick Add Folder Modal */}
      {showAddFolderModal && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tạo thư mục mới</h3>
            <form onSubmit={handleAddFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderTitle}
                onChange={(e) => setNewFolderTitle(e.target.value)}
                placeholder="Tên thư mục (ví dụ: Dự án A...)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-200/40"
                required
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddFolderModal(false)}
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

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Xóa thư mục?</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa thư mục <strong className="text-slate-700">&quot;{folderToDelete.title}&quot;</strong>? 
              Các bảng bên trong thư mục này sẽ <strong className="text-slate-700">không bị xóa</strong> mà sẽ trở thành bảng tự do bên ngoài.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteFolder}
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
