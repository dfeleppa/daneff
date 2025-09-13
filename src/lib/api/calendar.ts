import { getSession } from 'next-auth/react'

interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  colorId?: string
}

interface Project {
  id: string
  name: string
  description: string | null
  due_date?: string | null
  status: string
}

interface Task {
  id: string
  title: string
  due_date?: string | null
  priority: string
  project?: {
    name: string
    color: string
  }
}

// Create a calendar event for a project
export async function createProjectCalendarEvent(project: Project): Promise<boolean> {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken || !project.due_date) return false

    const event: CalendarEvent = {
      summary: `📋 ${project.name} (Due)`,
      description: `Project: ${project.name}\n${project.description || 'No description'}\n\nStatus: ${project.status}\n\nManage in TaskFlow: ${window.location.origin}/projects`,
      start: {
        date: project.due_date
      },
      end: {
        date: project.due_date
      },
      colorId: '9' // Blue for projects
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      console.error('Failed to create calendar event:', response.statusText)
      return false
    }

    const result = await response.json()
    console.log('✅ Calendar event created:', result.id)
    return true
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return false
  }
}

// Create a calendar event for a task
export async function createTaskCalendarEvent(task: Task): Promise<boolean> {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken || !task.due_date) return false

    // Determine color based on priority
    const colorMap = {
      'urgent': '11', // Red
      'high': '6',    // Orange
      'medium': '5',  // Yellow
      'low': '2'      // Green
    }

    const event: CalendarEvent = {
      summary: `📝 ${task.title}`,
      description: `Task: ${task.title}\nPriority: ${task.priority.toUpperCase()}\n${task.project ? `Project: ${task.project.name}` : ''}\n\nManage in TaskFlow: ${window.location.origin}/board`,
      start: {
        date: task.due_date
      },
      end: {
        date: task.due_date
      },
      colorId: colorMap[task.priority as keyof typeof colorMap] || '1'
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      console.error('Failed to create task calendar event:', response.statusText)
      return false
    }

    const result = await response.json()
    console.log('✅ Task calendar event created:', result.id)
    return true
  } catch (error) {
    console.error('Error creating task calendar event:', error)
    return false
  }
}

// Create a project milestone event
export async function createMilestoneEvent(projectName: string, milestone: string, date: string): Promise<boolean> {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) return false

    const event: CalendarEvent = {
      summary: `🎯 ${projectName} - ${milestone}`,
      description: `Milestone: ${milestone}\nProject: ${projectName}\n\nView project: ${window.location.origin}/projects`,
      start: {
        dateTime: `${date}T09:00:00`
      },
      end: {
        dateTime: `${date}T10:00:00`
      },
      colorId: '10' // Green for milestones
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      console.error('Failed to create milestone event:', response.statusText)
      return false
    }

    const result = await response.json()
    console.log('✅ Milestone calendar event created:', result.id)
    return true
  } catch (error) {
    console.error('Error creating milestone event:', error)
    return false
  }
}

// Get upcoming events from Google Calendar
export async function getUpcomingEvents(maxResults: number = 10): Promise<any[]> {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) return []

    const now = new Date().toISOString()
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch calendar events:', response.statusText)
      return []
    }

    const result = await response.json()
    return result.items || []
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return []
  }
}

// Sync all project due dates with calendar
export async function syncProjectsWithCalendar(projects: Project[]): Promise<void> {
  console.log('🔄 Syncing projects with Google Calendar...')
  
  for (const project of projects) {
    if (project.due_date && project.status === 'active') {
      await createProjectCalendarEvent(project)
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log('✅ Project sync completed!')
}

// Check if user has granted calendar permissions
export async function hasCalendarPermission(): Promise<boolean> {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    if (!accessToken) return false

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    })

    return response.ok
  } catch (error) {
    console.error('Error checking calendar permission:', error)
    return false
  }
}