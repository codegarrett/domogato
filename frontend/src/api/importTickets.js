import apiClient from './client';
export async function analyzeImport(projectId, content, format) {
    const { data } = await apiClient.post(`/projects/${projectId}/import/analyze`, { content, format });
    return data;
}
export async function executeImport(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/import/execute`, payload);
    return data;
}
