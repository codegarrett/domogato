import apiClient from './client';
export async function listActivity(ticketId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/activity`, { params: { offset, limit } });
    return data;
}
