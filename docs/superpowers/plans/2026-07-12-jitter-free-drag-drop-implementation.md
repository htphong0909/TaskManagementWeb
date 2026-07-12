# Kế hoạch sửa lỗi giật lắc kéo thả thẻ từ trên xuống dưới

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi giật lắc layout (jitter) khi kéo thẻ từ trên xuống dưới bằng cách đổi sang hiển thị đường line định vị tuyệt đối `absolute` trong `BoardCard.tsx`.

---

### Task 1: Thay thế border-t-4 bằng absolute top div trong BoardCard.tsx

**Files:**
- Modify: `src/components/BoardCard.tsx`

- [ ] **Step 1: Cập nhật JSX render của BoardCard**

Thay đổi class của thẻ div chính (không dùng `border-t-4 border-t-violet-500 pt-1` khi `isDragOver` nữa, thay bằng đổi border và bg), đồng thời chèn thẻ div absolute chỉ định vị trí thả:

```tsx
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
        ${isDragOver ? "border-violet-400 bg-violet-50/20" : ""}
      `}
    >
      {/* Đường chỉ thị vị trí thả không làm lệch Layout (Jitter-free indicator) */}
      {isDragOver && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500 rounded-t-xl pointer-events-none z-20" />
      )}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BoardCard.tsx
git commit -m "fix: eliminate drag-and-drop downward jitter by using absolute positioning for the drop line indicator"
```

---

### Task 2: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
