# Design Spec: Column Description and Double-Click Interaction

This specification details the implementation of an editable description (subtitle) for board columns (lists), and changes the editing interaction for column titles and subtitles to require a double-click to prevent accidental activation.

## User Review Required

> [!NOTE]
> The database schema needs to be updated with a new migration adding a `description` column to the `lists` table.

---

## Proposed Changes

### Database Changes
Create a new migration file to alter the `lists` table.

#### [NEW] [20260714093000_add_description_to_lists.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260714093000_add_description_to_lists.sql)
```sql
-- Add description to lists table
ALTER TABLE public.lists ADD COLUMN description TEXT;
```

---

### Component Interface Changes

#### [MODIFY] [BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx)
- Update `List` interface to include `description?: string | null`.
- Update `BoardColumnProps` to receive:
  - `editingListDescId: string | null`
  - `setEditingListDescId: (id: string | null) => void`
  - `editListDesc: string`
  - `setEditListDesc: (desc: string) => void`
  - `handleRenameListDescSubmit: (id: string) => void`
- Change column title onClick to onDoubleClick.
- Render the description (subtitle) below the column title.
- Double-clicking the description triggers editing state (input field).

#### [MODIFY] [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/[id]/page.tsx)
- Update `List` interface to include `description?: string | null`.
- Add states:
  - `editingListDescId`
  - `editListDesc`
- Update query to fetch list description: `select("id, title, position, description")`.
- Update `handleAddListSubmit` to insert empty/default description if desired (nullable).
- Add `handleRenameListDescSubmit` to update description in DB.
- Pass new props to `BoardColumn`.

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify no existing tests are broken.
- Add test cases in a new test file or inside existing test suites if applicable to test double-click handlers.

### Manual Verification
- Verify that double-clicking the column title triggers editing (single click does not).
- Verify that double-clicking the column description triggers editing (single click does not).
- Verify that saving changes updates the UI and persists in Supabase.
- Verify that the card list is pushed down properly when description is added.
