import apiClient from './client';
export async function getProjectAuditLog(projectId, params) {
    const { data } = await apiClient.get(`/projects/${projectId}/audit-log`, { params });
    return data;
}
