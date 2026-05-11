-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This adds an attachments column to the comments table to store file metadata.

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Ensure the issue-attachments bucket exists (usually it does by now)
-- You may need to ensure your RLS policies for storage allow 'comments/' prefix
