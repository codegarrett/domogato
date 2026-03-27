import apiClient from './client';
export async function getNotificationPreferences() {
    const { data } = await apiClient.get('/users/me/notification-preferences');
    return data;
}
export async function updateNotificationPreferences(prefs) {
    const { data } = await apiClient.put('/users/me/notification-preferences', prefs);
    return data;
}
