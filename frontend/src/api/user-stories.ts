import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'
import type { Ticket } from '@/api/tickets'

export interface UserStoryQuestion {
  id: string
  text: string
  position: number
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

export interface UserStoryDiscussion {
  id: string
  author_id: string | null
  author_name: string | null
  body: string
  applies_to_all_questions: boolean
  question_ids: string[]
  created_at: string
  updated_at: string
}

export interface UserStoryDependency {
  story_id: string
  depends_on_id: string
  depends_on_title: string | null
  created_at: string
}

export interface UserStoryChildBrief {
  id: string
  title: string
  status: string
  priority: string
}

export interface UserStoryTicketLink {
  ticket_id: string
  ticket_key: string | null
  ticket_title: string | null
  created_at: string
}

export interface UserStory {
  id: string
  project_id: string
  title: string
  quick_notes: string | null
  story_title: string | null
  story_body: string | null
  story_acceptance_criteria: string | null
  status: string
  priority: string
  parent_id: string | null
  parent_title: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  questions: UserStoryQuestion[]
  discussions: UserStoryDiscussion[]
  dependencies: UserStoryDependency[]
  children: UserStoryChildBrief[]
  linked_tickets: UserStoryTicketLink[]
}

export interface UserStoryListItem {
  id: string
  project_id: string
  title: string
  status: string
  priority: string
  parent_id: string | null
  parent_title: string | null
  created_by_name: string | null
  question_count: number
  child_count: number
  created_at: string
  updated_at: string
}

export interface UserStoryForTicket {
  id: string
  title: string
  story_title: string | null
  status: string
  priority: string
  project_id: string
}

export interface UserStoryListParams {
  status?: string
  priority?: string
  parent_id?: string
  top_level_only?: boolean
  q?: string
  sort_by?: string
  sort_dir?: string
  offset?: number
  limit?: number
}

export interface UserStoryCreate {
  title: string
}

export interface UserStoryUpdate {
  title?: string
  quick_notes?: string | null
  story_title?: string | null
  story_body?: string | null
  story_acceptance_criteria?: string | null
  status?: string
  priority?: string
  parent_id?: string | null
}

export async function createUserStory(
  projectId: string,
  body: UserStoryCreate,
): Promise<UserStory> {
  const { data } = await apiClient.post<UserStory>(
    `/projects/${projectId}/user-stories`,
    body,
  )
  return data
}

export async function listUserStories(
  projectId: string,
  params?: UserStoryListParams,
): Promise<PaginatedResponse<UserStoryListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<UserStoryListItem>>(
    `/projects/${projectId}/user-stories`,
    { params },
  )
  return data
}

export async function getUserStory(
  projectId: string,
  storyId: string,
): Promise<UserStory> {
  const { data } = await apiClient.get<UserStory>(
    `/projects/${projectId}/user-stories/${storyId}`,
  )
  return data
}

export async function updateUserStory(
  projectId: string,
  storyId: string,
  body: UserStoryUpdate,
): Promise<UserStory> {
  const { data } = await apiClient.patch<UserStory>(
    `/projects/${projectId}/user-stories/${storyId}`,
    body,
  )
  return data
}

export async function cancelUserStory(projectId: string, storyId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/user-stories/${storyId}`)
}

export async function addUserStoryQuestion(
  projectId: string,
  storyId: string,
  text: string,
): Promise<UserStoryQuestion> {
  const { data } = await apiClient.post<UserStoryQuestion>(
    `/projects/${projectId}/user-stories/${storyId}/questions`,
    { text },
  )
  return data
}

export async function deleteUserStoryQuestion(
  projectId: string,
  storyId: string,
  questionId: string,
): Promise<void> {
  await apiClient.delete(
    `/projects/${projectId}/user-stories/${storyId}/questions/${questionId}`,
  )
}

export async function addUserStoryDiscussion(
  projectId: string,
  storyId: string,
  body: { body: string; question_ids?: string[]; applies_to_all_questions?: boolean },
): Promise<UserStoryDiscussion> {
  const { data } = await apiClient.post<UserStoryDiscussion>(
    `/projects/${projectId}/user-stories/${storyId}/discussions`,
    body,
  )
  return data
}

export async function addUserStoryDependency(
  projectId: string,
  storyId: string,
  dependsOnId: string,
): Promise<UserStoryDependency> {
  const { data } = await apiClient.post<UserStoryDependency>(
    `/projects/${projectId}/user-stories/${storyId}/dependencies`,
    { depends_on_id: dependsOnId },
  )
  return data
}

export async function removeUserStoryDependency(
  projectId: string,
  storyId: string,
  dependsOnId: string,
): Promise<void> {
  await apiClient.delete(
    `/projects/${projectId}/user-stories/${storyId}/dependencies/${dependsOnId}`,
  )
}

export async function createTicketsFromUserStories(
  projectId: string,
  userStoryIds: string[],
  ticketType = 'story',
): Promise<Ticket[]> {
  const { data } = await apiClient.post<Ticket[]>(
    `/projects/${projectId}/user-stories/create-tickets`,
    { user_story_ids: userStoryIds, ticket_type: ticketType },
  )
  return data
}

export async function getUserStoriesForTicket(ticketId: string): Promise<UserStoryForTicket[]> {
  const { data } = await apiClient.get<UserStoryForTicket[]>(
    `/tickets/${ticketId}/user-stories`,
  )
  return data
}
