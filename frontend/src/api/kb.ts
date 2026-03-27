import apiClient from './client'

// ---------------------------------------------------------------------------
// Types – Spaces
// ---------------------------------------------------------------------------

export interface KBSpace {
  id: string
  project_id: string
  name: string
  description: string | null
  slug: string
  icon: string | null
  position: number
  is_archived: boolean
  created_by: string | null
  page_count: number
  last_updated_at: string | null
  contributor_count: number
  created_at: string
  updated_at: string
}

export interface RecentPage {
  id: string
  title: string
  slug: string
  space_name: string
  space_slug: string
  updated_at: string
  last_edited_by_name: string | null
}

// ---------------------------------------------------------------------------
// Types – Pages
// ---------------------------------------------------------------------------

export interface PageMetaBrief {
  id: string
  page_type: string
  story_workflow_status_id: string | null
  story_status: {
    id: string
    name: string
    category: string
    color: string
  } | null
  ticket_link_count: number
}

export interface KBPage {
  id: string
  space_id: string
  parent_page_id: string | null
  title: string
  slug: string
  content_markdown: string
  content_html: string
  position: number
  is_published: boolean
  is_deleted: boolean
  created_by: string | null
  last_edited_by: string | null
  version_count: number
  comment_count: number
  meta: PageMetaBrief | null
  created_at: string
  updated_at: string
}

export interface PageTreeNode {
  id: string
  title: string
  slug: string
  position: number
  is_published: boolean
  children: PageTreeNode[]
}

export interface PageAncestor {
  id: string
  title: string
  slug: string
}

// ---------------------------------------------------------------------------
// Types – Versions & Diffs
// ---------------------------------------------------------------------------

export interface KBPageVersion {
  id: string
  page_id: string
  version_number: number
  title: string
  content_markdown: string
  content_html: string
  change_summary: string | null
  created_by: string | null
  created_at: string
}

export interface VersionListItem {
  id: string
  version_number: number
  title: string
  change_summary: string | null
  created_by: string | null
  created_at: string
}

