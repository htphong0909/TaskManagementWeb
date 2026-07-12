# Thiết kế: Cơ chế Kéo thả không giật lắc (Jitter-free Drag and Drop)

Tài liệu này đặc tả nguyên nhân và giải pháp kỹ thuật sửa lỗi giật lắc (flickering/jitter) khi kéo thẻ từ trên xuống dưới trong giao diện Kanban.

---

## 1. Phân tích nguyên nhân gốc rễ (Root Cause)

Khi kéo thẻ theo hướng **từ trên xuống dưới (downward)**, con trỏ chuột sẽ đi vào thẻ mục tiêu (Target Card) từ cạnh trên của nó. 

1. Ngay khi con trỏ chuột đi qua viền trên của Thẻ mục tiêu, sự kiện `onDragOver` được kích hoạt và gán `isDragOver = true`.
2. Giao diện áp dụng class `border-t-4 border-t-violet-500 pt-1` để tạo đường kẻ chỉ định vị trí thả.
3. Việc tăng thêm viền trên `border-t-4` (4px) làm thay đổi kích thước/vị trí của Thẻ mục tiêu, **đẩy toàn bộ thẻ này dịch xuống phía dưới**.
4. Vì Thẻ mục tiêu bị dịch xuống phía dưới, con trỏ chuột (đang đứng yên hoặc di chuyển chậm) bỗng nhiên nằm **ngoài** phạm vi của thẻ mục tiêu.
5. Sự kiện `onDragLeave` lập tức bị kích hoạt, gán `isDragOver = false`.
6. Đường kẻ `border-t-4` bị loại bỏ, thẻ mục tiêu co lại và **nhảy ngược trở lại vị trí ban đầu**.
7. Khi nhảy ngược lại, con trỏ chuột lại lọt vào trong thẻ, kích hoạt `onDragOver` -> Lặp lại bước 1.

Vòng lặp vô hạn này (Infinite layout shift loop) tạo ra hiện tượng giật lắc màn hình cực kỳ khó kéo thả từ trên xuống dưới.

---

## 2. Giải pháp khắc phục (Jitter-free Solution)

Để loại bỏ hoàn toàn việc dịch chuyển layout (layout shift) gây giật lắc, chúng ta thay đổi cách hiển thị đường kẻ chỉ thị vị trí thả bằng cách sử dụng **Absolute Positioning**:

- **Không thay đổi kích thước thẻ:** Loại bỏ thuộc tính `border-t-4` và `pt-1` trên class chính của Thẻ. Thay vào đó, chỉ thay đổi màu viền và màu nền của thẻ (`border-violet-400 bg-violet-50/20`) - các thuộc tính này không làm thay đổi chiều cao hay dịch chuyển phần tử.
- **Vẽ đường chỉ thị bằng Absolute Div:** Thêm một thẻ `div` tuyệt đối (`absolute`) nằm đè lên trên cùng của thẻ mục tiêu:
  ```tsx
  {isDragOver && (
    <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500 rounded-t-xl pointer-events-none" />
  )}
  ```
  Thẻ div này có thuộc tính `pointer-events-none` để tránh chặn các sự kiện chuột và `absolute` để không chiếm không gian trong luồng tài liệu (document flow), đảm bảo **chiều cao thẻ hoàn toàn giữ nguyên**.
