import apiClient from './client'

export interface BoardColumn {
  id: string
  board_id: string
  workflow_status_id: string
  position: number
  wip_limit: number | null
  is_collapsed: boolean
}

export interface Board {
  id: string
  project_id: string
  name: string
  board_type: 'kanban' | 'scrum'
  filter_config: Record<string, unknown>
  is_default: boolean
  columns: BoardColumn[]
  created_at: string
  updated_at: string
}

export interface BoardTicket {
  id: string
  ticket_key: string
  title: string
  ticket_type: string
  priority: string
  assignee_id: string | null
  story_points: number | null
  board_rank: string
}

export async function listBoards(projectId: string): Promise<Board[]> {
  const { data } = await apiClient.get<Board[]>(`/projects/${projectId}/boards`)
  return data
}

export async function createBoard(projectId: string, body: { name: string; board_type?: string }): Promise<Board> {
  const { data } = await apiClient.post<Board>(`/projects/${projectId}/boards`, body)
  return data
}

export async function createDefaultBoard(projectId: string, workflowId: string): Promise<Board> {
  const { data } = await apiClient.post<Board>(`/projects/${projectId}/boards/default`, null, { params: { workflow_id: workflowId } })
  return data
}

export async function getBoard(boardId: string): Promise<Board> {
  const { data } = await apiClient.get<Board>(`/boards/${boardId}`)
  return data
}

export async function deleteBoard(boardId: string): Promise<void> {
  await apiClient.delete(`/boards/${boardId}`)
}

export async function getBoardTickets(boardId: string, sprintId?: string): Promise<Record<string, BoardTicket[]>> {
  const params: Record<string, string> = {}
  if (sprintId) params.sprint_id = sprintId
  const { data } = await apiClient.get<Record<string, BoardTicket[]>>(`/boards/${boardId}/tickets`, { params })
  return data
}

export async function moveTicket(ticketId: string, toStatusId: string, boardRank: string = 'm'): Promise<void> {
  await apiClient.post(`/boards/tickets/${ticketId}/move`, { to_status_id: toStatusId, board_rank: boardRank })
}
