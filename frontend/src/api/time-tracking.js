import apiClient from './client';
export async function logTime(ticketId, body) {
    const { data } = await apiClient.post(`/tickets/${ticketId}/time-logs`, body);
    return data;
}
export async function listTimeLogs(ticketId, params) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/time-logs`, { params });
    return data;
}
export async function getTimeSummary(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/time-summary`);
    return data;
}
export async function updateTimeLog(logId, body) {
    const { data } = await apiClient.patch(`/time-logs/${logId}`, body);
    return data;
}
export async function deleteTimeLog(logId) {
    await apiClient.delete(`/time-logs/${logId}`);
}
export async function getProjectTimeReport(projectId, params) {
    const { data } = await apiClient.get(`/projects/${projectId}/time-report`, { params });
    return data;
}
export async function getMyTimesheet(startDate, endDate) {
    const { data } = await apiClient.get('/users/me/timesheet', {
        params: { start_date: startDate, end_date: endDate },
    });
    return data;
}
