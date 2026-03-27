import apiClient from './client';
export async function listComments(ticketId, offset = 0, limit = 50) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/comments`, { params: { offset, limit } });
    return data;
}
export async function createComment(ticketId, body) {
    const { data } = await apiClient.post(`/tickets/${ticketId}/comments`, { body });
    return data;
}
export async function updateComment(commentId, body) {
    const { data } = await apiClient.patch(`/comments/${commentId}`, { body });
    return data;
}
export async function deleteComment(commentId) {
    await apiClient.delete(`/comments/${commentId}`);
}
