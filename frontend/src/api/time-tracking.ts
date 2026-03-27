import apiClient from './client'

export interface TimeLog {
  id: string
  ticket_id: string
  project_id: string
  user_id: string
  seconds_spent: number
  work_date: string
  description: string | null
  activity_type: string
  created_at: string
  updated_at: string
}

export interface TimeLogCreate {
  seconds_spent: number
  work_date: string
  description?: string
  activity_type?: string
}

export interface TimeLogUpdate {
  seconds_spent?: number
  work_date?: string
  description?: string
  activity_type?: string
}

export interface TimeSummary {
  total_logged_seconds: number
  original_estimate_seconds: number | null
  remaining_estimate_seconds: number | null
}

export interface TimesheetEntry {
  date: string
  total_seconds: number
  entries: TimeLog[]
}

export interface TimesheetReport {
  user_id: string
  start_date: string
  end_date: string
  total_seconds: number
  days: TimesheetEntry[]
}

export interface TimeReportResult {
  total_seconds: number
  total_entries: number
  entries: TimeLog[]
}

export async function logTime(ticketId: string, body: TimeLogCreate): Promise<TimeLog> {
  const { data } = await apiClient.post<TimeLog>(`/tickets/${ticketId}/time-logs`, body)
  return data
}

export async function listTimeLogs(ticketId: string, params?: { offset?: number; limit?: number }): Promise<{ items: TimeLog[]; total: number }> {
  const { data } = await apiClient.get<{ items: TimeLog[]; total: number }>(`/tickets/${ticketId}/time-logs`, { params })
  return data
}

export async function getTimeSummary(ticketId: string): Promise<TimeSummary> {
  const { data } = await apiClient.get<TimeSummary>(`/tickets/${ticketId}/time-summary`)
  return data
}

export async function updateTimeLog(logId: string, body: TimeLogUpdate): Promise<TimeLog> {
  const { data } = await apiClient.patch<TimeLog>(`/time-logs/${logId}`, body)
  return data
}

export async function deleteTimeLog(logId: string): Promise<void> {
  await apiClient.delete(`/time-logs/${logId}`)
}

export async function getProjectTimeReport(
  projectId: string,
  params?: { start_date?: string; end_date?: string; user_id?: string },
): Promise<TimeReportResult> {
  const { data } = await apiClient.get<TimeReportResult>(`/projects/${projectId}/time-report`, { params })
  return data
}

export async function getMyTimesheet(startDate: string, endDate: string): Promise<TimesheetReport> {
  const { data } = await apiClient.get<TimesheetReport>('/users/me/timesheet', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data
}
