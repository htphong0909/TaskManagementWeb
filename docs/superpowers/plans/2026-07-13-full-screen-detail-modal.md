# Full Screen Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay đổi kích thước của CardDetailModal thành gần như toàn màn hình (rộng 96vw, cao 92vh, tối đa 1600px).

**Architecture:** Cập nhật các class Tailwind CSS của thẻ div Modal trong component [CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx).

**Tech Stack:** Next.js (React 19), Tailwind CSS v4, TypeScript

## Global Constraints

- TypeScript 100% không sinh lỗi compile.

---

### Task 1: Cập nhật kích thước Modal trong CardDetailModal.tsx

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

- [ ] **Step 1: Thay thế các class width và height của Modal container**

Sửa đổi dòng định nghĩa class của div bao ngoài modal (dưới các input file ẩn):

```tsx
      <div className="bg-white border border-slate-200/80 rounded-2xl w-[96vw] h-[92vh] max-w-[1600px] shadow-2xl overflow-hidden flex flex-col">
```

- [ ] **Step 2: Chạy kiểm tra lint và build tại local**

Đảm bảo dự án vẫn build thành công.
Chạy command:
```powershell
npm run lint
npm run build
```

- [ ] **Step 3: Commit và push thay đổi**

```bash
git add src/components/CardDetailModal.tsx
git commit -m "style: change CardDetailModal layout to almost full screen (96vw, 92vh)"
git push
```
