# Kế hoạch sửa lỗi kẹt mờ cột & Tối ưu hóa hiệu năng Kéo thả

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giải quyết lỗi cột bị kẹt trạng thái mờ khi kéo thả bằng cách thêm `onDragEnd` cho List, đồng thời tối ưu hiệu năng kéo thả thông qua cơ chế Cập nhật lạc quan (Optimistic Updates) và giảm thiểu số lượng request lên cơ sở dữ liệu Supabase.

---

### Task 1: Giải quyết lỗi cột bị kẹt mờ (List Drag End)

**Files:**
- Modify: `src/components/BoardColumn.tsx`
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Khai báo `onDragEndList` prop trong BoardColumn**

Thêm `onDragEndList` vào `BoardColumnProps` và gọi nó tại sự kiện `onDragEnd` của cột:

```typescript
// Trong src/components/BoardColumn.tsx -> BoardColumnProps
onDragEndList: (e: React.DragEvent) => void;
```

```tsx
// Trong src/components/BoardColumn.tsx -> JSX
    <div
      draggable
      onDragStart={(e) => onDragStartList(e, list.id)}
      onDragEnd={onDragEndList}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverList(e, list.id);
      }}
      ...
```

- [ ] **Step 2: Định nghĩa `handleListEnd` trong page.tsx**

Thêm hàm `handleListEnd` và truyền vào `<BoardColumn>`:

```typescript
// Trong src/app/board/[id]/page.tsx
  const handleListEnd = () => {
    setActiveDragListId(null);
    setDragOverListId(null);
  };
```

```tsx
// Trong src/app/board/[id]/page.tsx -> JSX
            <BoardColumn
              ...
              onDragStartList={handleListDragStart}
              onDragEndList={handleListEnd}
              onDragOverList={handleListDragOver}
              ...
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BoardColumn.tsx src/app/board/[id]/page.tsx
git commit -m "fix: resolve column stuck in dim state by binding list onDragEnd event"
```

---

### Task 2: Tối ưu hiệu năng cập nhật kéo thả (Optimistic Updates)

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Tối ưu kéo thả Thẻ đè lên Thẻ (handleCardDropOnCard)**
- Cập nhật state `cards` lạc quan (ngay lập tức) trước khi gọi DB.
- Thực hiện bulk upsert bằng single query thay vì gọi N request song song.
- Loại bỏ lệnh gọi `fetchBoardData()` khi thành công để tránh render lại toàn trang.

```typescript
  const handleCardDropOnCard = async (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setActiveDragCardId(null);
    const cardId = e.dataTransfer.getData("text/card-id");
    if (!cardId || cardId === targetCardId) return;

    const sourceCard = cards.find((c) => c.id === cardId);
    const targetCard = cards.find((c) => c.id === targetCardId);
    if (!sourceCard || !targetCard) return;

    const targetListId = targetCard.list_id;

    // 1. Sắp xếp danh sách cards mới tại cột mục tiêu
    const listCards = cards
      .filter((c) => c.list_id === targetListId && c.id !== cardId)
      .sort((a, b) => a.position - b.position);
    
    const targetIdx = listCards.findIndex((c) => c.id === targetCardId);
    listCards.splice(targetIdx, 0, { ...sourceCard, list_id: targetListId });

    // 2. Cập nhật state lạc quan ngay lập tức
    const updatedLocalCards = cards.map((c) => {
      // Nếu card nằm trong danh sách thay đổi, gán lại list_id và position mới
      const updatedCardIdx = listCards.findIndex((lc) => lc.id === c.id);
      if (updatedCardIdx !== -1) {
        return { ...c, list_id: targetListId, position: updatedCardIdx + 1 };
      }
      // Nếu card chính là card được di chuyển từ cột khác sang
      if (c.id === cardId) {
        return { ...c, list_id: targetListId, position: targetIdx + 1 };
      }
      return c;
    });
    setCards(updatedLocalCards);

    // 3. Gửi single query upsert trong background
    try {
      const updates = listCards.map((c, index) => ({
        id: c.id,
        list_id: targetListId,
        position: index + 1,
        title: c.title,
        content: c.content,
        due_date: c.due_date
      }));

      const { error } = await supabase.from("cards").upsert(updates);
      if (error) throw error;
    } catch (err) {
      console.error("Lỗi sắp xếp lại các card:", err);
      // Rollback trong trường hợp lỗi mạng
      await fetchBoardData();
    }
  };
```

- [ ] **Step 2: Tối ưu kéo thả Thẻ vào Cột (handleCardDropOnList)**
- Loại bỏ lệnh gọi `fetchBoardData()` sau khi lưu thành công vì state local đã được cập nhật lạc quan chính xác.

```typescript
  const handleCardDropOnList = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setDragOverListId(null);
    setActiveDragCardId(null);
    const cardId = e.dataTransfer.getData("text/card-id");
    if (!cardId) return;

    const listCards = cards.filter((c) => c.list_id === targetListId);
    const nextPosition = listCards.length > 0 ? Math.max(...listCards.map((c) => c.position)) + 1 : 1;

    // 1. Cập nhật state lạc quan ngay lập tức
    const updatedCards = cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, list_id: targetListId, position: nextPosition };
      }
      return c;
    });
    setCards(updatedCards);

    // 2. Lưu DB trong background
    try {
      const { error } = await supabase
        .from("cards")
        .update({ list_id: targetListId, position: nextPosition })
        .eq("id", cardId);
      if (error) throw error;
    } catch (err) {
      console.error("Lỗi thả card vào cột:", err);
      await fetchBoardData();
    }
  };
```

- [ ] **Step 3: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "perf: optimize drag-and-drop actions with optimistic states and batch upsert queries"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
