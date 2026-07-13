-- Thêm các cột lưu trữ Chi tiết, Key Info và Stakeholders vào bảng cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS key_info TEXT;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS stakeholders JSONB DEFAULT '[]'::jsonb NOT NULL;
