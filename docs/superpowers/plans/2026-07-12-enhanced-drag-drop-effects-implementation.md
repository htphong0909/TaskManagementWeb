# Kế hoạch cải thiện hiệu ứng kéo thả Drag & Drop cao cấp

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm Ghost Placeholder, Drop Line Indicator, và Column Highlight vào trang Board, cập nhật các props và CSS class tương ứng trong BoardCard, BoardColumn và page.tsx.

---

### Task 1: Cập nhật component BoardCard.tsx

**Files:**
- Modify: `src/components/BoardCard.tsx`

- [ ] **Step 1: Cập nhật BoardCardProps interface**

Thêm các props quản lý hover drag-over và active drag-start:

```typescript
interface BoardCardProps {
  card: Card;
  isEditingCard: boolean;
  editCardTitle: string;
  setEditCardTitle: (title: string) => void;
  setEditingCardId: (id: string | null) => void;
  handleRenameCardSubmit: (id: string) => void;
  setCardToDelete: (card: Card) => void;
  handleCardMouseEnter: (card: Card, event: React.MouseEvent<HTMLDivElement>) => void;
  handleCardMouseLeave: () => void;
  onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
  onDragEndCard: (e: React.DragEvent) => void;
  onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
  // Drag states & hover handlers
  activeDragCardId: string | null;
  dragOverCardId: string | null;
  onDragOverCard: (e: React.DragEvent, cardId: string) => void;
  onDragLeaveCard: (e: React.DragEvent) => void;
}
```

- [ ] **Step 2: Cập nhật hàm JSX render của BoardCard**

Cập nhật các props trong hàm `BoardCard` và áp dụng các CSS class tương ứng:

```typescript
export default function BoardCard({
  card,
  isEditingCard,
  editCardTitle,
  setEditCardTitle,
  setEditingCardId,
  handleRenameCardSubmit,
  setCardToDelete,
  handleCardMouseEnter,
  handleCardMouseLeave,
  onDragStartCard,
  onDragEndCard,
  onCardDropOnCard,
  activeDragCardId,
  dragOverCardId,
  onDragOverCard,
  onDragLeaveCard,
}: BoardCardProps) {
```

```tsx
  const isDragging = card.id === activeDragCardId;
  const isDragOver = card.id === dragOverCardId && activeDragCardId !== card.id;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartCard(e, card.id, card.list_id)}
      onDragEnd={onDragEndCard}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard(e, card.id);
      }}
      onDragLeave={onDragLeaveCard}
      onDrop={(e) => onCardDropOnCard(e, card.id)}
      onMouseEnter={(e) => handleCardMouseEnter(card, e)}
      onMouseLeave={handleCardMouseLeave}
      onDoubleClick={() => !isEditingCard && [setEditingCardId(card.id), setEditCardTitle(card.title)]}
      className={`group/card bg-white border rounded-xl p-4 flex flex-col gap-2 relative transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragging 
          ? "opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]" 
          : "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80"
        }
        ${isDragOver ? "border-t-4 border-t-violet-500 pt-1 shadow-sm" : ""}
      `}
    >
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BoardCard.tsx
git commit -m "feat: enhance BoardCard styling with drag ghost and drop indicator borders"
```

---

### Task 2: Cập nhật component BoardColumn.tsx

**Files:**
- Modify: `src/components/BoardColumn.tsx`

- [ ] **Step 1: Cập nhật BoardColumnProps interface**

Thêm các props drag over xuống `BoardColumn`:

