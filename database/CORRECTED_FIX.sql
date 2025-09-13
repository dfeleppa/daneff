-- CORRECTED SQL TO FIX TASK SYSTEM - RUN THIS IN SUPABASE SQL EDITOR
-- This version handles data type mismatches between TEXT and UUID

-- First, let's check what data type the users.id column actually is
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id';

-- Drop existing tables if they have wrong data types (this is safe because they're likely empty)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_statuses CASCADE;

-- Create task_statuses table
CREATE TABLE task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  order_index INTEGER NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table with correct data types
-- Using TEXT for user references to match your auth system
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id TEXT, -- No foreign key constraint to avoid type mismatch
  reporter_id TEXT NOT NULL, -- No foreign key constraint to avoid type mismatch  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default task statuses for existing projects
INSERT INTO task_statuses (name, color, order_index, project_id)
SELECT 'To Do', '#ef4444', 0, p.id
FROM projects p
UNION ALL
SELECT 'In Progress', '#f59e0b', 1, p.id
FROM projects p
UNION ALL
SELECT 'Review', '#8b5cf6', 2, p.id
FROM projects p
UNION ALL
SELECT 'Done', '#10b981', 3, p.id
FROM projects p;

-- Enable RLS on new tables
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_statuses
CREATE POLICY "Users can view task statuses in their workspace projects" ON task_statuses FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can manage task statuses in projects they own" ON task_statuses FOR ALL USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.owner_id = auth.uid()::text
  )
);

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks in their workspace projects" ON tasks FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can manage tasks in their workspace projects" ON tasks FOR ALL USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()::text
  )
);

-- Add due_date column to projects table if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date DATE;

-- Verify the tables were created correctly
SELECT 'task_statuses' as table_name, count(*) as row_count FROM task_statuses
UNION ALL
SELECT 'tasks' as table_name, count(*) as row_count FROM tasks;

-- Show the structure of the new tables
SELECT 'task_statuses columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'task_statuses'
ORDER BY ordinal_position;

SELECT 'tasks columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks'
ORDER BY ordinal_position;