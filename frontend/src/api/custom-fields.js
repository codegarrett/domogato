import apiClient from './client';
export async function listFieldDefinitions(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/custom-fields`);
    return data;
}
export async function createFieldDefinition(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/custom-fields`, body);
    return data;
}
export async function updateFieldDefinition(fieldId, body) {
    const { data } = await apiClient.patch(`/custom-fields/${fieldId}`, body);
    return data;
}
export async function deleteFieldDefinition(fieldId) {
    await apiClient.delete(`/custom-fields/${fieldId}`);
}
export async function reorderFieldDefinitions(projectId, fieldIds) {
    const { data } = await apiClient.put(`/projects/${projectId}/custom-fields/reorder`, fieldIds);
    return data;
}
export async function addFieldOption(fieldId, body) {
    const { data } = await apiClient.post(`/custom-fields/${fieldId}/options`, body);
    return data;
}
export async function removeFieldOption(optionId) {
    await apiClient.delete(`/custom-fields/options/${optionId}`);
}
export async function getTicketCustomFields(ticketId) {
    const { data } = await apiClient.get(`/tickets/${ticketId}/custom-fields`);
    return data;
}
export async function setTicketCustomFields(ticketId, values) {
    const { data } = await apiClient.put(`/tickets/${ticketId}/custom-fields`, { values });
    return data;
}
