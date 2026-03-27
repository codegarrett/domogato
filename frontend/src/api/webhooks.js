import apiClient from './client';
export async function listWebhooks(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/webhooks`);
    return data;
}
export async function createWebhook(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/webhooks`, body);
    return data;
}
export async function getWebhook(webhookId) {
    const { data } = await apiClient.get(`/webhooks/${webhookId}`);
    return data;
}
export async function updateWebhook(webhookId, body) {
    const { data } = await apiClient.patch(`/webhooks/${webhookId}`, body);
    return data;
}
export async function deleteWebhook(webhookId) {
    await apiClient.delete(`/webhooks/${webhookId}`);
}
export async function listDeliveries(webhookId, params) {
    const { data } = await apiClient.get(`/webhooks/${webhookId}/deliveries`, { params });
    return data;
}
export async function testWebhook(webhookId) {
    const { data } = await apiClient.post(`/webhooks/${webhookId}/test`, { event_type: 'test' });
    return data;
}
