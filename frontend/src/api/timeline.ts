import apiClient from './client'

export interface TimelineEpic {
  id: string
  type: 'epic'
  title: string
  start_date: string | null
  due_date: string | null
  status: string
}

export interface TimelineTicket {
  id: string
  type: 'ticket'
  title: string
  ticket_number: number
  ticket_key: string
  start_date: string | null
  due_date: string | null
  epic_id: string | null
  status: string
  status_category: string
  status_color: string | null
  priority: string
  story_points: number | null
  assignee_id: string | null
}

export interface TimelineDependency {
  blocking_ticket_id: string
  blocked_ticket_id: string
  dependency_type: string
}

export interface TimelineData {
  epics: TimelineEpic[]
  tickets: TimelineTicket[]
  unscheduled: TimelineTicket[]
  dependencies: TimelineDependency[]
}

export async function getTimeline(projectId: string): Promise<TimelineData> {
  const { data } = await apiClient.get<TimelineData>(`/projects/${projectId}/timeline`)
  return data
}
