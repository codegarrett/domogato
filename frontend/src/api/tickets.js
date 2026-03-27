import apiClient from './client';
export async function listTickets(projectId, params = {}) {
    const { data } = await apiClient.get(`/projects/${projectId}/tickets`, { params });
    return data;
}
export async function getTicket(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}`);
    return data;
}
export async function createTicket(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/tickets`, payload);
    return data;
}
export async function updateTicket(ticketId, payload) {
    const { data } = await apiClient.patch(`/tickets/${ticketId}`, payload);
    return data;
}
export async function deleteTicket(ticketId) {
    await apiClient.delete(`/tickets/${ticketId}`);
}
export async function transitionStatus(ticketId, payload) {
    const { data } = await apiClient.post(`/tickets/${ticketId}/transition`, payload);
    return data;
}
export async function getTicketChildren(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/children`);
    return data;
}
export async function bulkUpdateTickets(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/tickets/bulk`, payload);
    return data;
}
export async function searchTickets(projectId, q, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/projects/${projectId}/tickets/search`, { params: { q, offset, limit } });
    return data;
}
export async function exportTicketsCsv(projectId) {
    const response = await apiClient.get(`/projects/${projectId}/tickets/export`, {
        responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets_${projectId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
