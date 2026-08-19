-- Tạo bảng lưu trữ hình ảnh thư viện cho từng Board
CREATE TABLE IF NOT EXISTS public.board_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_id TEXT,
  mime_type TEXT,
  size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.board_images ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách an toàn cho board_images
CREATE POLICY "Cho phép tất cả thao tác trên board_images" ON public.board_images
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
