-- Check if all required tables exist for the task system
-- Run this in your Supabase SQL editor to verify table structure

-- Check if tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('projects', 'tasks', 'task_statuses', 'users', 'workspaces', 'project_members')
ORDER BY tablename;

-- Check task table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Check task_statuses table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'task_statuses'
ORDER BY ordinal_position;

-- Check if foreign key relationships exist
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'tasks';

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  order_index INTEGER NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status_id UUID NOT NULL REFERENCES task_statuses(id) ON DELETE RESTRICT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default task statuses for existing projects that don't have them
INSERT INTO task_statuses (name, color, order_index, project_id)
SELECT 'To Do', '#ef4444', 0, p.id
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.project_id = p.id)
UNION ALL
SELECT 'In Progress', '#f59e0b', 1, p.id
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.project_id = p.id)
UNION ALL
SELECT 'Review', '#8b5cf6', 2, p.id
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.project_id = p.id)
UNION ALL
SELECT 'Done', '#10b981', 3, p.id
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.project_id = p.id);

-- Enable RLS on new tables
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_statuses
CREATE POLICY "Users can view task statuses in their workspace projects" ON task_statuses FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage task statuses in projects they own" ON task_statuses FOR ALL USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.owner_id = auth.uid()
  )
);

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks in their workspace projects" ON tasks FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage tasks in their workspace projects" ON tasks FOR ALL USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);