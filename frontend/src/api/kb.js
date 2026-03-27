import apiClient from './client';
// ===========================================================================
// Spaces
// ===========================================================================
export async function listSpaces(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/kb/spaces`);
    return data;
}
export async function listRecentPages(projectId, limit = 10) {
    const { data } = await apiClient.get(`/projects/${projectId}/kb/recent-pages`, {
        params: { limit },
    });
    return data;
}
export async function createSpace(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/kb/spaces`, body);
    return data;
}
export async function getSpace(projectId, slug) {
    const { data } = await apiClient.get(`/projects/${projectId}/kb/spaces/${slug}`);
    return data;
}
export async function updateSpace(projectId, slug, body) {
    const { data } = await apiClient.patch(`/projects/${projectId}/kb/spaces/${slug}`, body);
    return data;
}
export async function archiveSpace(projectId, slug) {
    const { data } = await apiClient.delete(`/projects/${projectId}/kb/spaces/${slug}`);
    return data;
}
// ===========================================================================
// Pages
// ===========================================================================
export async function getPageTree(spaceId) {
    const { data } = await apiClient.get(`/kb/spaces/${spaceId}/pages`);
    return data;
}
export async function createPage(spaceId, body) {
    const { data } = await apiClient.post(`/kb/spaces/${spaceId}/pages`, body);
    return data;
}
export async function getPage(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}`);
    return data;
}
export async function updatePage(pageId, body) {
    const { data } = await apiClient.patch(`/kb/pages/${pageId}`, body);
    return data;
}
export async function deletePage(pageId) {
    await apiClient.delete(`/kb/pages/${pageId}`);
}
export async function movePage(pageId, body) {
    const { data } = await apiClient.post(`/kb/pages/${pageId}/move`, body);
    return data;
}
export async function getPageChildren(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/children`);
    return data;
}
export async function getPageAncestors(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/ancestors`);
    return data;
}
export async function listVersions(pageId, params) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/versions`, { params });
    if (Array.isArray(data)) {
        return { items: data, total: data.length };
    }
    return data;
}
export async function getVersion(pageId, versionId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/versions/${versionId}`);
    return data;
}
export async function restoreVersion(pageId, versionId) {
    const { data } = await apiClient.post(`/kb/pages/${pageId}/versions/${versionId}/restore`);
    return data;
}
export async function diffVersions(pageId, v1Id, v2Id) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/versions/${v1Id}/diff/${v2Id}`);
    return data;
}
// ===========================================================================
// Comments
// ===========================================================================
export async function listComments(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/comments`);
    return data;
}
export async function createComment(pageId, body) {
    const { data } = await apiClient.post(`/kb/pages/${pageId}/comments`, body);
    return data;
}
export async function updateComment(commentId, body) {
    const { data } = await apiClient.patch(`/kb/comments/${commentId}`, body);
    return data;
}
export async function deleteComment(commentId) {
    await apiClient.delete(`/kb/comments/${commentId}`);
}
// ===========================================================================
// Attachments
// ===========================================================================
export async function createAttachment(pageId, body) {
    const { data } = await apiClient.post(`/kb/pages/${pageId}/attachments`, body);
    return data;
}
export async function listAttachments(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/attachments`);
    return data;
}
export async function downloadAttachment(attachmentId) {
    const { data } = await apiClient.get(`/kb/attachments/${attachmentId}/download`);
    return data;
}
export async function deleteAttachment(attachmentId) {
    await apiClient.delete(`/kb/attachments/${attachmentId}`);
}
// ===========================================================================
// Templates
// ===========================================================================
export async function listTemplates(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/kb/templates`);
    return data;
}
export async function createTemplate(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/kb/templates`, body);
    return data;
}
export async function getTemplate(templateId) {
    const { data } = await apiClient.get(`/kb/templates/${templateId}`);
    return data;
}
export async function updateTemplate(templateId, body) {
    const { data } = await apiClient.patch(`/kb/templates/${templateId}`, body);
    return data;
}
export async function deleteTemplate(templateId) {
    await apiClient.delete(`/kb/templates/${templateId}`);
}
// ===========================================================================
// Search
// ===========================================================================
export async function searchKB(projectId, params) {
    const { data } = await apiClient.get(`/projects/${projectId}/kb/search`, { params });
    return data;
}
// ===========================================================================
// Story Workflows
// ===========================================================================
export async function getStoryWorkflow(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/kb/story-workflow`);
    return data;
}
export async function createStoryWorkflowStatus(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/kb/story-workflow/statuses`, body);
    return data;
}
export async function updateStoryWorkflowStatus(projectId, statusId, body) {
    const { data } = await apiClient.patch(`/projects/${projectId}/kb/story-workflow/statuses/${statusId}`, body);
    return data;
}
export async function deleteStoryWorkflowStatus(projectId, statusId) {
    await apiClient.delete(`/projects/${projectId}/kb/story-workflow/statuses/${statusId}`);
}
// ===========================================================================
// Page Meta
// ===========================================================================
export async function getPageMeta(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/meta`);
    return data;
}
export async function updatePageMeta(pageId, body) {
    const { data } = await apiClient.patch(`/kb/pages/${pageId}/meta`, body);
    return data;
}
// ===========================================================================
// Ticket Links
// ===========================================================================
export async function listTicketLinks(pageId) {
    const { data } = await apiClient.get(`/kb/pages/${pageId}/ticket-links`);
    return data;
}
export async function createTicketLink(pageId, body) {
    const { data } = await apiClient.post(`/kb/pages/${pageId}/ticket-links`, body);
    return data;
}
export async function deleteTicketLink(pageId, linkId) {
    await apiClient.delete(`/kb/pages/${pageId}/ticket-links/${linkId}`);
}
// ===========================================================================
// Reverse Lookup: Ticket -> User Stories
// ===========================================================================
export async function getUserStoriesForTicket(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/user-stories`);
    return data;
}
