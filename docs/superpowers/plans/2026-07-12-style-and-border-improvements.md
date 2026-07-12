# Kế hoạch cải thiện viền thẻ/cột & giao diện sáng Pastel xanh dương

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ nút đăng xuất góc trên bên phải, làm rõ nét viền của thẻ và cột, ngăn chặn việc chồng lấp/che khuất các viền bằng việc kiểm soát không gian đệm (`pt-1`) và cố định chiều cao màn hình `h-screen` (loại bỏ cuộn dọc toàn trang), và đổi nền sang tông xanh dương pastel nổi bật.

---

### Task 1: Thiết lập lại trang Board (page.tsx)

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Cập nhật Container chính và thanh Header**
- Đổi từ `min-h-screen` sang `h-screen` để khóa chiều cao khung nhìn, tránh cuộn dọc toàn trang làm cuộn trôi các cột dưới Header.
- Đổi màu nền sang tông xanh dương pastel dịu mát: `bg-gradient-to-tr from-[#bae6fd] via-[#c7d2fe] to-[#e0e7ff]`.
- Loại bỏ nút "Đăng xuất" ở góc trên bên phải.
- Thêm `pt-1` vào vùng chứa Columns để tạo khoảng trống viền trên của Cột.

```tsx
  return (
    <div className="h-screen bg-gradient-to-tr from-[#bae6fd] via-[#c7d2fe] to-[#e0e7ff] p-6 flex flex-col gap-6 text-slate-800 relative overflow-hidden">
      {/* Background glowing pastel circles */}
      <div className="absolute top-[10%] left-[10%] h-[350px] w-[350px] rounded-full bg-violet-300/20 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] h-[350px] w-[350px] rounded-full bg-pink-300/20 blur-[80px] pointer-events-none"></div>

      {/* Header Board */}
      <div className="flex items-center justify-between border-b border-slate-300/50 pb-4 relative z-10">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 select-none">{boardTitle || "Bảng công việc"}</h2>
      </div>

      {/* Board Columns Area */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-start select-none pt-1">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "style: switch board background to blue pastel, lock h-screen, remove signout button"
```

---

### Task 2: Làm rõ viền cột và thẻ, tránh chồng chéo tiêu đề

**Files:**
- Modify: `src/components/BoardColumn.tsx`
- Modify: `src/components/BoardCard.tsx`

- [ ] **Step 1: Cập nhật BoardColumn.tsx**
- Thay đổi viền từ `border-slate-200/50` sang màu đậm hơn `border-slate-300` và đổi nền trắng đục hơn `bg-white/80` giúp cột nổi bật trên nền xanh dương.
- Thêm `pt-1` vào vùng chứa thẻ (`listCards`) để tạo khoảng cách an toàn cho viền của thẻ đầu tiên không bị dính vào tiêu đề cột.

```tsx
    <div
      draggable
      onDragStart={(e) => onDragStartList(e, list.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverList(e);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("text/card-id")) {
          onCardDropOnList(e, list.id);
        } else {
          onDropList(e, list.id);
        }
      }}
      className="bg-white/80 backdrop-blur-md border border-slate-300 rounded-2xl p-4 flex flex-col min-w-72 max-w-72 max-h-[calc(100vh-140px)] shrink-0 shadow-sm"
    >
```

```tsx
      {/* Danh sách các Cards */}
      <div className="space-y-3 flex-1 overflow-y-auto mb-3 pr-1 min-h-[50px] pt-1">
```

- [ ] **Step 2: Cập nhật BoardCard.tsx**
- Thay đổi viền card từ `border-slate-100` sang `border-slate-200` để các thẻ hiển thị rõ nét, độc lập hơn.

```tsx
    <div
      draggable
      onDragStart={(e) => onDragStartCard(e, card.id, card.list_id)}
      onDragEnd={onDragEndCard}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onCardDropOnCard(e, card.id)}
      onMouseEnter={(e) => handleCardMouseEnter(card, e)}
      onMouseLeave={handleCardMouseLeave}
      onDoubleClick={() => !isEditingCard && [setEditingCardId(card.id), setEditCardTitle(card.title)]}
      className="group/card bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl p-4 flex flex-col gap-2 relative transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(139,92,246,0.05)] hover:border-violet-200/80 cursor-grab active:cursor-grabbing"
    >
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BoardColumn.tsx src/components/BoardCard.tsx
git commit -m "style: enhance column and card borders with pt-1 layout adjustments"
```

---

### Task 3: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
