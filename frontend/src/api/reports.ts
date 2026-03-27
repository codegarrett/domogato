import apiClient from './client'

export interface ProjectSummary {
  total_tickets: number
  open_tickets: number
  in_progress_tickets: number
  done_tickets: number
  overdue_tickets: number
  total_story_points: number
  completed_story_points: number
  by_priority: Record<string, number>
  by_type: Record<string, number>
}

export interface VelocityEntry {
  sprint_id: string
  sprint_name: string
  velocity: number
}

export interface VelocityReport {
  entries: VelocityEntry[]
  average: number
}

export interface BurndownPoint {
  date: string
  remaining: number
  ideal: number
}

export interface BurndownReport {
  sprint_id: string
  points: BurndownPoint[]
}

export interface CfdDay {
  date: string
  todo: number
  in_progress: number
  done: number
}

export interface CumulativeFlowReport {
  project_id: string
  days: CfdDay[]
}

export interface CycleTimeEntry {
  ticket_id: string
  ticket_key: string | null
  title: string
  cycle_time_hours: number
}

export interface CycleTimeReport {
  entries: CycleTimeEntry[]
  average_hours: number
  median_hours: number
}

export interface SprintReportTicket {
  ticket_id: string
  ticket_key: string | null
  title: string
  story_points: number
  completed: boolean
  priority: string
  ticket_type: string
}

export interface SprintReportSummary {
  total_tickets: number
  completed_tickets: number
  incomplete_tickets: number
  total_story_points: number
  completed_story_points: number
  incomplete_story_points: number
  completion_rate: number
}

export interface SprintReport {
  sprint_id: string
  sprint_name: string
  status: string
  start_date: string | null
  end_date: string | null
  summary: SprintReportSummary
  tickets: SprintReportTicket[]
}

export async function getSprintReport(projectId: string, sprintId: string): Promise<SprintReport> {
  const { data } = await apiClient.get<SprintReport>(`/projects/${projectId}/sprints/${sprintId}/report`)
  return data
}

export async function getProjectSummary(projectId: string): Promise<ProjectSummary> {
  const { data } = await apiClient.get<ProjectSummary>(`/projects/${projectId}/reports/summary`)
  return data
}

export async function getVelocityReport(projectId: string): Promise<VelocityReport> {
  const { data } = await apiClient.get<VelocityReport>(`/projects/${projectId}/reports/velocity`)
  return data
}

export async function getBurndownReport(sprintId: string): Promise<BurndownReport> {
  const { data } = await apiClient.get<BurndownReport>(`/sprints/${sprintId}/reports/burndown`)
  return data
}

export async function getCumulativeFlowReport(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<CumulativeFlowReport> {
  const { data } = await apiClient.get<CumulativeFlowReport>(
    `/projects/${projectId}/reports/cumulative-flow`,
    { params: { start_date: startDate, end_date: endDate } },
  )
  return data
}

export async function getCycleTimeReport(
  projectId: string,
  params?: { start_date?: string; end_date?: string },
): Promise<CycleTimeReport> {
  const { data } = await apiClient.get<CycleTimeReport>(
    `/projects/${projectId}/reports/cycle-time`,
    { params },
  )
  return data
}
