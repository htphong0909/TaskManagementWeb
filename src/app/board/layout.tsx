"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import BoardSwitcher from "@/components/BoardSwitcher";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const boardId = pathname.split("/board/")[1];

  useEffect(() => {
    const saved = localStorage.getItem("board_sidebar_open");
    if (saved !== null) {
      const isOpen = saved === "true";
      const timer = setTimeout(() => {
        setIsSidebarOpen(isOpen);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (authLoading || !user) {
    return (
      <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] min-h-screen w-full flex items-center justify-center text-slate-800">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] h-screen w-full flex overflow-hidden text-slate-800 relative select-none">
      {/* Background Blobs */}
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/20 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/20 blur-[80px] pointer-events-none"></div>

      {/* Left Collapsible Sidebar */}
      <div 
        className={`h-full shrink-0 z-30 transition-all duration-300 ease-in-out border-r border-slate-200/50 bg-white/20 backdrop-blur-md flex flex-col relative ${
          isSidebarOpen ? "w-64" : "w-0 overflow-hidden border-none"
        }`}
      >
        {isSidebarOpen && (
          <BoardSwitcher
            activeBoardId={boardId}
            userEmail={user.email}
            onSignOut={handleSignOut}
            onBoardDeleted={() => router.push("/")}
            onToggleSidebar={() => {
              setIsSidebarOpen(false);
              localStorage.setItem("board_sidebar_open", "false");
            }}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden relative z-10 flex flex-col">
        {/* Top-Left Toggle Button (floating when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => {
              setIsSidebarOpen(true);
              localStorage.setItem("board_sidebar_open", "true");
            }}
            className="absolute top-4 left-4 z-40 p-2 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/60 hover:bg-white hover:scale-105 transition duration-150 shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            title="Mở menu bảng"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Children Viewport */}
        <div className={`flex-1 w-full overflow-hidden transition-all duration-300 ${!isSidebarOpen ? "pt-12 pl-14" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
