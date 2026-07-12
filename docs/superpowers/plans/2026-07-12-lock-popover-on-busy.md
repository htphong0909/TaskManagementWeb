# Kế hoạch khóa Popover khi đang tải lên/xóa file đính kèm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ngăn chặn việc đóng hoặc chuyển đổi thẻ Popover khi người dùng đang thực hiện tải lên hoặc xóa tệp đính kèm, tránh làm mất tiến trình theo dõi.

---

### Task 1: Cập nhật component CardPopover để xuất ra trạng thái Busy

**Files:**
- Modify: `src/components/CardPopover.tsx`

- [ ] **Step 1: Cập nhật Props Interface**

Thêm `onBusyChange` vào `CardPopoverProps` trong `src/components/CardPopover.tsx`:

```typescript
interface CardPopoverProps {
  card: {
    id: string;
    title: string;
    content: string | null;
  };
  rect: DOMRect | null;
  onClose: () => void;
  onCardUpdated: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onBusyChange?: (isBusy: boolean) => void;
}
```

- [ ] **Step 2: Gọi callback `onBusyChange` khi `uploadingFile` hoặc `deletingIds` thay đổi**

Thêm `useEffect` để thông báo cho component cha mỗi khi trạng thái bận thay đổi:

```typescript
  // Thông báo trạng thái bận cho component cha
  useEffect(() => {
    if (onBusyChange) {
      onBusyChange(uploadingFile !== null || deletingIds.length > 0);
    }
  }, [uploadingFile, deletingIds, onBusyChange]);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CardPopover.tsx
git commit -m "feat: export isBusy state from CardPopover via onBusyChange callback"
```

---

### Task 2: Cập nhật trang Board để khóa Popover khi ở trạng thái Busy

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Khai báo state `isPopoverBusy`**

Thêm state `isPopoverBusy` ở đầu component `BoardPage` trong `src/app/board/[id]/page.tsx` (ví dụ xung quanh dòng `hoveredCard`):

```typescript
  const [isPopoverBusy, setIsPopoverBusy] = useState(false);
```

- [ ] **Step 2: Chặn đóng/chuyển card khi `isPopoverBusy` là true**

Cập nhật các hàm xử lý hover trong `src/app/board/[id]/page.tsx` để chặn các hành vi đóng hoặc chuyển card:

```typescript
  const handleCardMouseEnter = (card: Card, event: React.MouseEvent<HTMLDivElement>) => {
    if (isPopoverBusy) return;
    if (editingCardId === card.id) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredCard(card);
    setHoveredRect(rect);
  };

  const handleCardMouseLeave = () => {
    if (isPopoverBusy) return;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }, 200);
  };

  const handlePopoverMouseLeave = () => {
    if (isPopoverBusy) return;
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCard(null);
      setHoveredRect(null);
    }, 200);
  };
```

- [ ] **Step 3: Truyền prop `onBusyChange` vào component `CardPopover`**

Cập nhật thẻ `<CardPopover>` được render trong `src/app/board/[id]/page.tsx` để truyền prop mới:

```tsx
        <CardPopover
          card={hoveredCard}
          rect={hoveredRect}
          onClose={() => {
            setHoveredCard(null);
            setHoveredRect(null);
          }}
          onCardUpdated={fetchBoardData}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onBusyChange={setIsPopoverBusy}
        />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "feat: lock CardPopover and prevent hover-close/switch when popover is busy uploading or deleting"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
