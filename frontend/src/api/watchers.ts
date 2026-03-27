import apiClient from './client'

export interface Watcher {
  user_id: string
  display_name: string | null
  created_at: string
}

export async function listWatchers(ticketId: string): Promise<Watcher[]> {
  const { data } = await apiClient.get<Watcher[]>(`/tickets/${ticketId}/watchers`)
  return data
}

export async function addWatcher(ticketId: string, userId: string): Promise<Watcher> {
  const { data } = await apiClient.post<Watcher>(`/tickets/${ticketId}/watchers`, { user_id: userId })
  return data
}

export async function removeWatcher(ticketId: string, userId: string): Promise<void> {
  await apiClient.delete(`/tickets/${ticketId}/watchers/${userId}`)
}
