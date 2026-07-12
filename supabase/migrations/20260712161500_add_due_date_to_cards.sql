-- Thêm cột due_date cho bảng cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
