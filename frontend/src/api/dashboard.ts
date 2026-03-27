import apiClient from './client'

export interface DashboardTicket {
  id: string
  title: string
  ticket_key: string
  priority: string
  due_date: string | null
  status_name: string
  project_name: string
}

export interface DashboardWatched {
  id: string
  title: string
  ticket_key: string
  updated_at: string | null
}

export interface DashboardSprint {
  id: string
  name: string
  project_name: string
  progress_pct: number
  end_date: string | null
}

export interface DashboardActivity {
  id: string
  event_type: string
  title: string
  created_at: string | null
}

export interface DashboardStats {
  open_tickets: number
  completed_this_week: number
  hours_logged_this_week: number
}

export interface DashboardData {
  assigned_tickets: DashboardTicket[]
  overdue_count: number
  watched_recent: DashboardWatched[]
  active_sprints: DashboardSprint[]
  recent_activity: DashboardActivity[]
  stats: DashboardStats
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<DashboardData>('/users/me/dashboard')
  return data
}
