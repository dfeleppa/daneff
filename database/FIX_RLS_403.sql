-- SIMPLIFIED RLS POLICIES TO FIX 403 ERRORS
-- Run this in Supabase SQL Editor to fix permission issues

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view task statuses in their workspace projects" ON task_statuses;
DROP POLICY IF EXISTS "Users can manage task statuses in projects they own" ON task_statuses;
DROP POLICY IF EXISTS "Users can view tasks in their workspace projects" ON tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their workspace projects" ON tasks;

-- Create simpler policies that allow access to project owners
-- Policy for task_statuses: Allow access if user owns the project
CREATE POLICY "Allow access to task statuses for project owners" ON task_statuses FOR ALL USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.owner_id = auth.uid()::text
  )
);

-- Policy for tasks: Allow access if user owns the project
CREATE POLICY "Allow access to tasks for project owners" ON tasks FOR ALL USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.owner_id = auth.uid()::text
  )
);

-- Also create a fallback policy for SELECT operations (less restrictive)
CREATE POLICY "Allow viewing task statuses in accessible projects" ON task_statuses FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = p.workspace_id 
      AND wm.user_id = auth.uid()::text
    )
  )
);

CREATE POLICY "Allow viewing tasks in accessible projects" ON tasks FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = p.workspace_id 
      AND wm.user_id = auth.uid()::text
    )
  )
);

-- Test the policies by checking if we can see data
SELECT 'Testing access to task_statuses...' as test;
SELECT COUNT(*) as task_status_count FROM task_statuses;

SELECT 'Testing access to tasks...' as test;
SELECT COUNT(*) as task_count FROM tasks;

-- Show current auth user ID for debugging
SELECT 'Current auth user ID:' as debug, auth.uid()::text as user_id;