-- 1. Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    position FLOAT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own folders" 
ON public.folders FOR ALL USING (auth.uid() = user_id);

-- 2. Add folder_id to boards table
ALTER TABLE public.boards ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
