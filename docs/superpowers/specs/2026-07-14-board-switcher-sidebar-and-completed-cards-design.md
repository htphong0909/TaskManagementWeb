# Design Spec: Completed Cards Green Border & Sidebar Board Switcher

This specification details the UX improvements for styling completed cards and transforming the board switcher from a bottom bar to a collapsible left sidebar.

## Goal

1. **Completed Cards**: Make completed tasks less visually distracting. They should feature a subtle green border, and the "ĐÃ HOÀN THÀNH" label should be smaller and dimmer.
2. **Left Sidebar Switcher**: Relocate the Board Switcher from the bottom Excel-tab bar to a collapsible left sidebar. Provide a toggle button at the top-left corner of the viewport to open/close the sidebar, pushing the main board content to the right when open.

---

## Proposed Changes

### 1. Board Card Enhancements
- **Target File**: `src/components/BoardCard.tsx`
- **Details**:
  - Modify the wrapper `div`'s className. When `card.is_completed` is true:
    - Replace the standard gray border (`border-slate-200`) and violet hover border (`hover:border-violet-200/80`) with a soft green theme.
    - Specifically, use: `border-emerald-500/30 bg-emerald-50/20 shadow-[0_2px_8px_rgba(16,185,129,0.02)] hover:border-emerald-500/50 hover:bg-emerald-50/30 hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)]`.
  - Update the "ĐÃ HOÀN THÀNH" badge:
    - Shrink text from `text-[9px]` to `text-[8px]`.
    - Change colors from high-contrast green (`text-emerald-600 bg-emerald-50 border border-emerald-100`) to a softer, dimmer aesthetic: `text-emerald-600/60 font-semibold bg-emerald-50/30 border border-emerald-100/30 px-1.5 py-0.5 rounded-full tracking-wider`.

### 2. Collapsible Left Sidebar Layout
- **Target File**: `src/app/board/layout.tsx`
- **Details**:
  - Add state `isSidebarOpen` (boolean), initialized by retrieving `board_sidebar_open` from `localStorage` (default to `true` if not set).
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
        {/* Top-Left Toggle Button (Floating when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => {
              setIsSidebarOpen(true);
              localStorage.setItem("board_sidebar_open", "true");
            }}
            className="absolute top-3 left-3 z-40 p-2 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/60 hover:bg-white hover:scale-105 transition duration-150 shadow-sm text-slate-500 hover:text-slate-700 cursor-pointer"
            title="Mở menu bảng"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Children Page Viewport */}
        <div className={`flex-1 w-full overflow-hidden transition-all duration-300 ${!isSidebarOpen ? "pl-14" : ""}`}>
          {children}
        </div>
      </div>
    </div>
    ```

### 3. Vertical Sidebar Switcher
- **Target File**: `src/components/BoardSwitcher.tsx`
- **Details**:
  - Restructure the UI from a horizontal row `flex items-center justify-between` to a vertical column:
    - **Sidebar Wrapper**: `h-full w-full flex flex-col justify-between p-4 text-slate-700 select-none`.
    - **Header Section**:
      - App Branding: "QUẢN LÝ CÔNG VIỆC" or "TaskApp".
      - Toggle Close button (visible inside the sidebar header, aligned top-right of the sidebar):
        ```tsx
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          title="Đóng sidebar"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        ```
    - **Boards List**:
      - Vertical flex-column list: `flex flex-col gap-1 overflow-y-auto max-h-[70vh] py-2`.
      - Each item style should be modern:
        - General: `w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer relative group`.
        - Active board: `bg-violet-50 text-violet-600 border border-violet-100/50 shadow-[0_2px_8px_rgba(139,92,246,0.04)]`.
        - Inactive board: `text-slate-500 hover:bg-white/40 hover:text-slate-700`.
      - Drag and drop: Keeps standard vertical order updating. Under `handleDragOver`, the DOM coordinates behavior will naturally align list elements vertical offsets, updating board indexes.
      - Add new Board button: A clean full-width button at the end of the lists `+ Tạo bảng mới`.
    - **Footer Section**:
      - Display the User email and "Đăng xuất" button in a neat vertical container at the bottom.

---

## Verification Plan

### Manual Verification
1. Open the board view and mark a card as completed. Verify:
   - Green background/border styling matches the design.
   - The "ĐÃ HOÀN THÀNH" label is noticeably smaller and less intrusive.
2. Toggle the Sidebar using the top-left button. Verify:
   - Clicking collapse closes the sidebar smoothly.
   - When collapsed, a hamburger menu icon appears at the top-left to expand it.
   - Toggled state persists after page refresh.
   - Drag-and-drop to reorder boards vertically behaves cleanly.
