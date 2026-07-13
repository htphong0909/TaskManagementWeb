-- Thêm cột position vào bảng boards để hỗ trợ sắp xếp thứ tự
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS position FLOAT;

-- Khởi tạo vị trí mặc định dựa trên thời gian tạo của board
UPDATE public.boards SET position = EXTRACT(EPOCH FROM created_at) WHERE position IS NULL;
