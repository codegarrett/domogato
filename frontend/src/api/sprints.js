import apiClient from './client';
export async function listSprints(projectId, params) {
    const { data } = await apiClient.get(`/projects/${projectId}/sprints`, { params });
    return data;
}
export async function createSprint(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/sprints`, body);
    return data;
}
export async function getSprintDetail(sprintId) {
    const { data } = await apiClient.get(`/sprints/${sprintId}`);
    return data;
}
export async function updateSprint(sprintId, body) {
    const { data } = await apiClient.patch(`/sprints/${sprintId}`, body);
    return data;
}
export async function deleteSprint(sprintId) {
    await apiClient.delete(`/sprints/${sprintId}`);
}
export async function startSprint(sprintId) {
    const { data } = await apiClient.post(`/sprints/${sprintId}/start`);
    return data;
}
export async function completeSprint(sprintId, moveIncompleteTo = 'backlog') {
    const { data } = await apiClient.post(`/sprints/${sprintId}/complete`, { move_incomplete_to: moveIncompleteTo });
    return data;
}
export async function getBacklog(projectId, params) {
    const { data } = await apiClient.get(`/projects/${projectId}/backlog`, { params });
    return data;
}
export async function reorderBacklog(projectId, ticketIds) {
    await apiClient.post(`/projects/${projectId}/backlog/reorder`, { ticket_ids: ticketIds });
}
export async function moveToSprint(projectId, ticketIds, sprintId) {
    const { data } = await apiClient.post(`/projects/${projectId}/backlog/move-to-sprint`, { ticket_ids: ticketIds, sprint_id: sprintId });
    return data;
}
