import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  title: string;
}

interface BoardSwitcherProps {
  activeBoardId: string;
  userEmail: string | undefined;
  onSignOut: () => void;
}

export default function BoardSwitcher({ activeBoardId, userEmail, onSignOut }: BoardSwitcherProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const router = useRouter();

  const fetchBoards = useCallback(async () => {
    const { data } = await supabase
      .from("boards")
      .select("id, title")
      .order("created_at", { ascending: true });
    setBoards(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBoards();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchBoards]);

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newBoard } = await supabase
      .from("boards")
      .insert([{ title: newBoardTitle.trim(), user_id: user.id }])
      .select("id")
      .single();

    if (newBoard) {
      setNewBoardTitle("");
      setShowAddModal(false);
      await fetchBoards();
      router.push(`/board/${newBoard.id}`);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-between px-6 bg-white/40 backdrop-blur-md border-t border-white/30 text-slate-700 select-none">
      {/* Cánh trái: Excel Sheet-like tabs */}
      <div className="flex items-end h-full gap-1 pt-2">
        {boards.map((b) => {
          const isActive = b.id === activeBoardId;
          return (
            <button
              key={b.id}
              onClick={() => router.push(`/board/${b.id}`)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-white/80 border-t border-x border-slate-200/60 text-violet-600 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] h-[90%]"
                  : "bg-white/30 border-t border-x border-transparent text-slate-500 hover:bg-white/50 h-[80%]"
              }`}
            >
              {b.title}
            </button>
          );
        })}
        
        {/* Nút cộng thêm Board mới */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 mb-1 text-xs font-bold rounded-lg bg-white/50 border border-slate-200/50 hover:bg-white/80 transition cursor-pointer text-slate-600 flex items-center justify-center"
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
      {showAddModal && (
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
        </div>
      )}
    </div>
  );
}
