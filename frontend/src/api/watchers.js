import apiClient from './client';
export async function listWatchers(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/watchers`);
    return data;
}
export async function addWatcher(ticketId, userId) {
    const { data } = await apiClient.post(`/tickets/${ticketId}/watchers`, { user_id: userId });
    return data;
}
export async function removeWatcher(ticketId, userId) {
    await apiClient.delete(`/tickets/${ticketId}/watchers/${userId}`);
}
