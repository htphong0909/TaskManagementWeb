# Design Spec: Card In-Progress State and Board Creation Date

This specification details the design and implementation of:
1. An "ĐANG DIỄN RA" (In Progress) checkbox in the card details modal which is mutually exclusive with "ĐÃ HOÀN THÀNH" (Completed) and renders orange styling on the card.
2. Small board creation date timestamps displayed on the board switcher items and the main board header.

## Proposed Changes

### Database Changes

#### [NEW] [20260714202500_add_is_in_progress_to_cards.sql](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/supabase/migrations/20260714202500_add_is_in_progress_to_cards.sql)
Create a new migration file:
- Add `is_in_progress` boolean column to the `cards` table, defaulting to `FALSE`.
- Add a CHECK constraint `cards_status_exclusive_check` ensuring `NOT (is_completed AND is_in_progress)`.

---

### Component & Page Changes

#### [MODIFY] [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx)
- Add `is_in_progress?: boolean` to the `Card` interface.
- Add card styling overrides for when `is_in_progress` is active (orange borders `border-orange-500/30` and orange background `bg-orange-50/20` on normal and hover states).
- Render an orange `"ĐANG DIỄN RA"` badge next to the creation date if `is_in_progress` is checked.
- Ensure deadline style colors are calculated normally (do not force green completed deadline style for cards in progress).

#### [MODIFY] [BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx)
- Add `is_in_progress?: boolean` to the `Card` interface.

#### [MODIFY] [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx)
- Add `is_in_progress?: boolean` to the `Card` interface.
- Add `isInProgress` and `setIsInProgress` state hooks.
- Render the `"Đang thực hiện công việc"` checkbox under the completed checkbox in the right sidebar.
- Implement mutual exclusivity in the handlers `handleToggleInProgressInModal` and `handleToggleCompletedInModal` so that checking one unchecks and updates the other in Supabase.

#### [MODIFY] [BoardSwitcher.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardSwitcher.tsx)
- Add `created_at?: string` to the `Board` interface.
- Modify the database select query to fetch `created_at` from `boards`.
- Render the formatted creation timestamp in a small size in the top-left of each board switcher list item.

#### [MODIFY] [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/\[id\]/page.tsx)
- Add `is_in_progress?: boolean` to the `Card` interface.
- Add `boardCreatedAt` state and fetch it inside `fetchBoardData` from the `boards` table.
- Display the formatted board creation time next to the workspace indicator text in the top-left corner of the main page header.

---

## Verification Plan

### Automated Tests
- Run `npm run test` to verify no regressions in vitest suites.
- Run `npm run build` to verify Next.js compiles cleanly.

### Manual Verification
- Open Card Details Modal:
  - Check "Đang thực hiện công việc". Verify "Đã hoàn thành công việc" is unchecked (if it was checked).
  - Verify card container on the board turns orange, has orange hover borders, and shows a "ĐANG DIỄN RA" badge.
  - Verify deadline badge retains its normal computed style.
  - Check "Đã hoàn thành công việc". Verify "Đang thực hiện công việc" gets unchecked and card turns green.
- Verify that Board Switcher items show their creation time in a small gray format.
- Verify that the main workspace header shows `(Tạo lúc: DD/MM/YYYY HH:MM)` next to the Workspace subtitle.
