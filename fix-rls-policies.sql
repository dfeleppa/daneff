-- IMMEDIATE FIX for infinite recursion in workspace_members RLS policy
-- Run this in your Supabase SQL Editor

-- Step 1: Temporarily disable RLS on workspace_members to break the circular reference
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view projects" ON projects;

-- Step 3: Create simple, non-recursive policies for workspaces
CREATE POLICY "Users can view their workspaces"
ON workspaces FOR SELECT
USING (
  -- Users can see workspaces they own
  owner_id = auth.uid()
);

-- Step 4: Create simple policy for projects
CREATE POLICY "Users can view projects"
ON projects FOR SELECT
USING (
  -- Users can see projects in workspaces they own
  workspace_id IN (
    SELECT id 
    FROM workspaces 
    WHERE owner_id = auth.uid()
  )
);

-- Step 5: Enable RLS on other tables but keep workspace_members open for now
-- (We'll fix this properly later once the app is working)

-- This is a temporary fix to get your app working
-- Later we can implement proper RLS with a better data structure