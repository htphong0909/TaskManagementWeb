-- Tạo bảng attachments lưu tệp đính kèm của thẻ
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_id TEXT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách an toàn cho attachments
CREATE POLICY "Cho phép tất cả thao tác trên attachments" ON public.attachments
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
