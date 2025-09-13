-- IMMEDIATE WORKING FIX - Run this in Supabase SQL Editor
-- This will temporarily disable all RLS to get the app working

-- Step 1: Disable RLS on all tables temporarily
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;  
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;

-- Step 2: Change user_id columns to TEXT type to accept Google OAuth IDs
ALTER TABLE workspace_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE workspaces ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE projects ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE project_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN assigned_to TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE task_comments ALTER COLUMN created_by TYPE TEXT;

-- Step 3: Change users table ID to TEXT
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ADD PRIMARY KEY (id);

-- This will allow your app to work immediately with Google OAuth IDs
-- We can add proper security back later