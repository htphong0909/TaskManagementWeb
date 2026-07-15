# Design Spec: Editable Board Date Field

This specification details the design and implementation of an editable `board_date` field in the `boards` table, replacing the display of `created_at` timestamp on the workspace header and board switcher.

## Proposed Changes

### Database Changes

#### [NEW] [20260715085000_add_board_date_to_boards.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260715085000_add_board_date_to_boards.sql)
Create a new migration file:
- Add a new column `board_date` of type `TIMESTAMP WITH TIME ZONE` to the `boards` table.
- Copy existing `created_at` values into `board_date` for backward compatibility.
- Alter the column to make it `NOT NULL` and set its default value to `timezone('utc'::text, now())`.

---

### Component & Page Changes

#### [MODIFY] [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx)
- Update the `Board` interface to include `board_date?: string`.
- Update the database select query inside `fetchFoldersAndBoards` to query `board_date` instead of `created_at`.
- Render the formatted board date from `board_date` in a small size in each board switcher list item.
- Add an event listener for a custom event `"reload-folders-and-boards"` so that if another component changes a board's date/title, it refreshes the board list automatically.

#### [MODIFY] [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/\[id\]/page.tsx)
- Add `boardDate`, `isEditingDate`, and `editDateVal` state variables.
- Update `fetchBoardData` to select `board_date` instead of `created_at`.
- Update the UI label from `(Tạo lúc: ...)` to `(Ngày: DD/MM/YYYY HH:MM)`.
- Make this display editable on double-click:
  - Double-clicking transforms the text into an `<input type="datetime-local">` element.
  - Losing focus (`onBlur`) or pressing `Enter` updates the `board_date` in Supabase.
  - Pressing `Escape` cancels the edit.
  - Upon successful update, dispatch a custom `"reload-folders-and-boards"` event to notify the board switcher component to refresh.

---

## Verification Plan

### Automated Tests
- Run `npm run test` to check for regressions.
- Run `npm run build` to verify compilation.

### Manual Verification
- Verify that existing boards show their correct date/time format `(Ngày: DD/MM/YYYY HH:MM)` next to the Workspace subtitle.
- Double click on the board date in the main page header. It should change to a datetime-local input.
- Edit the date/time and press Enter. Verify it updates both the header display and the board switcher list item creation/board date display.
- Double click and edit the date/time, then press Escape. Verify the edit is canceled and the original date is restored.
