# Implementation Plan: Collapsible Sidebar Folders

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement collapsible folders in the sidebar to organize boards. Folders will be reordered using up/down arrow buttons. Boards will support reordering within the same folder, dragging and dropping onto a folder header to be moved into it, and dragging to the ungrouped area to be removed from a folder.

---

### Task 1: Create and Run Database Migration

**Files:**
- Create: `supabase/migrations/20260714131500_create_folders_table.sql`

- [ ] **Step 1: Create SQL migration file**
  Create `supabase/migrations/20260714131500_create_folders_table.sql` containing:
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

- [ ] **Step 2: Push database migration**
  Run command: `npx supabase db push` to push migration to the Supabase instance.

---

### Task 2: Implement UI & CRUD operations for Folders in BoardSwitcher

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`

- [ ] **Step 1: Update type definitions and states**
  Add `Folder` interface and update `Board` type:
  ```typescript
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
  }
  ```
  Add state hooks for folders:
  ```typescript
  const [folders, setFolders] = useState<Folder[]>([]);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderTitle, setEditFolderTitle] = useState("");
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  ```

- [ ] **Step 2: Update fetching logic**
  Replace `fetchBoards` with `fetchFoldersAndBoards` to load both tables sorted by position:
  ```typescript
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
      .select("id, title, position, folder_id")
      .order("position", { ascending: true });
    setBoards(boardData || []);
  }, []);
  ```
  Update `useEffect` to call `fetchFoldersAndBoards()` instead of `fetchBoards()`.

- [ ] **Step 3: Implement collapse/expand persistence**
  Load collapsed state on mount:
  ```typescript
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
  ```
  Add a helper toggle function that saves changes:
  ```typescript
  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const updated = prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId];
      localStorage.setItem("collapsedFolderIds", JSON.stringify(updated));
      return updated;
    });
  };
  ```

- [ ] **Step 4: Implement Folder CRUD actions**
  - **Create**:
    ```typescript
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
    ```
  - **Rename**:
    ```typescript
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
    ```
  - **Delete**:
    ```typescript
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
    ```

- [ ] **Step 5: Implement Folder Up/Down Swapping**
  ```typescript
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

    // Swap locally for instant feedback
    const updatedFolders = [...folders];
    updatedFolders[idx] = targetFolder;
    updatedFolders[targetIdx] = currentFolder;
    setFolders(updatedFolders);

    // Save to database
    await Promise.all([
      supabase.from("folders").update({ position: currentFolder.position }).eq("id", currentFolder.id),
      supabase.from("folders").update({ position: targetFolder.position }).eq("id", targetFolder.id),
    ]);
    await fetchFoldersAndBoards();
  };
  ```

---

### Task 3: Render Hierarchical Sidebar UI & Drag-and-Drop Handlers

**Files:**
- Modify: `src/components/BoardSwitcher.tsx`

- [ ] **Step 1: Refactor Board Drag-and-Drop code to enforce folder rules**
  - Update `handleDragOver`: Only allow dragging over if the active drag board and target board have the same `folder_id`.
  - Add drop targets to Folder Headers:
    - `onDragOver` sets hover state for visual feedback.
    - `onDrop` updates the dragged board's `folder_id` to that folder's ID, updates its position to be at the end, and saves it to Supabase.
  - Add drop targets to the Ungrouped section header:
    - Dropping here updates `folder_id` to `null`.

- [ ] **Step 2: Refactor UI Rendering**
  Render the folders list followed by the ungrouped boards list.
  - Folder Header:
    - Display Toggle Collapse arrow.
    - Display Title text (double-click triggers rename state).
    - Display Up/Down arrows and delete button on hover.
  - Expanded Boards (if expanded):
    - Filter and render boards belonging to this folder.
  - Bottom Ungrouped Section:
    - A subtle title header: `"Bảng tự do"`.
    - Render boards with `folder_id === null`.
  - Modals:
    - Include the Folder Add Modal and Folder Delete confirmation modal.

- [ ] **Step 3: Run verification and checks**
  Run: `npm run test` and `npm run build`
  Expected: PASS
