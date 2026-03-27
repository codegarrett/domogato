import apiClient from './client';
export async function listWorkflows(orgId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/organizations/${orgId}/workflows`, { params: { offset, limit } });
    return data;
}
export async function getWorkflow(workflowId) {
    const { data } = await apiClient.get(`/workflows/${workflowId}`);
    return data;
}
export async function createWorkflow(orgId, payload) {
    const { data } = await apiClient.post(`/organizations/${orgId}/workflows`, payload);
    return data;
}
export async function updateWorkflow(workflowId, payload) {
    const { data } = await apiClient.patch(`/workflows/${workflowId}`, payload);
    return data;
}
export async function deleteWorkflow(workflowId) {
    await apiClient.delete(`/workflows/${workflowId}`);
}
export async function addStatus(workflowId, payload) {
    const { data } = await apiClient.post(`/workflows/${workflowId}/statuses`, payload);
    return data;
}
export async function updateStatus(statusId, payload) {
    const { data } = await apiClient.patch(`/workflows/statuses/${statusId}`, payload);
    return data;
}
export async function removeStatus(statusId) {
    await apiClient.delete(`/workflows/statuses/${statusId}`);
}
export async function addTransition(workflowId, payload) {
    const { data } = await apiClient.post(`/workflows/${workflowId}/transitions`, payload);
    return data;
}
export async function removeTransition(transitionId) {
    await apiClient.delete(`/workflows/transitions/${transitionId}`);
}
export async function validateWorkflow(workflowId) {
    const { data } = await apiClient.get(`/workflows/${workflowId}/validate`);
    return data;
}
export async function seedDefaultWorkflows(orgId) {
    const { data } = await apiClient.post(`/organizations/${orgId}/workflows/seed`);
    return data;
}
