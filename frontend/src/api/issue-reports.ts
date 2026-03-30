import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface IssueReportReporter {
  user_id: string
  display_name: string | null
  original_description: string | null
  created_at: string
}

export interface IssueReportTicketLink {
  ticket_id: string
  ticket_key: string | null
  ticket_title: string | null
  created_at: string
}

export interface IssueReport {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  priority: string
  created_by: string | null
  created_by_name: string | null
  reporter_count: number
  created_at: string
  updated_at: string
  reporters: IssueReportReporter[]
  linked_tickets: IssueReportTicketLink[]
}

export interface IssueReportListParams {
  status?: string
  priority?: string
  q?: string
  sort_by?: string
  sort_dir?: string
  offset?: number
  limit?: number
}

export interface IssueReportCreate {
  title: string
  description?: string | null
  priority?: string
}

export interface IssueReportUpdate {
  title?: string
  description?: string | null
  priority?: string
  status?: string
}

export interface SimilarReport {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  reporter_count: number
  similarity_score: number
}

export interface CreateTicketFromReportsPayload {
  issue_report_ids: string[]
  title?: string
  description?: string
  ticket_type?: string
  priority?: string
}

export async function listIssueReports(projectId: string, params: IssueReportListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<IssueReport>>(
    `/projects/${projectId}/issue-reports`,
    { params },
  )
  return data
}

export async function getIssueReport(projectId: string, reportId: string) {
  const { data } = await apiClient.get<IssueReport>(
    `/projects/${projectId}/issue-reports/${reportId}`,
  )
  return data
}

export async function createIssueReport(projectId: string, payload: IssueReportCreate) {
  const { data } = await apiClient.post<IssueReport>(
    `/projects/${projectId}/issue-reports`,
    payload,
  )
  return data
}

export async function updateIssueReport(projectId: string, reportId: string, payload: IssueReportUpdate) {
  const { data } = await apiClient.patch<IssueReport>(
    `/projects/${projectId}/issue-reports/${reportId}`,
    payload,
  )
  return data
}

export async function deleteIssueReport(projectId: string, reportId: string) {
  await apiClient.delete(`/projects/${projectId}/issue-reports/${reportId}`)
}

export async function findSimilarReports(projectId: string, q: string, limit = 5) {
  const { data } = await apiClient.get<SimilarReport[]>(
    `/projects/${projectId}/issue-reports/similar`,
    { params: { q, limit } },
  )
  return data
}

export async function addReporter(
  projectId: string,
  reportId: string,
  payload: { user_id?: string; original_description?: string },
) {
  const { data } = await apiClient.post<IssueReportReporter>(
    `/projects/${projectId}/issue-reports/${reportId}/reporters`,
    payload,
  )
  return data
}

export async function listReporters(projectId: string, reportId: string) {
  const { data } = await apiClient.get<IssueReportReporter[]>(
    `/projects/${projectId}/issue-reports/${reportId}/reporters`,
  )
  return data
}

export async function createTicketFromReports(projectId: string, payload: CreateTicketFromReportsPayload) {
  const { data } = await apiClient.post(
    `/projects/${projectId}/issue-reports/create-ticket`,
    payload,
  )
  return data
}

export async function getTicketIssueReports(ticketId: string) {
  const { data } = await apiClient.get<Array<{
    id: string
    title: string
    status: string
    priority: string
    reporter_count: number
    linked_at: string
  }>>(`/tickets/${ticketId}/issue-reports`)
  return data
}
