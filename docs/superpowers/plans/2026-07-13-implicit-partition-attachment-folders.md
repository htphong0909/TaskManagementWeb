# Implicit Partition Attachment Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi quản lý tệp đính kèm sang cơ chế "vách ngăn" (divider) dựa trên vị trí (position) hợp nhất, loại bỏ dropdown chọn thư mục và container "Chưa phân loại" trong cả CardDetailModal và CardPopover.

**Architecture:** Gộp chung `attachments` và `attachment_folders` thành mảng `merged` sắp xếp theo `position` tăng dần. File nằm trên thư mục đầu tiên ở ngoài (Top). File dưới thư mục i (trước thư mục i+1) thuộc thư mục i. Các nút di chuyển ↑ / ↓ sẽ trực tiếp hoán đổi `position` giữa hai phần tử liền kề trong danh sách hợp nhất `merged`.

**Tech Stack:** React (Next.js), Supabase Client, Tailwind CSS.

## Global Constraints
- Cột `position` kiểu `FLOAT` của bảng `attachments` và `attachment_folders` là cột quyết định thứ tự.
- Giao diện không sử dụng dropdown chọn thư mục.
- Tệp đính kèm hiển thị phẳng ở trên cùng nếu nó nằm trước thư mục đầu tiên.
- Các bài kiểm thử tự động, lint, build Next.js phải hoàn thành thành công không có lỗi.

---

### Task 1: Nâng Cấp CardDetailModal ([CardDetailModal.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardDetailModal.tsx))

**Files:**
- Modify: `src/components/CardDetailModal.tsx`

**Interfaces:**
- Produces: Trạng thái hiển thị tệp đính kèm phân nhóm động bằng vách ngăn và cơ chế di chuyển lên/xuống hợp nhất.

- [ ] **Step 1: Cập nhật hàm fetch dữ liệu tệp và thư mục**

  Cập nhật `fetchCardData` để sắp xếp dữ liệu `attachments` và `attachment_folders` theo `position` tăng dần:
  ```typescript
  // Đoạn code nạp dữ liệu:
  const { data: atts } = await supabase
    .from("attachments")
    .select("*")
    .eq("card_id", cardId)
    .order("position", { ascending: true });

  const { data: flds } = await supabase
    .from("attachment_folders")
    .select("*")
    .eq("card_id", cardId)
    .order("position", { ascending: true });
  ```

- [ ] **Step 2: Thực hiện logic trộn mảng và phân nhóm động**

  Tại phần render hoặc ngay sau khi set state, xây dựng logic tính toán `merged`, `topFiles` và `folderGroups`:
  ```typescript
  const merged = [
    ...attachments.map(a => ({ ...a, itemType: "file" as const })),
    ...folders.map(f => ({ ...f, itemType: "folder" as const }))
  ].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    if (a.itemType !== b.itemType) {
      return a.itemType === "folder" ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });

  const topFiles: Attachment[] = [];
  const folderGroups: { folder: AttachmentFolder; files: Attachment[] }[] = [];
  let currentGroup: { folder: AttachmentFolder; files: Attachment[] } | null = null;

  merged.forEach((item) => {
    if (item.itemType === "folder") {
      currentGroup = { folder: item as AttachmentFolder, files: [] };
      folderGroups.push(currentGroup);
    } else {
      const file = item as Attachment;
      if (currentGroup === null) {
        topFiles.push(file);
      } else {
        currentGroup.files.push(file);
      }
    }
  });
  ```

- [ ] **Step 3: Cập nhật logic khi upload file mới và tạo thư mục mới**

  Đảm bảo phần tử mới tạo được xếp ở dưới cùng danh sách hợp nhất `merged`.
  ```typescript
  // Khi tạo thư mục mới (handleCreateFolder):
  const nextPos = merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0;
  
  // Khi upload file mới (handleFileAttach & handleImageAttach):
  const nextPos = merged.length > 0 ? merged[merged.length - 1].position + 1.0 : 1.0;
  ```

