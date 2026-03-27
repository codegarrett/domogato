import apiClient from './client';
export async function listLabels(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/labels`);
    return data;
}
export async function listTicketLabels(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/labels`);
    return data;
}
export async function createLabel(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/labels`, payload);
    return data;
}
export async function updateLabel(labelId, payload) {
    const { data } = await apiClient.patch(`/labels/${labelId}`, payload);
    return data;
}
export async function deleteLabel(labelId) {
    await apiClient.delete(`/labels/${labelId}`);
}
export async function addLabelToTicket(ticketId, labelId) {
    await apiClient.post(`/tickets/${ticketId}/labels/${labelId}`);
}
export async function removeLabelFromTicket(ticketId, labelId) {
    await apiClient.delete(`/tickets/${ticketId}/labels/${labelId}`);
}
