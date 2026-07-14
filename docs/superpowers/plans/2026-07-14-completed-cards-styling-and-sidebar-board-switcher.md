# Board Switcher Sidebar and Completed Cards Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Style completed cards with a subtle green border/badge, convert the board switcher to a collapsible vertical left sidebar, fix layout shifting on open/close, and implement space-saving morphing toggles.

**Architecture:** We will update `layout.tsx` to listen for custom events, toggle `isSidebarOpen` state, and dispatch sync events. `BoardSwitcher.tsx` will use its top-left workspace icon ("T") as a close trigger (morphing on hover). `page.tsx` will listen to sync events and morph its workspace/board title icon into a toggle trigger.

**Tech Stack:** React, Next.js (App Router), Tailwind CSS.

## Global Constraints
- Opening or closing the sidebar must NOT cause vertical layout shifts.
- Persist toggle state using `localStorage` under `board_sidebar_open`.
- Ensure all code changes are complete, fully typed, and verified with tests and lint check.

---

### Task 1: Complete Cards Visual Highlights (Completed)
This task is completed and verified.

---

### Task 2: Layout Updates with Zero Vertical Shift

**Files:**
- Modify: `src/app/board/layout.tsx`

**Interfaces:**
- Consumes: `children` views
- Produces: Flex dashboard layout without vertical offsets. Listens for window event `toggle-board-sidebar` to toggle expansion state, and dispatches `board-sidebar-state-change` to sync page components.

- [ ] **Step 1: Implement clean layout wrapper and event handlers in layout.tsx**
  Update [layout.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/layout.tsx) with the following structure:
  ```tsx
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
      const handleToggle = () => {
        setIsSidebarOpen((prev) => {
          const next = !prev;
          localStorage.setItem("board_sidebar_open", next ? "true" : "false");
          window.dispatchEvent(new Event("board-sidebar-state-change"));
          return next;
        });
      };
      window.addEventListener("toggle-board-sidebar", handleToggle);
      return () => window.removeEventListener("toggle-board-sidebar", handleToggle);
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
                window.dispatchEvent(new Event("board-sidebar-state-change"));
              }}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 h-full overflow-hidden relative z-10 flex flex-col">
          {/* Children Viewport - Strict flex sizing, no padding shift */}
          <div className="flex-1 w-full overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Run linter and tests**
  Run: `npm run lint; npm run test`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/board/layout.tsx
  git commit -m "feat: align sidebar layout wrapper with zero vertical shift and global state triggers"
  ```

---

### Task 3: Redesign BoardSwitcher to Vertical Sidebar with Logo Close Button

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`

**Interfaces:**
- Consumes: `onToggleSidebar: () => void` via `BoardSwitcherProps`.
- Produces: Sidebar list rendering where the "T" logo morphs into a close button.

- [ ] **Step 1: Implement BoardSwitcher header and footer changes**
  Modify [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx) to remove the right collapse button and turn the "T" square icon into the toggle collapse icon.
  Replace lines 193 to the end of the file with:
  ```tsx
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
  ```

- [ ] **Step 2: Run linter and tests**
  Run: `npm run lint; npm run test`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/BoardSwitcher.tsx
  git commit -m "feat: turn sidebar header logo into a morphing collapse button"
  ```

---

### Task 4: Integrate Workspace Header Toggle inside Workspace Page

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

**Interfaces:**
- Consumes: Window event `board-sidebar-state-change`
- Produces: Clicking the document/hamburger icon dispatches `toggle-board-sidebar` to layout shell.

- [ ] **Step 1: Implement state syncer and button toggle markup in page.tsx**
  Edit [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/[id]/page.tsx):
  Add state and sync hook at the start of the component (e.g. line 68):
  ```tsx
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
      const saved = localStorage.getItem("board_sidebar_open");
      if (saved !== null) {
        setIsSidebarOpen(saved === "true");
      }
      
      const handleSync = () => {
        const current = localStorage.getItem("board_sidebar_open");
        setIsSidebarOpen(current === "true");
      };
      
      window.addEventListener("board-sidebar-state-change", handleSync);
      return () => window.removeEventListener("board-sidebar-state-change", handleSync);
    }, []);
  ```
  Locate the board title header markup (lines 565-569).
  Replace this part:
  ```tsx
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-violet-600/10">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
  ```
  With this morphing toggle button block:
  ```tsx
            <button
              onClick={() => window.dispatchEvent(new Event("toggle-board-sidebar"))}
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition duration-150 shadow-md shadow-violet-600/10 cursor-pointer group shrink-0 ${
                !isSidebarOpen ? "animate-pulse" : ""
              }`}
              title={isSidebarOpen ? "Đóng menu bảng" : "Mở menu bảng"}
            >
              {isSidebarOpen ? (
                <>
                  <svg className="h-5 w-5 text-white block group-hover:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <svg className="h-5 w-5 text-white hidden group-hover:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
  ```

- [ ] **Step 2: Run linter and tests**
  Run: `npm run lint; npm run test`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/board/[id]/page.tsx
  git commit -m "feat: integrate space-saving morphing toggle inside workspace header"
  ```

---

### Task 5: Walkthrough and Verification

- [ ] **Step 1: Build the app to verify compiler configuration**
  Run: `npm run build`
  Expected: BUILD SUCCESS (indicates no Next.js build errors)

- [ ] **Step 2: Create Walkthrough documentation**
  Create `docs/superpowers/plans/2026-07-14-completed-cards-styling-and-sidebar-board-switcher-walkthrough.md` (overwrite existing).

- [ ] **Step 3: Commit and end task**
  ```bash
  git add docs/superpowers/plans/2026-07-14-completed-cards-styling-and-sidebar-board-switcher-walkthrough.md
  git commit -m "docs: add final completed tasks and vertical sidebar implementation walkthrough"
  ```
