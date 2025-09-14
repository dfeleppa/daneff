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
  parent_task_id?: string | null
  completion_percentage?: number
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
  sub_tasks?: Task[]
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
  console.log('Creating project with data:', projectData)
  console.log('Supabase client status:', !!supabase)
  
  // Validate required fields
  if (!projectData.name || !projectData.workspace_id || !projectData.owner_id) {
    const error = new Error('Missing required fields: name, workspace_id, or owner_id')
    console.error('Validation error:', error)
    return { project: null, error }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        color: projectData.color || '#3b82f6',
        status: projectData.status || 'active',
        workspace_id: projectData.workspace_id,
        owner_id: projectData.owner_id,
        due_date: projectData.due_date,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return { project: null, error }
    }

    console.log('✅ Project created successfully:', data)

    // Add creator as admin
    if (projectData.owner_id) {
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: data.id,
          user_id: projectData.owner_id,
          role: 'admin',
        })

      if (memberError) {
        console.warn('Warning: Failed to add user as project admin:', memberError)
        // Don't fail the entire operation for this
      }
    }

    return { project: data, error: null }
  } catch (error: any) {
    console.error('Exception in createProject:', error)
    return { project: null, error }
  }
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

// Get project tasks with sub-tasks
export async function getProjectTasks(projectId: string) {
  console.log('Fetching tasks for project:', projectId)
  
  try {
    // Get all tasks for the project
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return { tasks: [], error: tasksError }
    }

    // Get task statuses separately
    const { data: statusesData, error: statusesError } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', projectId)

    if (statusesError) {
      console.error('Error fetching task statuses:', statusesError)
      return { tasks: [], error: statusesError }
    }

    // Create status lookup
    const statusLookup = new Map(statusesData?.map(s => [s.id, s]) || [])

    // Convert all tasks to individual cards (both parent and sub-tasks)
    const allTasks: Task[] = []

    // First, create all task objects
    for (const taskData of tasksData || []) {
      const status = statusLookup.get(taskData.status_id)
      const task: Task = {
        ...taskData,
        status: status ? {
          id: status.id,
          name: status.name,
          color: status.color,
          order_index: status.order_index
        } : null,
        sub_tasks: []
      }
      allTasks.push(task)
    }

    // Calculate sub-task counts for parent tasks
    const parentTaskCounts = new Map()
    allTasks.forEach(task => {
      if (task.parent_task_id) {
        const count = parentTaskCounts.get(task.parent_task_id) || 0
        parentTaskCounts.set(task.parent_task_id, count + 1)
      }
    })

    // Add sub-task count to parent tasks
    allTasks.forEach(task => {
      if (!task.parent_task_id) {
        const subTaskCount = parentTaskCounts.get(task.id) || 0
        task.sub_tasks = Array(subTaskCount).fill(null) // Just for count display
      }
    })

    // Sort tasks so parent tasks appear before their sub-tasks
    const sortedTasks = allTasks.sort((a, b) => {
      // If both tasks have no parent, sort by created_at (newest first)
      if (!a.parent_task_id && !b.parent_task_id) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      
      // If one is a parent and one is a sub-task
      if (!a.parent_task_id && b.parent_task_id) {
        // If a is the parent of b, a should come first
        if (a.id === b.parent_task_id) return -1
        // Otherwise, sort by created_at
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      
      if (a.parent_task_id && !b.parent_task_id) {
        // If b is the parent of a, b should come first
        if (b.id === a.parent_task_id) return 1
        // Otherwise, sort by created_at
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      
      // If both are sub-tasks
      if (a.parent_task_id && b.parent_task_id) {
        // If they have the same parent, sort by created_at
        if (a.parent_task_id === b.parent_task_id) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }
        // If different parents, sort by parent's created_at
        const parentA = allTasks.find(t => t.id === a.parent_task_id)
        const parentB = allTasks.find(t => t.id === b.parent_task_id)
        if (parentA && parentB) {
          return new Date(parentB.created_at).getTime() - new Date(parentA.created_at).getTime()
        }
      }
      
      // Default: sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    console.log('✅ Tasks fetched successfully:', sortedTasks.length, 'total tasks')
    return { tasks: sortedTasks, error: null }
  } catch (error: any) {
    console.error('Exception in getProjectTasks:', error)
    return { tasks: [], error }
  }
}

// Get task statuses for a project
export async function getTaskStatuses(projectId: string) {
  console.log('Fetching task statuses for project:', projectId)
  
  try {
    const { data, error } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index')

    if (error) {
      console.error('Error fetching task statuses:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return { statuses: [], error }
    }

    console.log('✅ Task statuses fetched successfully:', data?.length || 0, 'statuses')
    return { statuses: data || [], error: null }
  } catch (error: any) {
    console.error('Exception in getTaskStatuses:', error)
    return { statuses: [], error }
  }
}

// Create a new task
export async function createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'assignee' | 'status'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('*')
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
    .select('*')
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

// Create a sub-task
export async function createSubTask(parentTaskId: string, subTaskData: {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id: string
  reporter_id: string
  project_id: string
  status_id: string
}) {
  const taskData = {
    ...subTaskData,
    parent_task_id: parentTaskId,
    priority: subTaskData.priority || 'medium',
    description: subTaskData.description || null
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating sub-task:', error)
    return { task: null, error }
  }

  // Update parent task completion percentage
  await updateParentTaskCompletion(parentTaskId)

  return { task: data, error: null }
}

// Mark task as complete (move to completed status)
export async function markTaskComplete(taskId: string, projectId: string) {
  try {
    // Find the "Done" or "Completed" status for this project
    const { data: statuses } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: false })

    const completedStatus = statuses?.find(s => 
      s.name.toLowerCase().includes('done') || 
      s.name.toLowerCase().includes('complete')
    ) || statuses?.[statuses.length - 1] // Fallback to last status

    if (!completedStatus) {
      return { success: false, error: new Error('No completion status found') }
    }

    // Update the task status
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        status_id: completedStatus.id,
        completion_percentage: 100
      })
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) {
      console.error('Error marking task complete:', error)
      return { success: false, error }
    }

    // If this task has a parent, update the parent's completion
    if (data.parent_task_id) {
      await updateParentTaskCompletion(data.parent_task_id)
    }

    return { success: true, task: data, error: null }
  } catch (error) {
    console.error('Exception in markTaskComplete:', error)
    return { success: false, error }
  }
}

