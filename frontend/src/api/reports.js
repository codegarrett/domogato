import apiClient from './client';
export async function getSprintReport(projectId, sprintId) {
    const { data } = await apiClient.get(`/projects/${projectId}/sprints/${sprintId}/report`);
    return data;
}
export async function getProjectSummary(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/summary`);
    return data;
}
export async function getVelocityReport(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/velocity`);
    return data;
}
export async function getBurndownReport(sprintId) {
    const { data } = await apiClient.get(`/sprints/${sprintId}/reports/burndown`);
    return data;
}
export async function getCumulativeFlowReport(projectId, startDate, endDate) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/cumulative-flow`, { params: { start_date: startDate, end_date: endDate } });
    return data;
}
export async function getCycleTimeReport(projectId, params) {
    const { data } = await apiClient.get(`/projects/${projectId}/reports/cycle-time`, { params });
    return data;
}
