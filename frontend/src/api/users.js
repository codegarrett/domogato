import apiClient from './client';
export async function updateCurrentUser(payload) {
    const { data } = await apiClient.patch('/users/me', payload);
    return data;
}
export async function requestAvatarUpload(filename, contentType) {
    const { data } = await apiClient.post('/users/me/avatar', {
        filename,
        content_type: contentType,
    });
    return data;
}
export async function confirmAvatarUpload(avatarKey) {
    const { data } = await apiClient.post('/users/me/avatar/confirm', {
        avatar_key: avatarKey,
    });
    return data;
}
export async function deleteAvatar() {
    await apiClient.delete('/users/me/avatar');
}
export async function getAccountUrls() {
    const { data } = await apiClient.get('/auth/account-url');
    return data;
}
export async function listUsers(offset = 0, limit = 50, q) {
    const { data } = await apiClient.get('/users', {
        params: { offset, limit, q },
    });
    return data;
}
export async function getUser(userId) {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data;
}
export async function adminUpdateUser(userId, payload) {
    const { data } = await apiClient.patch(`/users/${userId}`, payload);
    return data;
}
