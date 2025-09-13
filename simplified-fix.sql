-- SIMPLIFIED IMMEDIATE FIX - Only for existing tables
-- Run this in Supabase SQL Editor

-- Step 1: Check which tables exist and disable RLS on them
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;  
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Try to disable RLS on other tables if they exist (ignore errors if they don't)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE task_statuses DISABLE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
END $$;

-- Step 2: Change ID columns to TEXT for core tables
-- Users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Workspaces table
ALTER TABLE workspaces ALTER COLUMN owner_id TYPE TEXT;

-- Workspace members table  
ALTER TABLE workspace_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE workspace_members ALTER COLUMN invited_by TYPE TEXT;

-- Projects table
ALTER TABLE projects ALTER COLUMN owner_id TYPE TEXT;

-- Try to update other tables if they exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE project_members ALTER COLUMN user_id TYPE TEXT;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE tasks ALTER COLUMN assigned_to TYPE TEXT;
        ALTER TABLE tasks ALTER COLUMN created_by TYPE TEXT;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE task_comments ALTER COLUMN created_by TYPE TEXT;
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
END $$;