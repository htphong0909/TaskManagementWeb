# Kế hoạch sửa lỗi đồng bộ thứ tự cột (Postgres Upsert constraint error)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục lỗi `upsert` vi phạm các ràng buộc NOT NULL của bảng `lists` và `cards` trên PostgreSQL. Chúng ta sẽ quay lại sử dụng phương thức `.update().eq("id")` chạy song song (`Promise.all`) vốn an toàn tuyệt đối với các lệnh cập nhật cột riêng lẻ mà vẫn giữ nguyên cơ chế Cập nhật lạc quan (Optimistic Updates) để đảm bảo tốc độ phản hồi tức thời cho người dùng.

---

### Task 1: Thay thế upsert bằng update song song an toàn trong page.tsx

**Files:**
- Modify: `src/app/board/[id]/page.tsx`

- [ ] **Step 1: Cập nhật hàm `handleListDrop`**

Thay thế `upsert` bằng `Promise.all` sử dụng `update`:

```typescript
    try {
      await Promise.all([
        supabase.from("lists").update({ position: sourceList.position }).eq("id", sourceList.id),
        supabase.from("lists").update({ position: targetList.position }).eq("id", targetList.id),
      ]);
    } catch (err) {
      console.error("Lỗi đồng bộ thứ tự cột:", err);
      await fetchBoardData();
    }
```

- [ ] **Step 2: Cập nhật hàm `handleCardDropOnCard`**

Thay thế `upsert` hàng loạt của cards bằng `Promise.all` sử dụng `update`:

```typescript
    // 3. Gửi các query update song song trong background
    try {
      const promises = listCards.map((c, index) => {
        const newPos = index + 1;
        return supabase.from("cards").update({ list_id: targetListId, position: newPos }).eq("id", c.id);
      });

      await Promise.all(promises);
    } catch (err) {
      console.error("Lỗi sắp xếp lại các card:", err);
      // Rollback nếu có lỗi
      await fetchBoardData();
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/board/[id]/page.tsx
git commit -m "fix: revert to parallel update queries to bypass postgres upsert not null constraints"
```

---

### Task 2: Kiểm tra và Xác minh cuối cùng

**Files:**
- N/A

- [ ] **Step 1: Chạy linter**
Run: `npm run lint`

- [ ] **Step 2: Chạy build**
Run: `npm run build`
