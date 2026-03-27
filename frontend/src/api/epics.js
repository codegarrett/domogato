import apiClient from './client';
export async function listEpics(projectId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/projects/${projectId}/epics`, { params: { offset, limit } });
    return data;
}
export async function getEpic(epicId) {
    const { data } = await apiClient.get(`/epics/${epicId}`);
    return data;
}
export async function createEpic(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/epics`, payload);
    return data;
}
export async function updateEpic(epicId, payload) {
    const { data } = await apiClient.patch(`/epics/${epicId}`, payload);
    return data;
}
export async function deleteEpic(epicId) {
    await apiClient.delete(`/epics/${epicId}`);
}
