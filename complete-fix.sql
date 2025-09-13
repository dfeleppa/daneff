-- COMPLETE FIX - Drop foreign keys, change types, recreate constraints
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS on all tables first
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;  
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Try other tables that might exist
DO $$ 
BEGIN
    BEGIN ALTER TABLE project_members DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE tasks DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE comments DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE attachments DISABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- Step 2: Drop all foreign key constraints
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_invited_by_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;

-- Drop constraints from other tables that might exist
DO $$ 
BEGIN
    BEGIN ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reporter_id_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- Step 3: Now drop the primary key and change types
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Step 4: Change all foreign key columns to TEXT
ALTER TABLE workspaces ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE workspace_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE workspace_members ALTER COLUMN invited_by TYPE TEXT;
ALTER TABLE projects ALTER COLUMN owner_id TYPE TEXT;

-- Change other table columns if they exist
DO $$ 
BEGIN
    BEGIN ALTER TABLE project_members ALTER COLUMN user_id TYPE TEXT; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN 
        ALTER TABLE tasks ALTER COLUMN assignee_id TYPE TEXT; 
        ALTER TABLE tasks ALTER COLUMN reporter_id TYPE TEXT;
        ALTER TABLE tasks ALTER COLUMN assigned_to TYPE TEXT;
        ALTER TABLE tasks ALTER COLUMN created_by TYPE TEXT;
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE comments ALTER COLUMN author_id TYPE TEXT; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN ALTER TABLE attachments ALTER COLUMN uploaded_by TYPE TEXT; EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- Step 5: Recreate foreign key constraints
ALTER TABLE workspaces ADD CONSTRAINT workspaces_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES users(id);

ALTER TABLE projects ADD CONSTRAINT projects_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate constraints for other tables if they exist
DO $$ 
BEGIN
    BEGIN 
        ALTER TABLE project_members ADD CONSTRAINT project_members_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION WHEN undefined_table THEN NULL; END;
    
    BEGIN 
        ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey 
            FOREIGN KEY (assignee_id) REFERENCES users(id);
        ALTER TABLE tasks ADD CONSTRAINT tasks_reporter_id_fkey 
            FOREIGN KEY (reporter_id) REFERENCES users(id);
    EXCEPTION WHEN undefined_table THEN NULL; END;
    
    BEGIN 
        ALTER TABLE comments ADD CONSTRAINT comments_author_id_fkey 
            FOREIGN KEY (author_id) REFERENCES users(id);
    EXCEPTION WHEN undefined_table THEN NULL; END;
    
    BEGIN 
        ALTER TABLE attachments ADD CONSTRAINT attachments_uploaded_by_fkey 
            FOREIGN KEY (uploaded_by) REFERENCES users(id);
    EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;