- [ ] **Step 4: Hiện thực hóa logic di chuyển lên/xuống hợp nhất (handleMoveItem)**

  Tạo hàm di chuyển chung cho cả tệp tin và thư mục dựa trên việc hoán đổi vị trí trong danh sách hợp nhất `merged`:
  ```typescript
  const handleMoveItem = async (itemId: string, itemType: "file" | "folder", direction: "up" | "down") => {
    const idx = merged.findIndex((x) => x.id === itemId && x.itemType === itemType);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= merged.length) return;

    const itemA = merged[idx];
    const itemB = merged[targetIdx];

    const posA = itemA.position;
    const posB = itemB.position;

    let newPosA = posB;
    let newPosB = posA;

    if (posA === posB) {
      newPosA = posA - 0.5;
      newPosB = posB + 0.5;
    }

    try {
      const updateA = supabase
        .from(itemA.itemType === "file" ? "attachments" : "attachment_folders")
        .update({ position: newPosA })
        .eq("id", itemA.id);

      const updateB = supabase
        .from(itemB.itemType === "file" ? "attachments" : "attachment_folders")
        .update({ position: newPosB })
        .eq("id", itemB.id);

      await Promise.all([updateA, updateB]);
      fetchCardData();
    } catch (err) {
      console.error("Lỗi hoán đổi vị trí:", err);
    }
  };
  ```

- [ ] **Step 5: Cập nhật JSX Layout trong CardDetailModal.tsx**

  - Gỡ bỏ hoàn toàn dropdown `<select>` chuyển thư mục và nhóm "Chưa phân loại" (`📁 Chưa phân loại`).
  - Render danh sách `topFiles` phẳng ở trên cùng.
  - Render danh sách `folderGroups`. Cập nhật nút bấm di chuyển `↑` và `↓` trên file và thư mục để gọi hàm `handleMoveItem` chung.
  - Ẩn nút `↑` trên phần tử đầu tiên của mảng `merged` và nút `↓` trên phần tử cuối cùng của mảng `merged`.

---

### Task 2: Nâng Cấp CardPopover ([CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb\my-task-app/src/components/CardPopover.tsx))

**Files:**
- Modify: `src/components/CardPopover.tsx`

**Interfaces:**
- Produces: Trạng thái hiển thị tệp đính kèm phân nhóm động bằng vách ngăn và cơ chế di chuyển lên/xuống hợp nhất trên Popover.

- [ ] **Step 1: Áp dụng logic fetch dữ liệu, trộn mảng và phân nhóm động**

  Áp dụng hoàn toàn tương tự logic ở Task 1 sang [CardPopover.tsx](file:///c:/WORKSPACE/TaskManagementWeb/my-task-app/src/components/CardPopover.tsx).

- [ ] **Step 2: Hiện thực hóa hàm di chuyển chung handleMoveItem**

  Viết hàm `handleMoveItem` để hoán đổi vị trí `position` trong database Supabase của các adjacent items trong `merged`.

- [ ] **Step 3: Cập nhật JSX Layout và renderAttachmentCard**

  - Gỡ bỏ dropdown `<select>` chọn thư mục trong `renderAttachmentCard`.
  - Hiển thị phẳng `topFiles` và hiển thị `folderGroups` làm vách ngăn.
  - Đảm bảo nút di chuyển gọi hàm `handleMoveItem` đúng cách.

---

### Task 3: Xác Minh và Hoàn Tất (Verification & Cleanup)

- [ ] **Step 1: Chạy build và kiểm tra lint**

  Run: `npm run lint` và `npm run build`
  Expected: Không lỗi compile hay linting warnings.

- [ ] **Step 2: Chạy unit tests**

  Run: `npm run test`
  Expected: Toàn bộ test cases hoạt động bình thường.
