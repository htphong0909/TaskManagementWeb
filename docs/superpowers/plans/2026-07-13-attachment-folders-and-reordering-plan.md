# Attachment Folders and Drag Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

This plan details the implementation of attachment folders (always open), larger file displays, and full drag-and-drop support for both folders and files in `CardDetailModal.tsx` and `CardPopover.tsx`.

---

## Global Constraints
- Do not break existing attachments proxy, upload, or delete APIs.
- Ensure that deleting a folder does NOT delete the attached files, but rather makes them uncategorized (sets `folder_id = null`).
- Maintain visual harmony with premium pastel background design and harmonized colors.

---

### Task 1: Define types and update database query functions

**Files:**
- Modify: [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Modify: [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)

- [ ] **Step 1:** Update the `Attachment` type definition in both files to include `folder_id: string | null` and `position: number`.
- [ ] **Step 2:** Define the `AttachmentFolder` type in both files:
  ```typescript
  interface AttachmentFolder {
    id: string;
    card_id: string;
    name: string;
    position: number;
    created_at: string;
  }
  ```
- [ ] **Step 3:** Add states for folders in both files:
  ```typescript
  const [folders, setFolders] = useState<AttachmentFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  ```
- [ ] **Step 4:** Update the supabase queries in `fetchCardData` (in `CardDetailModal`) and `fetchAttachments` (in `CardPopover`) to fetch `attachment_folders` ordered by `position` ascending, and `attachments` ordered by `position` ascending.

---

### Task 2: Implement folder CRUD backend functions in React

**Files:**
- Modify: [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Modify: [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)

- [ ] **Step 1:** Implement `handleCreateFolder` which adds a new folder to `attachment_folders` with a position incremented after the last folder.
- [ ] **Step 2:** Implement `handleRenameFolder` which updates a folder name in `attachment_folders`.
- [ ] **Step 3:** Implement `handleDeleteFolder` which deletes the folder in `attachment_folders` (Supabase schema takes care of files by setting `folder_id` to null via the foreign key constraint `ON DELETE SET NULL`).
- [ ] **Step 4:** Ensure that file uploads assign a default `position` of `0` and a default `folder_id` of `null` (uncategorized).

---

### Task 3: Implement Folder and File Drag-and-Drop Handlers

**Files:**
- Modify: [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Modify: [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)

- [ ] **Step 1:** Add state variables to track the active dragging folder/attachment and the drag-over state:
  ```typescript
  const [activeDragFolderId, setActiveDragFolderId] = useState<string | null>(null);
  const [activeDragAttachmentId, setActiveDragAttachmentId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverAttachmentId, setDragOverAttachmentId] = useState<string | null>(null);
  ```
- [ ] **Step 2:** Define drag-and-drop handlers for **Folders**:
  - `handleFolderDragStart(e, folderId)`
  - `handleFolderDragOver(e, folderId)`
  - `handleFolderDrop(e, targetFolderId)` -> Updates folders positions in DB.
- [ ] **Step 3:** Define drag-and-drop handlers for **Attachments**:
  - `handleAttachmentDragStart(e, attId)`
  - `handleAttachmentDragOver(e, targetAttId)` -> Swaps or moves items in local state (with edge detection for top/bottom 20% to swap or shift folder classification).
  - `handleAttachmentDrop(e)` -> Saves new `folder_id` and `position` for modified files to database.
- [ ] **Step 4:** Define drop handler for dropping a file into a folder body/header:
  - `handleAttachmentDropOnFolder(e, folderId)` -> Places file into folder at the bottom of its list.
  - `handleAttachmentDropOnUncategorized(e)` -> Places file into the uncategorized list.

---

### Task 4: Redesign the UI Layout for Attachment Folders and Larger File Cards

**Files:**
- Modify: [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Modify: [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx)

- [ ] **Step 1:** Redesign the files inside `CardDetailModal.tsx` and `CardPopover.tsx` to display larger file cards with:
  - Six-dot drag handle on the left (if dragging).
  - SVG file icon.
  - Double click or single link file name.
  - Re-sort classification dynamically.
- [ ] **Step 2:** Render folders as visual panels that hold their specific list of sub-files:
  - Header: folder title, folder options button (rename/delete), drag handle for folder.
  - Body: List of files belonging to `folder_id === folder.id`.
- [ ] **Step 3:** Render the Uncategorized section as the top container holding files with `folder_id === null`.
- [ ] **Step 4:** Render the folder creation form input at the bottom of the attachment container.

---

### Task 5: Run Verification and Tests

- [ ] **Step 1:** Run `npm run lint` and resolve any TypeScript or import compilation errors.
- [ ] **Step 2:** Run `npm run build` to confirm the Next.js production build compiler executes cleanly.
- [ ] **Step 3:** Run `npm run test` to verify no existing tests are broken.
