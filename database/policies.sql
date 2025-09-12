-- Row Level Security (RLS) Policies
-- Run this AFTER creating the schema

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Users can view workspaces they're members of" ON public.workspaces
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id = id
    )
  );

CREATE POLICY "Workspace owners can update their workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Workspace members policies
CREATE POLICY "Users can view workspace members for their workspaces" ON public.workspace_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members wm2
      WHERE wm2.workspace_id = workspace_id
    )
  );

CREATE POLICY "Workspace admins can manage members" ON public.workspace_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id = workspace_members.workspace_id 
      AND role = 'admin'
    )
    OR
    auth.uid() IN (
      SELECT owner_id FROM public.workspaces
      WHERE id = workspace_members.workspace_id
    )
  );

-- Projects policies
CREATE POLICY "Users can view projects in their workspaces" ON public.projects
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id = projects.workspace_id
    )
  );

CREATE POLICY "Workspace members can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id = projects.workspace_id
    )
  );

CREATE POLICY "Project owners can update their projects" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

-- Project members policies
CREATE POLICY "Users can view project members for accessible projects" ON public.project_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = project_members.project_id
      )
    )
  );

-- Task statuses policies
CREATE POLICY "Users can view task statuses for accessible projects" ON public.task_statuses
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = task_statuses.project_id
      )
    )
  );

CREATE POLICY "Project members can manage task statuses" ON public.task_statuses
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = task_statuses.project_id
      )
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks in accessible projects" ON public.tasks
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = tasks.project_id
      )
    )
  );

CREATE POLICY "Project members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = tasks.project_id
      )
    )
  );

CREATE POLICY "Task reporters and assignees can update tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = reporter_id 
    OR auth.uid() = assignee_id
    OR auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = tasks.project_id
      )
      AND role = 'admin'
    )
  );

-- Task tags policies
CREATE POLICY "Users can view task tags for accessible projects" ON public.task_tags
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id = task_tags.project_id
      )
    )
  );

-- Task tag assignments policies
CREATE POLICY "Users can view task tag assignments for accessible tasks" ON public.task_tag_assignments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = task_tag_assignments.task_id
        )
      )
    )
  );

-- Subtasks policies
CREATE POLICY "Users can view subtasks for accessible tasks" ON public.subtasks
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = subtasks.task_id
        )
      )
    )
  );

CREATE POLICY "Project members can manage subtasks" ON public.subtasks
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = subtasks.task_id
        )
      )
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments for accessible tasks" ON public.comments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = comments.task_id
        )
      )
    )
  );

CREATE POLICY "Project members can create comments" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = comments.task_id
        )
      )
    )
  );

CREATE POLICY "Comment authors can update their comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Attachments policies
CREATE POLICY "Users can view attachments for accessible tasks" ON public.attachments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = attachments.task_id
        )
      )
    )
  );

CREATE POLICY "Project members can upload attachments" ON public.attachments
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.projects
        WHERE id IN (
          SELECT project_id FROM public.tasks
          WHERE id = attachments.task_id
        )
      )
    )
  );