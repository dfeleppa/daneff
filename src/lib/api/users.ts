import { supabase } from '../supabase'
import { Database } from '../database.types'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']

// Sync authenticated user with Supabase users table
export async function syncUserWithSupabase(authUser: {
  id: string
  email: string
  name: string
  image?: string
}) {
  try {
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError)
      return null
    }

    // If user exists, update their info
    if (existingUser) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email: authUser.email,
          name: authUser.name,
          avatar_url: authUser.image || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return null
      }

      return updatedUser
    }

    // If user doesn't exist, create them
    const newUser: UserInsert = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      avatar_url: authUser.image || null,
    }

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      return null
    }

    // Create a default workspace for new users
    await createDefaultWorkspace(createdUser.id, authUser.name)

    return createdUser
  } catch (error) {
    console.error('Error syncing user:', error)
    return null
  }
}

// Create a default workspace for new users
async function createDefaultWorkspace(userId: string, userName: string) {
  try {
    const workspaceName = `${userName}'s Workspace`
    const workspaceSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-')

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug: workspaceSlug,
        description: 'Your personal workspace',
        owner_id: userId,
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Error creating workspace:', workspaceError)
      return
    }

    // Add user as workspace admin
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'admin',
      })

    if (memberError) {
      console.error('Error adding user to workspace:', memberError)
    }

    // Create a sample project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'My First Project',
        description: 'Welcome to TaskFlow! This is your first project.',
        color: '#3b82f6',
        status: 'active',
        workspace_id: workspace.id,
        owner_id: userId,
      })
      .select()
      .single()

    if (projectError) {
      console.error('Error creating project:', projectError)
      return
    }

    // Add user as project admin
    await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: userId,
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
          project_id: project.id,
        }))
      )

    console.log('Default workspace and project created successfully')
  } catch (error) {
    console.error('Error creating default workspace:', error)
  }
}

// Get user's workspaces
export async function getUserWorkspaces(userId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      role,
      workspaces (
        id,
        name,
        slug,
        description,
        owner_id,
        created_at
      )
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching workspaces:', error)
    return []
  }

  return data.map(item => ({
    ...item.workspaces,
    user_role: item.role,
  }))
}

// Get workspace projects
export async function getWorkspaceProjects(workspaceId: string) {
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
    return []
  }

  return data.map(project => ({
    ...project,
    members: project.project_members.map(pm => ({
      ...pm.users,
      role: pm.role,
    }))
  }))
}