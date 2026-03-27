import apiClient from './client'

export interface Dependency {
  id: string
  blocking_ticket_id: string
  blocked_ticket_id: string
  dependency_type: string
  created_at: string
  blocking_ticket_title: string | null
  blocking_ticket_key: string | null
  blocked_ticket_title: string | null
  blocked_ticket_key: string | null
}

export interface DependencyCreate {
  blocked_ticket_id: string
  dependency_type: 'blocks' | 'blocked_by' | 'relates_to'
}

export async function createDependency(
  ticketId: string,
  body: DependencyCreate,
): Promise<Dependency> {
  const { data } = await apiClient.post<Dependency>(
    `/tickets/${ticketId}/dependencies`,
    body,
  )
  return data
}

export async function listDependencies(ticketId: string): Promise<Dependency[]> {
  const { data } = await apiClient.get<Dependency[]>(
    `/tickets/${ticketId}/dependencies`,
  )
  return data
}

export async function deleteDependency(dependencyId: string): Promise<void> {
  await apiClient.delete(`/dependencies/${dependencyId}`)
}
