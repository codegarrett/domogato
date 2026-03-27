import apiClient from './client';
export async function listSavedViews(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/views`);
    return data;
}
export async function createSavedView(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/views`, body);
    return data;
}
export async function updateSavedView(viewId, body) {
    const { data } = await apiClient.put(`/views/${viewId}`, body);
    return data;
}
export async function deleteSavedView(viewId) {
    await apiClient.delete(`/views/${viewId}`);
}
