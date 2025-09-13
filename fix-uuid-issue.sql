-- Fix UUID vs String ID issue for Google OAuth
-- Run this in your Supabase SQL Editor

-- Step 1: Update users table to use TEXT for id instead of UUID
ALTER TABLE public.users DROP CONSTRAINT users_pkey;
ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
ALTER TABLE public.users ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.users ADD PRIMARY KEY (id);

-- Step 2: Update all foreign key references to use TEXT
ALTER TABLE public.workspaces ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE public.workspace_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.workspace_members ALTER COLUMN invited_by TYPE TEXT;
ALTER TABLE public.projects ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE public.project_members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.tasks ALTER COLUMN assigned_to TYPE TEXT;
ALTER TABLE public.tasks ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.task_comments ALTER COLUMN created_by TYPE TEXT;

-- Step 3: Recreate foreign key constraints with TEXT
ALTER TABLE public.workspaces 
ADD CONSTRAINT workspaces_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members 
ADD CONSTRAINT workspace_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members 
ADD CONSTRAINT workspace_members_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.users(id);

ALTER TABLE public.projects 
ADD CONSTRAINT projects_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.project_members 
ADD CONSTRAINT project_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.users(id);

ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE public.task_comments 
ADD CONSTRAINT task_comments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Step 4: Update RLS policies to use TEXT comparison
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
CREATE POLICY "Users can view their workspaces"
ON workspaces FOR SELECT
USING (owner_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects"
ON projects FOR SELECT
USING (
  workspace_id IN (
    SELECT id 
    FROM workspaces 
    WHERE owner_id = auth.uid()::text
  )
);