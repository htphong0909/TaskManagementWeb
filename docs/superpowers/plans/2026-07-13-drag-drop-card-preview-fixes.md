# Card Drag Preview and Bottom Container Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix card drag-over preview behavior to allow dragging to the bottom of columns and eliminate transition lag when cards swap.

**Architecture:** Add a new `onDragOver` handler to the card list container in `BoardColumn.tsx` to enable appending cards to the bottom of the list. Move CSS transitions off dragging cards in `BoardCard.tsx` to avoid layout update delay.

**Tech Stack:** React, Next.js, Tailwind CSS, Supabase

## Global Constraints
- Avoid introducing unused variables or breaking TypeScript constraints.
- Verify changes with lint and compile checks before completing tasks.

---

### Task 1: Update BoardColumn interface and JSX

**Files:**
- Modify: [BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx)

**Interfaces:**
- Consumes: `React.DragEvent`
- Produces: `onCardDragOverListContainer: (e: React.DragEvent, listId: string) => void` callback in `BoardColumnProps`

- [ ] **Step 1:** Add `onCardDragOverListContainer` to the `BoardColumnProps` interface in [BoardColumn.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardColumn.tsx).
- [ ] **Step 2:** Destructure `onCardDragOverListContainer` inside the `BoardColumn` component arguments.
- [ ] **Step 3:** Add `onDragOver` handler to the cards list container `div` (which has className `space-y-3 flex-1 overflow-y-auto...`):
  ```tsx
  onDragOver={(e) => {
    e.preventDefault();
    onCardDragOverListContainer(e, list.id);
  }}
  ```
- [ ] **Step 4:** Run `npm run lint` to make sure there are no syntax errors (it will have TypeScript errors about missing props in page.tsx, which is expected before Task 2).
- [ ] **Step 5:** Commit changes.

---

### Task 2: Implement container drag-over handler in page.tsx

**Files:**
- Modify: [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx)

**Interfaces:**
- Consumes: `onCardDragOverListContainer` prop on `BoardColumn`
- Produces: `handleCardDragOverListContainer: (e: React.DragEvent, listId: string) => void` in `src/app/board/[id]/page.tsx`

- [ ] **Step 1:** Define the `handleCardDragOverListContainer` function in [page.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/app/board/%5Bid%5D/page.tsx) to move the card to the end of the column:
  ```typescript
  const handleCardDragOverListContainer = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (!activeDragCardId) return;

    const sourceIdx = cards.findIndex((c) => c.id === activeDragCardId);
    if (sourceIdx === -1) return;

    const sourceCard = cards[sourceIdx];
    const targetListCards = cards.filter((c) => c.list_id === listId && c.id !== activeDragCardId);

    const isAlreadyLastInTarget = 
      sourceCard.list_id === listId && 
      targetListCards.length > 0 && 
      cards.findIndex((c) => c.id === activeDragCardId) > cards.findIndex((c) => c.id === targetListCards[targetListCards.length - 1].id);

    if (!isAlreadyLastInTarget) {
      const updatedCards = [...cards];
      const [draggedCard] = updatedCards.splice(sourceIdx, 1);
      draggedCard.list_id = listId;

      let lastCardIdx = -1;
      for (let i = updatedCards.length - 1; i >= 0; i--) {
        if (updatedCards[i].list_id === listId) {
          lastCardIdx = i;
          break;
        }
      }

      if (lastCardIdx !== -1) {
        updatedCards.splice(lastCardIdx + 1, 0, draggedCard);
      } else {
        updatedCards.push(draggedCard);
      }

      setCards(updatedCards);
    }
  };
  ```
- [ ] **Step 2:** Pass the `onCardDragOverListContainer` prop to `<BoardColumn />` component in the rendering block:
  ```tsx
  onCardDragOverListContainer={handleCardDragOverListContainer}
  ```
- [ ] **Step 3:** Run `npm run lint` and verify there are no syntax or type errors.
- [ ] **Step 4:** Commit changes.

---

### Task 3: Optimize BoardCard CSS transitions during drag

**Files:**
- Modify: [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx)

- [ ] **Step 1:** Modify the className of `BoardCard` wrapper `div` in [BoardCard.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/BoardCard.tsx) so that `transition-all duration-150` is only applied when the card is not being dragged (`!isDragging`).
- [ ] **Step 2:** Verify that `isDragging` condition is properly checked.
- [ ] **Step 3:** Run `npm run lint` and `npm run build` to verify the codebase compiles successfully.
- [ ] **Step 4:** Commit changes.