```typescript
interface BoardColumnProps {
  list: List;
  listCards: Card[];
  editingListId: string | null;
  setEditingListId: (id: string | null) => void;
  editListTitle: string;
  setEditListTitle: (title: string) => void;
  handleRenameListSubmit: (id: string) => void;
  setListToDelete: (list: List) => void;
  // Card Creation Form
  addingCardListId: string | null;
  setAddingCardListId: (id: string | null) => void;
  newCardTitle: string;
  setNewCardTitle: (title: string) => void;
  newCardDueDate: string;
  setNewCardDueDate: (date: string) => void;
  handleAddCardSubmit: (e: React.FormEvent, listId: string) => void;
  // Card properties
  editingCardId: string | null;
  setEditingCardId: (id: string | null) => void;
  editCardTitle: string;
  setEditCardTitle: (title: string) => void;
  handleRenameCardSubmit: (id: string) => void;
  setCardToDelete: (card: Card) => void;
  handleCardMouseEnter: (card: Card, event: React.MouseEvent<HTMLDivElement>) => void;
  handleCardMouseLeave: () => void;
  // Drag & Drop handlers
  onDragStartList: (e: React.DragEvent, listId: string) => void;
  onDragOverList: (e: React.DragEvent, listId: string) => void;
  onDropList: (e: React.DragEvent, targetListId: string) => void;
  onDragStartCard: (e: React.DragEvent, cardId: string, listId: string) => void;
  onDragEndCard: (e: React.DragEvent) => void;
  onCardDropOnList: (e: React.DragEvent, targetListId: string) => void;
  onCardDropOnCard: (e: React.DragEvent, targetCardId: string) => void;
  // Enhanced drag states & handlers
  activeDragCardId: string | null;
  activeDragListId: string | null;
  dragOverListId: string | null;
  dragOverCardId: string | null;
  onDragLeaveList: (e: React.DragEvent) => void;
  onDragOverCard: (e: React.DragEvent, cardId: string) => void;
  onDragLeaveCard: (e: React.DragEvent) => void;
}
```

- [ ] **Step 2: Cập nhật hàm JSX render của BoardColumn**

Sử dụng các props mới và áp dụng CSS class cho cột mục tiêu kéo thả và truyền xuống thẻ `BoardCard`:

```typescript
export default function BoardColumn({
  list,
  listCards,
  editingListId,
  setEditingListId,
  editListTitle,
  setEditListTitle,
  handleRenameListSubmit,
  setListToDelete,
  addingCardListId,
  setAddingCardListId,
  newCardTitle,
  setNewCardTitle,
  newCardDueDate,
  setNewCardDueDate,
  handleAddCardSubmit,
  editingCardId,
  setEditingCardId,
  editCardTitle,
  setEditCardTitle,
  handleRenameCardSubmit,
  setCardToDelete,
  handleCardMouseEnter,
  handleCardMouseLeave,
  onDragStartList,
  onDragOverList,
  onDropList,
  onDragStartCard,
  onDragEndCard,
  onCardDropOnList,
  onCardDropOnCard,
  activeDragCardId,
  activeDragListId,
  dragOverListId,
  dragOverCardId,
  onDragLeaveList,
  onDragOverCard,
  onDragLeaveCard,
}: BoardColumnProps) {
```

```tsx
  const isDraggingList = list.id === activeDragListId;
  const isDragOverList = list.id === dragOverListId && activeDragCardId !== null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartList(e, list.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverList(e, list.id);
      }}
      onDragLeave={onDragLeaveList}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("text/card-id")) {
          onCardDropOnList(e, list.id);
        } else {
          onDropList(e, list.id);
        }
      }}
      className={`backdrop-blur-md border rounded-2xl p-4 flex flex-col min-w-72 max-w-72 max-h-[calc(100vh-140px)] shrink-0 transition-all duration-200
        ${isDraggingList 
          ? "opacity-30 border-dashed border-violet-400 bg-violet-50/30 scale-[0.97]" 
          : "bg-white/80 border-slate-300 shadow-sm"
        }
        ${isDragOverList ? "ring-2 ring-violet-400 ring-offset-2 shadow-md bg-white/90" : ""}
      `}
    >
```

Và truyền xuống thẻ con `<BoardCard>`:

```tsx
          <BoardCard
            key={card.id}
            card={card}
            isEditingCard={card.id === editingCardId}
            editCardTitle={editCardTitle}
            setEditCardTitle={setEditCardTitle}
            setEditingCardId={setEditingCardId}
            handleRenameCardSubmit={handleRenameCardSubmit}
            setCardToDelete={setCardToDelete}
            handleCardMouseEnter={handleCardMouseEnter}
            handleCardMouseLeave={handleCardMouseLeave}
            onDragStartCard={onDragStartCard}
            onDragEndCard={onDragEndCard}
            onCardDropOnCard={onCardDropOnCard}
            activeDragCardId={activeDragCardId}
            dragOverCardId={dragOverCardId}
            onDragOverCard={onDragOverCard}
            onDragLeaveCard={onDragLeaveCard}
          />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BoardColumn.tsx
git commit -m "feat: support dragover highlight on columns and propagate drag states to BoardCard"
```

