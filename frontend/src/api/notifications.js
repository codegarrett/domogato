import apiClient from './client';
export async function listNotifications(params) {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
}
export async function getUnreadCount() {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data.unread_count;
}
export async function markAsRead(notificationId) {
    await apiClient.post(`/notifications/${notificationId}/read`);
}
export async function markAllRead() {
    const { data } = await apiClient.post('/notifications/read-all');
    return data;
}
