"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import BoardSwitcher from "@/components/BoardSwitcher";

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const boardId = pathname.split("/board/")[1];

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
    <div className="bg-gradient-to-tr from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa] h-screen w-full flex flex-col overflow-hidden text-slate-800 relative select-none">
      {/* Background Blobs */}
      <div className="absolute top-[20%] left-[20%] h-[350px] w-[350px] rounded-full bg-violet-300/20 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-pink-300/20 blur-[80px] pointer-events-none"></div>

      {/* 1. Main Workspace Area */}
      <div className="h-[92%] w-full overflow-hidden relative z-10">
        {children}
      </div>

      {/* 2. Bottom Excel Switcher Bar */}
      <div className="h-[8%] w-full z-20">
        <BoardSwitcher
          activeBoardId={boardId}
          userEmail={user.email}
          onSignOut={handleSignOut}
          onBoardDeleted={() => router.push("/")}
        />
      </div>
    </div>
  );
}
