# Spec: Next.js Layout Refactoring for Persistent Board Switcher

Tài liệu này đặc tả thiết kế tái cấu trúc các file trong thư mục `/board` sang mô hình Shared Layout của Next.js, nhằm giữ trạng thái nạp dữ liệu của thanh Switcher dưới đáy không bị unmount hay tải lại giữa các lần chuyển đổi Board.

## 1. Cấu trúc Thư mục & Routing

Tái cấu trúc thư mục `/board` như sau:
```
src/app/board/
├── layout.tsx         # [NEW] Shared Layout: Nơi chứa khung nền, kiểm tra Auth và BoardSwitcher
└── [id]/
    └── page.tsx       # [MODIFY] Leaf Page: Chỉ hiển thị nội dung Kanban (Lists & Cards)
```

---

## 2. Shared Layout (`src/app/board/layout.tsx`)

### Trách nhiệm:
- **Xác thực người dùng:** Kiểm tra trạng thái đăng nhập qua Supabase. Nếu chưa đăng nhập, tự động chuyển hướng về `/`.
- **Hiển thị khung nền:** Vẽ nền gradient pastel và các vòng tròn phát sáng mờ.
- **Thanh Switcher cố định:** Render `BoardSwitcher` dưới đáy chiếm 8% chiều cao màn hình (`h-[8%]`).
  - Lấy `activeBoardId` bằng cách lắng nghe đường dẫn URL qua hook `usePathname()`.
- **Container trang con:** Render `{children}` chiếm 92% chiều cao màn hình (`h-[92%]`).

---

## 3. Leaf Page (`src/app/board/[id]/page.tsx`)

### Trách nhiệm:
- **Tải dữ liệu Board chi tiết:** Tải danh sách lists và cards cho `boardId` cụ thể từ Supabase.
- **Hiển thị Kanban Board:** Bố cục flex row, cuộn ngang tự do, hiển thị cột và thẻ công việc tĩnh.
- **Tải ngầm (Background Fetching):** Thay đổi `boardId` chỉ kích hoạt trạng thái `isFetching` làm mờ 60% cột cũ và hiện progress bar, nội dung các cột được tráo đổi mượt mà ngay khi tải xong.
- **Popup xem chi tiết:** Quản lý hovered card state để hiển thị `CardPopover`.
- **Lưu ý:** Không chứa bất kỳ wrapper nền nào, không chứa logic Auth, và không chứa `BoardSwitcher`.
