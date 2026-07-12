# Kế hoạch đồng bộ mô tả chi tiết của Thẻ trong Popover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai đồng bộ dữ liệu Thẻ đang mở Popover (`hoveredCard`) phía `page.tsx` và đồng bộ nội dung mô tả cục bộ (`description`) phía `CardPopover.tsx` để hiển thị mô tả mới ngay lập tức sau khi click-outside lưu thành công.

---

### Task 1: Đồng bộ phía Component cha (page.tsx)

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Thêm useEffect đồng bộ dữ liệu hoveredCard**

Thêm `useEffect` để liên tục đối chiếu `hoveredCard` với danh sách `cards` mới nhất:

```typescript
  // Đồng bộ hoveredCard với dữ liệu cards mới nhất khi cards thay đổi
  useEffect(() => {
    if (hoveredCard) {
      const updated = cards.find((c) => c.id === hoveredCard.id);
      if (updated && updated !== hoveredCard) {
        setHoveredCard(updated);
      }
    }
  }, [cards, hoveredCard]);
```

Hãy đặt hook này ngay bên dưới phần khai báo các states kéo thả đầu trang.

- [ ] **Step 2: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: synchronize hoveredCard state with updated cards list in board page"
```

---

### Task 2: Đồng bộ phía Component con (CardPopover.tsx)

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Thêm useEffect đồng bộ mô tả cục bộ**

Thêm `useEffect` lắng nghe sự thay đổi của prop `card.content` hoặc `card.id` để cập nhật state `description`:

```typescript
  // Đồng bộ lại nội dung mô tả khi prop card thay đổi từ bên ngoài
  useEffect(() => {
    setDescription(card.content || "");
  }, [card.id, card.content]);
```

Đặt hook này ngay bên dưới `handleSaveDescription` (dưới dòng 95).

- [ ] **Step 2: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: synchronize description state with card prop updates in CardPopover"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
