-- 1. Thêm cột board_date kiểu TIMESTAMP WITH TIME ZONE (cho phép tạm thời NULL để copy dữ liệu)
ALTER TABLE public.boards ADD COLUMN board_date TIMESTAMP WITH TIME ZONE;

-- 2. Sao chép dữ liệu từ created_at sang board_date cho các board đã tồn tại
UPDATE public.boards SET board_date = created_at WHERE board_date IS NULL;

-- 3. Thiết lập thuộc tính NOT NULL và DEFAULT cho board_date
ALTER TABLE public.boards ALTER COLUMN board_date SET NOT NULL;
ALTER TABLE public.boards ALTER COLUMN board_date SET DEFAULT timezone('utc'::text, now());
