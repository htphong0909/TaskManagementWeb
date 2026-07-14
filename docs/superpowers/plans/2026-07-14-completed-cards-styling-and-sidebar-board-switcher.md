# Board Switcher Sidebar and Completed Cards Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Style completed cards with a subtle green border and dim completed label, and move the board switcher to a collapsible vertical sidebar on the left.

**Architecture:** We will update `BoardCard.tsx` to conditionalize styling on `card.is_completed`. We will adjust `layout.tsx` to handle collapsible left sidebar visibility using local storage persistence, and restructure `BoardSwitcher.tsx` to build a clean vertical, interactive sidebar instead of horizontal Excel-like tabs.

**Tech Stack:** React, Next.js (App Router), Tailwind CSS.

## Global Constraints
- Target layout must support persistent sidebar pushing workspace page content.
- State storage: Use `localStorage` key `board_sidebar_open` to save collapse/expand settings.
- Avoid using placeholders and implement all code logic cleanly.

---

### Task 1: Complete Cards Visual Highlights

**Files:**
- Modify: `src/components/BoardCard.tsx`
- Create: `src/__tests__/BoardCard.test.tsx`

**Interfaces:**
- Consumes: `Card` item with `is_completed?: boolean`
- Produces: Visual styled card with soft green borders and a smaller, dimmer "ĐÃ HOÀN THÀNH" label.

- [ ] **Step 1: Write the failing test**
  Create `src/__tests__/BoardCard.test.tsx` with:
  ```tsx
  import { expect, test, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import React from 'react';
  import BoardCard from '../components/BoardCard';

  const mockProps = {
    isEditingCard: false,
    editCardTitle: "",
    setEditCardTitle: vi.fn(),
    setEditingCardId: vi.fn(),
    handleRenameCardSubmit: vi.fn(),
    setCardToDelete: vi.fn(),
    handleCardMouseEnter: vi.fn(),
    handleCardMouseLeave: vi.fn(),
    onDragStartCard: vi.fn(),
    onDragEndCard: vi.fn(),
    onCardDropOnCard: vi.fn(),
    activeDragCardId: null,
    dragOverCardId: null,
    onDragOverCard: vi.fn(),
    onDragLeaveCard: vi.fn(),
    onCardClick: vi.fn(),
  };

  test('renders completed card with green borders and dim label styling', () => {
    const completedCard = {
      id: 'card-completed-1',
      list_id: 'list-1',
      title: 'Completed Task Title',
      content: null,
      position: 1,
      due_date: null,
      created_at: '2026-07-14T00:00:00.000Z',
      is_completed: true,
    };

    render(<BoardCard {...mockProps} card={completedCard} />);
    const badge = screen.getByText('ĐÃ HOÀN THÀNH');
    expect(badge).toBeDefined();
    
    // Check if the badge has softer, dimmer style classes (e.g. text-emerald-600/60)
    expect(badge.className).toContain('text-emerald-600/60');
    expect(badge.className).toContain('text-[8px]');
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test`
  Expected: FAIL (either `BoardCard.test.tsx` fails because the style classes are not yet matching or the file is missing styling)

- [ ] **Step 3: Modify implementation in BoardCard.tsx**
  Update the component in [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx) to adjust completed card styles.
  Modify the card wrapper class (lines 141-147) and the label class (lines 172-176):
  ```tsx
  // Replace around lines 141-147:
  className={`group/card bg-white border rounded-xl p-4 flex flex-col gap-2 relative cursor-pointer active:cursor-grabbing
    ${isDragging 
      ? "opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]" 
      : card.is_completed
        ? "border-emerald-500/30 bg-emerald-50/20 shadow-[0_2px_8px_rgba(16,185,129,0.02)] hover:border-emerald-500/50 hover:bg-emerald-50/30 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:-translate-y-0.5 transition-all duration-150"
        : "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 transition-all duration-150"
    }
    ${isDragOver ? "border-violet-400 bg-violet-50/20" : ""}
  `}
  ```
  And replace around lines 172-176:
  ```tsx
  {card.is_completed && (
    <span className="text-[8px] text-emerald-600/60 font-semibold bg-emerald-50/30 border border-emerald-100/30 px-1.5 py-0.5 rounded-full tracking-wider">
      ĐÃ HOÀN THÀNH
    </span>
  )}
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 5: Run linter**
  Run: `npm run lint`
  Expected: PASS (with no new warnings or errors)

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/BoardCard.tsx src/__tests__/BoardCard.test.tsx
  git commit -m "feat: design completed cards with green border and dimmer label"
  ```

