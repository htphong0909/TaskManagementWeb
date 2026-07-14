# Design Spec: Sidebar Folders for Board Organization

This specification outlines the addition of folders to organize boards in the sidebar (`BoardSwitcher`). Folders will be collapsible and reordered using up/down arrow buttons. Boards can be dragged and dropped to reorder within their own folder, or dropped onto folder headers to move them into that folder.

## Database Changes

Create a new database migration file.

#### [NEW] [20260714131500_create_folders_table.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260714131500_create_folders_table.sql)
```sql
-- 1. Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    position FLOAT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own folders" 
ON public.folders FOR ALL USING (auth.uid() = user_id);

-- 2. Add folder_id to boards table
ALTER TABLE public.boards ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
```

---

## Component Changes

### [MODIFY] [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx)
- Define `Folder` interface:
  ```typescript
  interface Folder {
    id: string;
    title: string;
    position: number;
  }
  ```
- Update `Board` interface to include `folder_id?: string | null`.
- Add state variables:
  - `folders`: array of `Folder`
  - `collapsedFolderIds`: array of folder ID strings (synced with `localStorage`)
  - `editingFolderId`: string | null
  - `editFolderTitle`: string
  - `showAddFolderModal`: boolean
  - `newFolderTitle`: string
  - `folderToDelete`: Folder | null
- Fetch folders and boards inside `fetchBoards` (renamed to `fetchFoldersAndBoards`):
  - Load folders sorted by `position`.
  - Load boards sorted by `position`.
- Add Handlers:
  - Folder creation, renaming, and deletion.
  - Folder up/down movement: `handleMoveFolder(id, 'up' | 'down')`.
  - Board drag-and-drop:
    - Restrict board reordering (`handleDragOver` / `handleDrop`) to boards in the same folder.
    - Support dragging any board onto a Folder Header:
      - `onDragOver` on folder headers highlights the header.
      - `onDrop` updates the board's `folder_id` to that folder's ID and appends it to the end.
    - Support dragging any board to the bottom / ungrouped header to remove it from a folder (`folder_id = null`).

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify no regressions.

### Manual Verification
- Verify folders can be created, renamed, and deleted.
- Verify clicking folder headers collapses/expands the folder and persists in `localStorage` across page reloads.
- Verify clicking up/down arrow buttons on folder headers swaps folder positions cleanly.
- Verify dragging a board and dropping it onto a folder header moves it inside the folder.
- Verify boards can be reordered within the same folder, and dragging them to other folders for reordering is blocked.
- Verify boards can be dragged to the ungrouped area to remove them from any folder.
