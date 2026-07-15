# Board Display Enhancements Design Spec

We will modify the board date presentation and implement card status counters (completed and in-progress counts) in both the left sidebar (Board Switcher) and the main board header page.

## Proposed Changes

### 1. Board Switcher (`BoardSwitcher.tsx`)

- **State & Fetching**: 
  We will fetch all cards for the user from Supabase and group them client-side in the board switcher's fetch cycle to avoid complex server-side migrations:
  ```typescript
  const { data: cardsData } = await supabase
    .from("cards")
    .select("is_completed, is_in_progress, lists!inner(board_id)");
  ```
  We will store these grouped counts in a React state `boardCardCounts`.
- **Date Formatting**: 
  We will format the timestamp using custom JavaScript instead of locale strings to guarantee an exact `MM/YYYY` display layout in the sidebar.
- **Visual Design**: 
  Render the counts dynamically next to the board title inside `renderBoardItem(b)` using flexbox. The completed count has a solid green checkmark icon (`text-emerald-600`), and the in-progress count has a solid orange clock icon (`text-orange-600`).

### 2. Main Board Header (`src/app/board/[id]/page.tsx`)

- **State Usage**: 
  The main board page already holds the `cards` state. We will compute the completed and in-progress counts in-memory at render time.
- **Visual Design**: 
  Render counts next to the board title in the header on the same line, styled with appropriate margins, layout spacing, and SVG status icons matching the sidebar.

## Verification & Testing

- Unit tests in `src/__tests__/` will be run to verify no regression.
- Linter checks will be performed.
- Manual testing of card status changes will verify that the counters update in real-time in both the main header and the switcher.
