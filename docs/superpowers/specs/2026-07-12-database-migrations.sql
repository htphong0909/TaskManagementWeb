-- 1. Tạo bảng boards
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    background TEXT DEFAULT 'from-[#fff5f5] via-[#f3f0ff] to-[#e6f0fa]',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own boards" 
ON public.boards 
FOR ALL 
USING (auth.uid() = user_id);

-- 2. Tạo bảng lists (Cột)
CREATE TABLE IF NOT EXISTS public.lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho lists
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage lists of their own boards" 
ON public.lists 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.boards 
        WHERE boards.id = lists.board_id AND boards.user_id = auth.uid()
    )
);

-- 3. Tạo bảng cards (Thẻ)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    position FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS cho cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cards of their own lists" 
ON public.cards 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.lists
        JOIN public.boards ON boards.id = lists.board_id
        WHERE lists.id = cards.list_id AND boards.user_id = auth.uid()
    )
);
