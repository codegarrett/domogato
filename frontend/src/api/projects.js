import apiClient from './client';
export async function listProjects(orgId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/organizations/${orgId}/projects`, { params: { offset, limit } });
    return data;
}
export async function getProject(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}`);
    return data;
}
export async function createProject(orgId, payload) {
    const { data } = await apiClient.post(`/organizations/${orgId}/projects`, payload);
    return data;
}
export async function updateProject(projectId, payload) {
    const { data } = await apiClient.patch(`/projects/${projectId}`, payload);
    return data;
}
export async function archiveProject(projectId) {
    await apiClient.post(`/projects/${projectId}/archive`);
}
export async function unarchiveProject(projectId) {
    await apiClient.post(`/projects/${projectId}/unarchive`);
}
export async function listProjectMembers(projectId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/projects/${projectId}/members`, { params: { offset, limit } });
    return data;
}
export async function addProjectMember(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/members`, payload);
    return data;
}
export async function updateProjectMemberRole(projectId, userId, role) {
    const { data } = await apiClient.patch(`/projects/${projectId}/members/${userId}`, { role });
    return data;
}
export async function removeProjectMember(projectId, userId) {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
}
