import apiClient from './client';
export async function getTimeline(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/timeline`);
    return data;
}
