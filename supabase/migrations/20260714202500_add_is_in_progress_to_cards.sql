-- Add is_in_progress column and check constraint
ALTER TABLE public.cards ADD COLUMN is_in_progress BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.cards ADD CONSTRAINT cards_status_exclusive_check CHECK (NOT (is_completed AND is_in_progress));