export interface DiffEntry {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

export interface DiffResponse {
  from_version: VersionListItem
  to_version: VersionListItem
  diff: DiffEntry[]
  stats: { additions: number; deletions: number; unchanged: number }
}

// ---------------------------------------------------------------------------
// Types – Comments
// ---------------------------------------------------------------------------

export interface KBComment {
  id: string
  page_id: string
  parent_comment_id: string | null
  author: { id: string; display_name: string; avatar_url: string | null }
  body: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  replies: KBComment[]
}

// ---------------------------------------------------------------------------
// Types – Attachments
// ---------------------------------------------------------------------------

export interface KBAttachment {
  id: string
  page_id: string
  filename: string
  content_type: string
  size_bytes: number
  created_by: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Types – Templates
// ---------------------------------------------------------------------------

export interface KBTemplate {
  id: string
  project_id: string | null
  name: string
  description: string | null
  content_markdown: string
  content_html: string
  icon: string | null
  page_type: string | null
  is_builtin: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Types – Story Workflows
// ---------------------------------------------------------------------------

export interface StoryWorkflowStatus {
  id: string
  workflow_id: string
  name: string
  category: string
  color: string
  position: number
  is_initial: boolean
  is_terminal: boolean
  created_at: string
  updated_at: string
}

export interface StoryWorkflow {
  id: string
  project_id: string
  name: string
  statuses: StoryWorkflowStatus[]
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Types – Page Meta & Ticket Links
// ---------------------------------------------------------------------------

export interface PageMetaFull {
  id: string
  page_id: string
  page_type: string
  story_workflow_status_id: string | null
  story_status: StoryWorkflowStatus | null
  project_id: string
  ticket_link_count: number
  created_at: string
  updated_at: string
}

export interface PageTicketLink {
  id: string
  page_meta_id: string
  ticket_id: string
  ticket_key: string
  ticket_title: string
  ticket_priority: string
  ticket_status: string
  ticket_status_color: string
  ticket_assignee_name: string | null
  ticket_assignee_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export interface UserStoryForTicket {
  page_id: string
  page_title: string
  page_slug: string
  space_id: string
  space_name: string
  space_slug: string
  story_status_name: string | null
  story_status_color: string | null
  story_status_category: string | null
}

// ---------------------------------------------------------------------------
// Types – Search
// ---------------------------------------------------------------------------

export interface KBSearchResult extends KBPage {
  space_name: string
  space_slug: string
  headline: string
}

// ===========================================================================
// Spaces
// ===========================================================================

export async function listSpaces(projectId: string): Promise<KBSpace[]> {
  const { data } = await apiClient.get<KBSpace[]>(`/projects/${projectId}/kb/spaces`)
  return data
}

export async function listRecentPages(projectId: string, limit = 10): Promise<RecentPage[]> {
  const { data } = await apiClient.get<RecentPage[]>(`/projects/${projectId}/kb/recent-pages`, {
    params: { limit },
  })
  return data
}

export async function createSpace(
  projectId: string,
  body: { name: string; description?: string; icon?: string },
): Promise<KBSpace> {
  const { data } = await apiClient.post<KBSpace>(`/projects/${projectId}/kb/spaces`, body)
  return data
}

export async function getSpace(projectId: string, slug: string): Promise<KBSpace> {
  const { data } = await apiClient.get<KBSpace>(`/projects/${projectId}/kb/spaces/${slug}`)
  return data
}

export async function updateSpace(
  projectId: string,
  slug: string,
  body: Partial<{ name: string; description: string; icon: string; position: number; is_archived: boolean }>,
): Promise<KBSpace> {
  const { data } = await apiClient.patch<KBSpace>(`/projects/${projectId}/kb/spaces/${slug}`, body)
  return data
}

export async function archiveSpace(projectId: string, slug: string): Promise<KBSpace> {
  const { data } = await apiClient.delete<KBSpace>(`/projects/${projectId}/kb/spaces/${slug}`)
  return data
}

// ===========================================================================
// Pages
// ===========================================================================

export async function getPageTree(spaceId: string): Promise<PageTreeNode[]> {
  const { data } = await apiClient.get<PageTreeNode[]>(`/kb/spaces/${spaceId}/pages`)
  return data
}

export async function createPage(
  spaceId: string,
  body: {
    title: string
    content_markdown?: string
    content_html?: string
    parent_page_id?: string
    template_id?: string
    page_type?: string
  },
): Promise<KBPage> {
  const { data } = await apiClient.post<KBPage>(`/kb/spaces/${spaceId}/pages`, body)
  return data
}

export async function getPage(pageId: string): Promise<KBPage> {
  const { data } = await apiClient.get<KBPage>(`/kb/pages/${pageId}`)
  return data
}

export async function updatePage(
  pageId: string,
  body: Partial<{
    title: string
    content_markdown: string
    content_html: string
    is_published: boolean
    change_summary: string
  }>,
): Promise<KBPage> {
  const { data } = await apiClient.patch<KBPage>(`/kb/pages/${pageId}`, body)
  return data
}

export async function deletePage(pageId: string): Promise<void> {
  await apiClient.delete(`/kb/pages/${pageId}`)
}

export async function movePage(
  pageId: string,
  body: { parent_page_id?: string | null; position: number },
): Promise<KBPage> {
  const { data } = await apiClient.post<KBPage>(`/kb/pages/${pageId}/move`, body)
  return data
}

export async function getPageChildren(pageId: string): Promise<KBPage[]> {
  const { data } = await apiClient.get<KBPage[]>(`/kb/pages/${pageId}/children`)
  return data
}

export async function getPageAncestors(pageId: string): Promise<PageAncestor[]> {
  const { data } = await apiClient.get<PageAncestor[]>(`/kb/pages/${pageId}/ancestors`)
  return data
}

// ===========================================================================
// Versions
// ===========================================================================

interface VersionsResponse {
  items: VersionListItem[]
  total: number
}

export async function listVersions(
  pageId: string,
  params?: { offset?: number; limit?: number },
): Promise<{ items: VersionListItem[]; total: number }> {
  const { data } = await apiClient.get<VersionsResponse | VersionListItem[]>(
    `/kb/pages/${pageId}/versions`,
    { params },
  )
  if (Array.isArray(data)) {
    return { items: data, total: data.length }
  }
  return data
}

export async function getVersion(pageId: string, versionId: string): Promise<KBPageVersion> {
  const { data } = await apiClient.get<KBPageVersion>(`/kb/pages/${pageId}/versions/${versionId}`)
  return data
}

export async function restoreVersion(pageId: string, versionId: string): Promise<KBPage> {
  const { data } = await apiClient.post<KBPage>(`/kb/pages/${pageId}/versions/${versionId}/restore`)
  return data
}

export async function diffVersions(
  pageId: string,
  v1Id: string,
  v2Id: string,
): Promise<DiffResponse> {
  const { data } = await apiClient.get<DiffResponse>(
    `/kb/pages/${pageId}/versions/${v1Id}/diff/${v2Id}`,
  )
  return data
}

// ===========================================================================
// Comments
// ===========================================================================

export async function listComments(pageId: string): Promise<KBComment[]> {
  const { data } = await apiClient.get<KBComment[]>(`/kb/pages/${pageId}/comments`)
  return data
}

export async function createComment(
  pageId: string,
  body: { body: string; parent_comment_id?: string },
): Promise<KBComment> {
  const { data } = await apiClient.post<KBComment>(`/kb/pages/${pageId}/comments`, body)
  return data
}

export async function updateComment(commentId: string, body: { body: string }): Promise<KBComment> {
  const { data } = await apiClient.patch<KBComment>(`/kb/comments/${commentId}`, body)
  return data
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/kb/comments/${commentId}`)
}

// ===========================================================================
// Attachments
// ===========================================================================

export async function createAttachment(
  pageId: string,
  body: { filename: string; content_type: string; size_bytes: number },
): Promise<{ attachment: KBAttachment; upload_url: string }> {
  const { data } = await apiClient.post<{ attachment: KBAttachment; upload_url: string }>(
    `/kb/pages/${pageId}/attachments`,
    body,
  )
  return data
}

export async function listAttachments(pageId: string): Promise<KBAttachment[]> {
  const { data } = await apiClient.get<KBAttachment[]>(`/kb/pages/${pageId}/attachments`)
  return data
}

export async function downloadAttachment(
  attachmentId: string,
): Promise<{ download_url: string }> {
  const { data } = await apiClient.get<{ download_url: string }>(
    `/kb/attachments/${attachmentId}/download`,
  )
  return data
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/kb/attachments/${attachmentId}`)
}

// ===========================================================================
// Templates
// ===========================================================================

export async function listTemplates(projectId: string): Promise<KBTemplate[]> {
  const { data } = await apiClient.get<KBTemplate[]>(`/projects/${projectId}/kb/templates`)
  return data
}

export async function createTemplate(
  projectId: string,
  body: {
    name: string
    description?: string
    content_markdown?: string
    content_html?: string
    icon?: string
  },
): Promise<KBTemplate> {
  const { data } = await apiClient.post<KBTemplate>(`/projects/${projectId}/kb/templates`, body)
  return data
}

export async function getTemplate(templateId: string): Promise<KBTemplate> {
  const { data } = await apiClient.get<KBTemplate>(`/kb/templates/${templateId}`)
  return data
}

export async function updateTemplate(
  templateId: string,
  body: Partial<{
    name: string
    description: string
    content_markdown: string
    content_html: string
    icon: string
  }>,
): Promise<KBTemplate> {
  const { data } = await apiClient.patch<KBTemplate>(`/kb/templates/${templateId}`, body)
  return data
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiClient.delete(`/kb/templates/${templateId}`)
}

// ===========================================================================
// Search
// ===========================================================================

export async function searchKB(
  projectId: string,
  params: { q: string; space_id?: string; limit?: number; offset?: number },
): Promise<KBSearchResult[]> {
  const { data } = await apiClient.get<KBSearchResult[]>(
    `/projects/${projectId}/kb/search`,
    { params },
  )
  return data
}

// ===========================================================================
// Story Workflows
// ===========================================================================

export async function getStoryWorkflow(projectId: string): Promise<StoryWorkflow> {
  const { data } = await apiClient.get<StoryWorkflow>(`/projects/${projectId}/kb/story-workflow`)
  return data
}

export async function createStoryWorkflowStatus(
  projectId: string,
  body: {
    name: string
    category?: string
    color?: string
    position?: number
    is_initial?: boolean
    is_terminal?: boolean
  },
): Promise<StoryWorkflowStatus> {
  const { data } = await apiClient.post<StoryWorkflowStatus>(
    `/projects/${projectId}/kb/story-workflow/statuses`,
    body,
  )
  return data
}

export async function updateStoryWorkflowStatus(
  projectId: string,
  statusId: string,
  body: Partial<{
    name: string
    category: string
    color: string
    position: number
    is_initial: boolean
    is_terminal: boolean
  }>,
): Promise<StoryWorkflowStatus> {
  const { data } = await apiClient.patch<StoryWorkflowStatus>(
    `/projects/${projectId}/kb/story-workflow/statuses/${statusId}`,
    body,
  )
  return data
}

export async function deleteStoryWorkflowStatus(
  projectId: string,
  statusId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/kb/story-workflow/statuses/${statusId}`)
}

// ===========================================================================
// Page Meta
// ===========================================================================

export async function getPageMeta(pageId: string): Promise<PageMetaFull | null> {
  const { data } = await apiClient.get<PageMetaFull | null>(`/kb/pages/${pageId}/meta`)
  return data
}

export async function updatePageMeta(
  pageId: string,
  body: { story_workflow_status_id: string },
): Promise<PageMetaFull> {
  const { data } = await apiClient.patch<PageMetaFull>(`/kb/pages/${pageId}/meta`, body)
  return data
}

// ===========================================================================
// Ticket Links
// ===========================================================================

export async function listTicketLinks(pageId: string): Promise<PageTicketLink[]> {
  const { data } = await apiClient.get<PageTicketLink[]>(`/kb/pages/${pageId}/ticket-links`)
  return data
}

export async function createTicketLink(
  pageId: string,
  body: { ticket_id: string; note?: string },
): Promise<PageTicketLink> {
  const { data } = await apiClient.post<PageTicketLink>(`/kb/pages/${pageId}/ticket-links`, body)
  return data
}

export async function deleteTicketLink(pageId: string, linkId: string): Promise<void> {
  await apiClient.delete(`/kb/pages/${pageId}/ticket-links/${linkId}`)
}

// ===========================================================================
// Reverse Lookup: Ticket -> User Stories
// ===========================================================================

export async function getUserStoriesForTicket(ticketId: string): Promise<UserStoryForTicket[]> {
  const { data } = await apiClient.get<UserStoryForTicket[]>(`/tickets/${ticketId}/user-stories`)
  return data
}
