import apiClient from './client';
export async function createDependency(ticketId, body) {
    const { data } = await apiClient.post(`/tickets/${ticketId}/dependencies`, body);
    return data;
}
export async function listDependencies(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/dependencies`);
    return data;
}
export async function deleteDependency(dependencyId) {
    await apiClient.delete(`/dependencies/${dependencyId}`);
}