---

### Task 3: Cấu hình quản lý drag states tại page.tsx

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Khai báo các states quản lý hover drag**

Thêm các state trong `src/app/board/[id]/page.tsx`:

```typescript
  // Kéo thả states
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const [activeDragListId, setActiveDragListId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
```

- [ ] **Step 2: Cập nhật các bộ lắng nghe sự kiện kéo thả (Drag Handlers)**

Cập nhật các hàm xử lý trong `src/app/board/[id]/page.tsx` để thay đổi các states trên:

```typescript
  // Drag & Drop Lists
  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    e.dataTransfer.setData("text/list-id", listId);
    setActiveDragListId(listId);
  };

  const handleListDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (activeDragCardId !== null) {
      setDragOverListId(listId);
    }
  };

  const handleListDragLeave = () => {
    setDragOverListId(null);
  };

  const handleListDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setDragOverListId(null);
    setActiveDragListId(null);
    const sourceListId = e.dataTransfer.getData("text/list-id");
    if (!sourceListId || sourceListId === targetListId) return;
    ...
```

Và cho Card drag:

```typescript
  // Drag & Drop Cards
  const handleCardDragStart = (e: React.DragEvent, cardId: string, listId: string) => {
    e.dataTransfer.setData("text/card-id", cardId);
    e.dataTransfer.setData("text/source-list-id", listId);
    setActiveDragCardId(cardId);
  };

  const handleCardEnd = () => {
    setActiveDragCardId(null);
    setDragOverCardId(null);
    setDragOverListId(null);
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    if (activeDragCardId && activeDragCardId !== cardId) {
      setDragOverCardId(cardId);
    }
  };

  const handleCardDragLeave = () => {
    setDragOverCardId(null);
  };

  const handleCardDropOnList = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setDragOverListId(null);
    setActiveDragCardId(null);
    const cardId = e.dataTransfer.getData("text/card-id");
    if (!cardId) return;
    ...
```

Cập nhật `handleCardDropOnCard`:

```typescript
  const handleCardDropOnCard = async (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setActiveDragCardId(null);
    const cardId = e.dataTransfer.getData("text/card-id");
    if (!cardId || cardId === targetCardId) return;
    ...
```

- [ ] **Step 3: Truyền các props mới vào thẻ `<BoardColumn>` trong JSX**

Cập nhật thẻ `<BoardColumn>` được render:

```tsx
            <BoardColumn
              key={list.id}
              list={list}
              listCards={listCards}
              editingListId={editingListId}
              setEditingListId={setEditingListId}
              editListTitle={editListTitle}
              setEditListTitle={setEditListTitle}
              handleRenameListSubmit={handleRenameListSubmit}
              setListToDelete={setListToDelete}
              addingCardListId={addingCardListId}
              setAddingCardListId={setAddingCardListId}
              newCardTitle={newCardTitle}
              setNewCardTitle={setNewCardTitle}
              newCardDueDate={newCardDueDate}
              setNewCardDueDate={setNewCardDueDate}
              handleAddCardSubmit={handleAddCardSubmit}
              editingCardId={editingCardId}
              setEditingCardId={setEditingCardId}
              editCardTitle={editCardTitle}
              setEditCardTitle={setEditCardTitle}
              handleRenameCardSubmit={handleRenameCardSubmit}
              setCardToDelete={setCardToDelete}
              handleCardMouseEnter={handleCardMouseEnter}
              handleCardMouseLeave={handleCardMouseLeave}
              onDragStartList={handleListDragStart}
              onDragOverList={handleListDragOver}
              onDropList={handleListDrop}
              onDragStartCard={handleCardDragStart}
              onDragEndCard={handleCardEnd}
              onCardDropOnList={handleCardDropOnList}
              onCardDropOnCard={handleCardDropOnCard}
              // Enhanced drag states & handlers
              activeDragCardId={activeDragCardId}
              activeDragListId={activeDragListId}
              dragOverListId={dragOverListId}
              dragOverCardId={dragOverCardId}
              onDragLeaveList={handleListDragLeave}
              onDragOverCard={handleCardDragOver}
              onDragLeaveCard={handleCardDragLeave}
            />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: manage active drag states and active hover dropzones on board page"
```

---

### Task 4: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
