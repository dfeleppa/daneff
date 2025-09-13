-- Add due_date column to projects table
-- Run this in your Supabase SQL editor if the column doesn't exist

DO $$
BEGIN
    -- Check if the column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'due_date'
    ) THEN
        ALTER TABLE projects ADD COLUMN due_date DATE;
        
        -- Add comment
        COMMENT ON COLUMN projects.due_date IS 'Optional due date for the project';
        
        RAISE NOTICE 'due_date column added to projects table';
    ELSE
        RAISE NOTICE 'due_date column already exists in projects table';
    END IF;
END
$$;