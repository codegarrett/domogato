import apiClient from './client';
export async function listBoards(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/boards`);
    return data;
}
export async function createBoard(projectId, body) {
    const { data } = await apiClient.post(`/projects/${projectId}/boards`, body);
    return data;
}
export async function createDefaultBoard(projectId, workflowId) {
    const { data } = await apiClient.post(`/projects/${projectId}/boards/default`, null, { params: { workflow_id: workflowId } });
    return data;
}
export async function getBoard(boardId) {
    const { data } = await apiClient.get(`/boards/${boardId}`);
    return data;
}
export async function deleteBoard(boardId) {
    await apiClient.delete(`/boards/${boardId}`);
}
export async function getBoardTickets(boardId, sprintId) {
    const params = {};
    if (sprintId)
        params.sprint_id = sprintId;
    const { data } = await apiClient.get(`/boards/${boardId}/tickets`, { params });
    return data;
}
export async function moveTicket(ticketId, toStatusId, boardRank = 'm') {
    await apiClient.post(`/boards/tickets/${ticketId}/move`, { to_status_id: toStatusId, board_rank: boardRank });
}
