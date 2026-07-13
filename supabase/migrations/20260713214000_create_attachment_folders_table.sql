-- Tạo bảng attachment_folders lưu các thư mục phân loại tệp đính kèm
CREATE TABLE IF NOT EXISTS public.attachment_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bật Row Level Security (RLS) cho attachment_folders
ALTER TABLE public.attachment_folders ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách an toàn cho attachment_folders
CREATE POLICY "Cho phép tất cả thao tác trên attachment_folders" ON public.attachment_folders
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Bổ sung trường folder_id và position vào bảng attachments
ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.attachment_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position FLOAT DEFAULT 0;
