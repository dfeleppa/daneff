import { createClient } from '@supabase/supabase-js'

// Create a non-typed client to avoid deployment issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Use flexible interfaces instead of strict database types
interface Project {
  id: string
  name: string
  description: string | null
  color: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  workspace_id: string
  owner_id: string
  due_date?: string | null
  created_at: string
  updated_at: string
}

interface Task {
  id: string
  title: string
  description: string | null
  status_id: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  project_id: string
  assignee_id: string | null
  reporter_id: string
  created_at: string
  updated_at: string
  assignee?: {
    id: string
    name: string
    avatar_url: string | null
  }
  status?: {
    id: string
    name: string
    color: string
    order_index: number
  }
}

// Get all projects for a workspace
export async function getProjects(workspaceId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:users!projects_owner_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      project_members (
        user_id,
        role,
        users (
          id,
          name,
          email,
          avatar_url
        )
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return { projects: [], error }
  }

  const projects = data.map((project: any) => ({
    ...project,
    members: project.project_members.map((pm: any) => ({
      ...pm.users,
      role: pm.role,
    }))
  }))

  return { projects, error: null }
}

// Create a new project
export async function createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return { project: null, error }
  }

  // Add creator as admin
  if (projectData.owner_id) {
    await supabase
      .from('project_members')
      .insert({
        project_id: data.id,
        user_id: projectData.owner_id,
        role: 'admin',
      })

    // Create default task statuses
    const defaultStatuses = [
      { name: 'To Do', color: '#6b7280', order_index: 0 },
      { name: 'In Progress', color: '#3b82f6', order_index: 1 },
      { name: 'Review', color: '#f59e0b', order_index: 2 },
      { name: 'Done', color: '#10b981', order_index: 3 },
    ]

    await supabase
      .from('task_statuses')
      .insert(
        defaultStatuses.map(status => ({
          ...status,
          project_id: data.id,
        }))
      )
  }

  return { project: data, error: null }
}

// Update a project
export async function updateProject(projectId: string, updates: any) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select(`
      *,
      owner:users!projects_owner_id_fkey (
        id,
        name,
        email,
        avatar_url
      )
    `)
    .single()

  if (error) {
    console.error('Error updating project:', error)
    return { project: null, error }
  }

  return { project: data, error: null }
}

// Delete a project
export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    return { success: false, error }
  }

  return { success: true, error: null }
}

// Get project tasks
export async function getProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      creator:users!tasks_creator_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      status:task_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        order_index
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    return { tasks: [], error }
  }

  return { tasks: data, error: null }
}

// Get task statuses for a project
export async function getTaskStatuses(projectId: string) {
  const { data, error } = await supabase
    .from('task_statuses')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index')

  if (error) {
    console.error('Error fetching task statuses:', error)
    return { statuses: [], error }
  }

  return { statuses: data, error: null }
}

// Create a new task
export async function createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'assignee' | 'status'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      creator:users!tasks_creator_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      status:task_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        order_index
      )
    `)
    .single()

  if (error) {
    console.error('Error creating task:', error)
    return { task: null, error }
  }

  return { task: data, error: null }
}

// Update a task
export async function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'assignee' | 'status'>>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      assignee:users!tasks_assignee_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      creator:users!tasks_creator_id_fkey (
        id,
        name,
        email,
        avatar_url
      ),
      status:task_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        order_index
      )
    `)
    .single()

  if (error) {
    console.error('Error updating task:', error)
    return { task: null, error }
  }

  return { task: data, error: null }
}

// Delete a task
export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    return { success: false, error }
  }

  return { success: true, error: null }
}