export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'member' | 'viewer'
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  owner: User
  members: User[]
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
}

export interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
  projectId: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: User
  reporter: User
  project: Project
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  tags: string[]
  subtasks: Subtask[]
  comments: Comment[]
  attachments: Attachment[]
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
  taskId: string
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  content: string
  author: User
  taskId: string
  createdAt: Date
  updatedAt: Date
}

export interface Attachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  taskId: string
  uploadedBy: User
  createdAt: Date
}

export interface Board {
  id: string
  name: string
  project: Project
  columns: TaskStatus[]
  tasks: Task[]
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  owner: User
  members: User[]
  projects: Project[]
  createdAt: Date
  updatedAt: Date
}
