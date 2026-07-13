-- Add is_completed to cards table
ALTER TABLE cards ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE;
