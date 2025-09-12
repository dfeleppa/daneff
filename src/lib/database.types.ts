export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'admin' | 'member' | 'viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          status: 'active' | 'on_hold' | 'completed' | 'archived'
          workspace_id: string
          owner_id: string
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string
          status?: 'active' | 'on_hold' | 'completed' | 'archived'
          workspace_id: string
          owner_id: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          status?: 'active' | 'on_hold' | 'completed' | 'archived'
          workspace_id?: string
          owner_id?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'admin' | 'member' | 'viewer'
          added_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'admin' | 'member' | 'viewer'
          added_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'admin' | 'member' | 'viewer'
          added_at?: string
        }
      }
      task_statuses: {
        Row: {
          id: string
          name: string
          color: string
          order_index: number
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          order_index?: number
          project_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          order_index?: number
          project_id?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status_id: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          project_id: string
          assignee_id: string | null
          reporter_id: string
          due_date: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status_id?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_id: string
          assignee_id?: string | null
          reporter_id: string
          due_date?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status_id?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_id?: string
          assignee_id?: string | null
          reporter_id?: string
          due_date?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      task_tags: {
        Row: {
          id: string
          name: string
          color: string
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          project_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          project_id?: string
          created_at?: string
        }
      }
      task_tag_assignments: {
        Row: {
          id: string
          task_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          task_id: string
          tag_id: string
        }
        Update: {
          id?: string
          task_id?: string
          tag_id?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          title: string
          completed: boolean
          task_id: string
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          completed?: boolean
          task_id: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          completed?: boolean
          task_id?: string
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          task_id: string
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          task_id: string
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          task_id?: string
          author_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          name: string
          file_path: string
          file_size: number
          file_type: string
          task_id: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          file_path: string
          file_size: number
          file_type: string
          task_id: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          task_id?: string
          uploaded_by?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'member' | 'viewer'
      project_status: 'active' | 'on_hold' | 'completed' | 'archived'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
    }
  }
}