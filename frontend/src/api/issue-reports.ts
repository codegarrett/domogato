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

export interface IssueReportAttachment {
  id: string
  issue_report_id: string
  uploaded_by_id: string | null
  filename: string
  content_type: string
  size_bytes: number
  created_at: string
}

export interface IssueReportLabel {
  id: string
  name: string
  color: string
}

export interface IssueReport {
  id: string
  project_id: string
  title: string
  description: string | null
  source_url: string | null
  status: string
  priority: string
  created_by: string | null
  created_by_name: string | null
  reporter_name: string | null
  reporter_email: string | null
  reporter_count: number
  created_at: string
  updated_at: string
  reporters: IssueReportReporter[]
  linked_tickets: IssueReportTicketLink[]
  attachments: IssueReportAttachment[]
  labels: IssueReportLabel[]
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
  source_url?: string | null
  label_ids?: string[]
}

export interface IssueReportUpdate {
  title?: string
  description?: string | null
  priority?: string
  status?: string
  source_url?: string | null
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

// ---- Attachments ----

export interface AttachmentPresignResponse {
  attachment: IssueReportAttachment
  upload_url: string
}

export async function createIssueReportAttachment(
  projectId: string,
  reportId: string,
  body: { filename: string; content_type: string; size_bytes: number },
) {
  const { data } = await apiClient.post<AttachmentPresignResponse>(
    `/projects/${projectId}/issue-reports/${reportId}/attachments`,
    body,
  )
  return data
}

export async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
}

export async function listIssueReportAttachments(projectId: string, reportId: string) {
  const { data } = await apiClient.get<IssueReportAttachment[]>(
    `/projects/${projectId}/issue-reports/${reportId}/attachments`,
  )
  return data
}

export async function getIssueReportAttachmentDownloadUrl(attachmentId: string) {
  const { data } = await apiClient.get<{ download_url: string }>(
    `/issue-report-attachments/${attachmentId}/download`,
  )
  return data.download_url
}

export async function deleteIssueReportAttachment(attachmentId: string) {
  await apiClient.delete(`/issue-report-attachments/${attachmentId}`)
}

// ---- Labels ----

export async function addLabelToIssueReport(projectId: string, reportId: string, labelId: string) {
  await apiClient.post(`/projects/${projectId}/issue-reports/${reportId}/labels/${labelId}`)
}

export async function removeLabelFromIssueReport(projectId: string, reportId: string, labelId: string) {
  await apiClient.delete(`/projects/${projectId}/issue-reports/${reportId}/labels/${labelId}`)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
