import apiClient from './client';
export async function listOrganizations(offset = 0, limit = 50) {
    const { data } = await apiClient.get('/organizations', { params: { offset, limit } });
    return data;
}
export async function getOrganization(orgId) {
    const { data } = await apiClient.get(`/organizations/${orgId}`);
    return data;
}
export async function createOrganization(payload) {
    const { data } = await apiClient.post('/organizations', payload);
    return data;
}
export async function updateOrganization(orgId, payload) {
    const { data } = await apiClient.patch(`/organizations/${orgId}`, payload);
    return data;
}
export async function deleteOrganization(orgId) {
    await apiClient.delete(`/organizations/${orgId}`);
}
export async function listOrgMembers(orgId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/organizations/${orgId}/members`, { params: { offset, limit } });
    return data;
}
export async function addOrgMember(orgId, payload) {
    const { data } = await apiClient.post(`/organizations/${orgId}/members`, payload);
    return data;
}
export async function updateOrgMemberRole(orgId, userId, role) {
    const { data } = await apiClient.patch(`/organizations/${orgId}/members/${userId}`, { role });
    return data;
}
export async function removeOrgMember(orgId, userId) {
    await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
}
