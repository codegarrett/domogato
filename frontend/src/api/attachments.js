import apiClient from './client';
export async function createAttachment(ticketId, body) {
    const { data } = await apiClient.post(`/tickets/${ticketId}/attachments`, body);
    return data;
}
export async function uploadToPresignedUrl(uploadUrl, file) {
    await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
    });
}
export async function listAttachments(ticketId, params) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/attachments`, { params });
    return data;
}
export async function getDownloadUrl(attachmentId) {
    const { data } = await apiClient.get(`/attachments/${attachmentId}/download`);
    return data.download_url;
}
export async function deleteAttachment(attachmentId) {
    await apiClient.delete(`/attachments/${attachmentId}`);
}
export function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
