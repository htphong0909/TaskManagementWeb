"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import CardPopover from "@/components/CardPopover";

interface List {
  id: string;
  title: string;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  content: string | null;
}

export default function BoardDetailPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Popover state
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);

  const params = useParams();
  const boardId = params?.id as string;

  const fetchBoardData = useCallback(async () => {
    setIsFetching(true);
    try {
      // 1. Tải danh sách Lists
      const { data: listData } = await supabase
        .from("lists")
        .select("id, title")
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      const currentLists = listData || [];
      setLists(currentLists);

      // 2. Tải tất cả Cards cho các lists
      if (currentLists.length > 0) {
        const listIds = currentLists.map((l) => l.id);
        const { data: cardData } = await supabase
          .from("cards")
          .select("id, list_id, title, content")
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

  // Tải dữ liệu lists và cards khi có boardId
  useEffect(() => {
    if (boardId) {
      const timer = setTimeout(() => {
        fetchBoardData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [boardId, fetchBoardData]);

  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard(card);
    setHoveredRect(rect);
  };

  const handleCardMouseLeave = () => {
    setHoveredCard(null);
    setHoveredRect(null);
  };

  if (loadingWorkspace && !isFetching) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Top progress bar when switching boards */}
      {isFetching && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse z-50"></div>
      )}

      {/* Main Workspace (Kanban Area) */}
      <div className="h-full w-full overflow-x-auto p-6 flex items-start gap-6">
        <div className={`h-full flex items-start gap-6 transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
          {lists.map((list) => {
            const listCards = cards.filter((c) => c.list_id === list.id);
            return (
              <div
                key={list.id}
                className="min-w-[250px] w-[20vw] flex-shrink-0 bg-white/50 backdrop-blur-lg border border-white/30 shadow-sm rounded-2xl p-4 flex flex-col max-h-full overflow-y-auto"
              >
                <h3 className="text-sm font-bold text-slate-700 mb-3 px-1">{list.title}</h3>
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {listCards.map((card) => (
                    <div
                      key={card.id}
                      onMouseEnter={(e) => handleCardMouseEnter(card, e)}
                      onMouseLeave={handleCardMouseLeave}
                      className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] rounded-xl p-3 text-xs font-medium text-slate-700 cursor-pointer transition duration-150 hover:scale-[1.01] hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 truncate"
                    >
                      {card.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {lists.length === 0 && (
            <div className="h-full w-full flex items-center justify-center flex-col text-slate-500 text-xs gap-2">
              <span>Không gian làm việc chưa được thiết lập.</span>
              <span>Hãy thêm danh sách cột để bắt đầu!</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Card Popover */}
      {hoveredCard && hoveredRect && (
        <CardPopover
          title={hoveredCard.title}
          content={hoveredCard.content}
          rect={hoveredRect}
          onClose={() => setHoveredCard(null)}
        />
      )}
    </div>
  );
}