// Mark task as incomplete (move back to first status)
export async function markTaskIncomplete(taskId: string, projectId: string) {
  try {
    // Find the first status for this project (typically "To Do")
    const { data: statuses } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    const firstStatus = statuses?.[0] // Get the first status

    if (!firstStatus) {
      return { success: false, error: new Error('No initial status found') }
    }

    // Update the task status
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        status_id: firstStatus.id,
        completion_percentage: 0
      })
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) {
      console.error('Error marking task incomplete:', error)
      return { success: false, error }
    }

    // If this task has a parent, update the parent's completion
    if (data.parent_task_id) {
      await updateParentTaskCompletion(data.parent_task_id)
    }

    return { success: true, task: data, error: null }
  } catch (error) {
    console.error('Exception in markTaskIncomplete:', error)
    return { success: false, error }
  }
}

// Update parent task completion percentage based on sub-tasks
async function updateParentTaskCompletion(parentTaskId: string) {
  try {
    // Get all sub-tasks for this parent
    const { data: subTasks } = await supabase
      .from('tasks')
      .select('status_id, project_id')
      .eq('parent_task_id', parentTaskId)

    if (!subTasks || subTasks.length === 0) return

    // Get project statuses to identify completed ones
    const { data: statuses } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', subTasks[0].project_id)

    const completedStatusIds = statuses?.filter(s => 
      s.name.toLowerCase().includes('done') || 
      s.name.toLowerCase().includes('complete')
    ).map(s => s.id) || []

    // Calculate completion percentage
    const completedCount = subTasks.filter(task => 
      completedStatusIds.includes(task.status_id)
    ).length
    
    const completionPercentage = Math.round((completedCount / subTasks.length) * 100)

    // Update parent task
    await supabase
      .from('tasks')
      .update({ completion_percentage: completionPercentage })
      .eq('id', parentTaskId)

  } catch (error) {
    console.error('Error updating parent task completion:', error)
  }
}