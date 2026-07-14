# Design Spec: Completed Cards Green Border & Sidebar Board Switcher

This specification details the UX improvements for styling completed cards and transforming the board switcher from a bottom bar to a collapsible left sidebar, featuring seamless transitions and integrated workspace toggles.

## Goal

1. **Completed Cards**: Make completed tasks less visually distracting. They should feature a subtle green border, and the "ĐÃ HOÀN THÀNH" label should be smaller and dimmer.
2. **Left Sidebar Switcher**: Relocate the Board Switcher from the bottom Excel-tab bar to a collapsible left sidebar.
3. **Space-Saving Toggles (No Layout Shifts)**: 
   - Integrate the open/close triggers directly into existing UI elements (the sidebar branding logo and the board workspace icon) instead of floating buttons.
   - Restrict movement strictly to horizontal sliding (left/right) to avoid vertical shifts or jumps in background rendering.

---

## Proposed Changes

### 1. Board Card Enhancements
- **Target File**: `src/components/BoardCard.tsx`
- **Details**:
  - Modify the wrapper `div`'s className. When `card.is_completed` is true:
    - Replace the standard gray border (`border-slate-200`) and violet hover border (`hover:border-violet-200/80`) with a soft green theme.
    - Specifically, use: `border-emerald-500/30 bg-emerald-50/20 shadow-[0_2px_8px_rgba(16,185,129,0.02)] hover:border-emerald-500/50 hover:bg-emerald-50/30 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:-translate-y-0.5 transition-all duration-150`.
  - Update the "ĐÃ HOÀN THÀNH" badge:
    - Shrink text from `text-[9px]` to `text-[8px]`.
    - Change colors from high-contrast green (`text-emerald-600 bg-emerald-50 border border-emerald-100`) to a softer, dimmer aesthetic: `text-emerald-600/60 font-semibold bg-emerald-50/30 border border-emerald-100/30 px-1.5 py-0.5 rounded-full tracking-wider`.

### 2. Collapsible Left Sidebar Layout (No vertical shifts)
- **Target File**: `src/app/board/layout.tsx`
- **Details**:
  - Maintain state `isSidebarOpen` (boolean), initialized by retrieving `board_sidebar_open` from `localStorage` (default to `true` if not set).
  - Use a horizontal layout:
    ```tsx
    <div className="flex h-screen w-full overflow-hidden relative select-none bg-gradient-to-tr ...">
      {/* Sidebar Container */}
      <div className={`h-full shrink-0 z-30 transition-all duration-300 ease-in-out border-r border-slate-200/50 bg-white/20 backdrop-blur-md flex flex-col ${
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden border-none"
      }`}>
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
        {/* Children Page Viewport - Strict flex sizing, no padding shift */}
        <div className="flex-1 w-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
    ```

### 3. Integrated Workspace Toggles
- **Target Files**: `src/app/board/[id]/page.tsx`, `src/components/BoardSwitcher.tsx`
- **Details**:
  - **Sidebar Logo Toggle (`BoardSwitcher.tsx`)**:
    - The "T" workspace icon on the top-left of the sidebar behaves as a collapse button.
    - Hovering over it morphs the "T" text into a left-chevron icon `[<-]`. Clicking it fires `onToggleSidebar`.
    - No separate toggle button on the right of the header title.
  - **Workspace Header Toggle (`page.tsx`)**:
    - Listen for `board-sidebar-state-change` window event to synchronize a local `isSidebarOpen` state.
    - When `isSidebarOpen` is true:
      - Show the standard task list icon. Hovering over it morphs it into a left-chevron icon `[<-]`. Clicking it dispatches custom `toggle-board-sidebar` window event.
    - When `isSidebarOpen` is false:
      - Show a Hamburger menu icon. Clicking it opens the sidebar by dispatching the custom event.

---

## Verification Plan

### Manual Verification
1. Open the board view. Toggle the sidebar open and closed. Verify:
   - Layout transitions smoothly only on the horizontal axis.
   - The workspace background and columns do not experience any vertical jump or shift.
2. In the Sidebar, hover over the "T" icon and verify it turns into a collapse icon. Clicking it should close the sidebar.
3. In the Workspace Header, verify the icon turns into a hamburger menu when the sidebar is closed. Hovering/clicking should open it.
