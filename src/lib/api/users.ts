import { createClient } from '@supabase/supabase-js'

// Create a non-typed client to avoid deployment issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Use flexible interfaces
interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Create or update user in Supabase with proper UUID handling
export async function createSupabaseUser(userData: {
  email: string
  name: string
  avatar_url: string | null
  google_id: string
}) {
  try {
    // First, check if user already exists by Google ID (stored in a separate field)
    const { data: existingUsers, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.email) // Search by email since Google ID isn't stored in current schema
      .limit(1)

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching for existing user:', searchError)
      throw searchError
    }

    if (existingUsers && existingUsers.length > 0) {
      // User exists, update their info
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          name: userData.name,
          avatar_url: userData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsers[0].id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        throw updateError
      }

      return updatedUser
    } else {
      // User doesn't exist, create new user (Supabase will auto-generate UUID)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
          // Don't specify ID, let Supabase generate UUID
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        throw createError
      }

      return newUser
    }
  } catch (error) {
    console.error('Error in createSupabaseUser:', error)
    throw error
  }
}

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
    const newUser: Omit<User, 'created_at' | 'updated_at'> = {
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

  return data?.map((item: any) => ({
    id: item.workspaces.id,
    name: item.workspaces.name,
    slug: item.workspaces.slug,
    description: item.workspaces.description,
    owner_id: item.workspaces.owner_id,
    created_at: item.workspaces.created_at,
    user_role: item.role,
  })) || []
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
    members: project.project_members.map((pm: any) => ({
      ...pm.users,
      role: pm.role,
    }))
  }))
}