---

### Task 2: Layout Updates with Sidebar Toggle State

**Files:**
- Modify: `src/app/board/layout.tsx`

**Interfaces:**
- Consumes: `children` views
- Produces: Flex dashboard layout with a collapsible sidebar and toggle triggers.

- [ ] **Step 1: Implement state and layout logic in layout.tsx**
  Update [layout.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/layout.tsx):
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
      // Check stored preference
      const saved = localStorage.getItem("board_sidebar_open");
      if (saved !== null) {
        setIsSidebarOpen(saved === "true");
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
              isSidebarOpen={isSidebarOpen}
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
  ```

- [ ] **Step 2: Run linter and tests**
  Run: `npm run lint; npm run test`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/board/layout.tsx
  git commit -m "feat: add sidebar state management and collapsible shell layout"
  ```

---

### Task 3: Redesign BoardSwitcher to Vertical Layout

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`

**Interfaces:**
- Consumes: `isSidebarOpen: boolean`, `onToggleSidebar: () => void` via `BoardSwitcherProps`.
- Produces: Beautiful vertical navigation sidebar listing all boards, adding board controls, and user session details.

- [ ] **Step 1: Update BoardSwitcher.tsx interfaces and render return**
  Edit [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx):
  Update `BoardSwitcherProps`:
  ```tsx
  interface BoardSwitcherProps {
    activeBoardId: string;
    userEmail: string | undefined;
    onSignOut: () => void;
    onBoardDeleted?: () => void;
    onBoardRenamed?: () => void;
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
  }
  ```
  Modify the returned JSX from line 193 to end of the file. Layout it vertically as a Sidebar:
  ```tsx
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
  ```

- [ ] **Step 2: Run linter and tests**
  Run: `npm run lint; npm run test`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/BoardSwitcher.tsx
  git commit -m "feat: restructure board switcher into collapsible vertical sidebar layout"
  ```

---

### Task 4: Walkthrough and Verification

- [ ] **Step 1: Build the app to verify compiler configuration**
  Run: `npm run build`
  Expected: BUILD SUCCESS (indicates no Next.js build errors)

- [ ] **Step 2: Create Walkthrough documentation**
  Create `docs/superpowers/plans/2026-07-14-completed-cards-styling-and-sidebar-board-switcher-walkthrough.md` with:
  ```markdown
  # Walkthrough: Completed Cards Green Highlight & Sidebar Switcher

  Implemented the requested changes for completed tasks and moving the board switcher to a collapsible vertical left sidebar.

  - **BoardCard.tsx**: Refactored cards with green outline borders and a smaller, dimmer 'ĐÃ HOÀN THÀNH' indicator when completed. Added new unit tests verifying the correctness of classes.
  - **layout.tsx**: Positioned the switcher as a collapsible sidebar pushing layout content, including transitions, local storage persistence, and top-left floating toggles.
  - **BoardSwitcher.tsx**: Transformed list structure to list boards vertically with dashboard icons, profile info, and bottom actions.
  ```

- [ ] **Step 3: Commit and end task**
  ```bash
  git add docs/superpowers/plans/2026-07-14-completed-cards-styling-and-sidebar-board-switcher-walkthrough.md
  git commit -m "docs: add completed tasks and vertical sidebar implementation walkthrough"
  ```
