import apiClient from './client';
export async function globalSearch(q, opts) {
    const params = { q };
    if (opts?.types)
        params.types = opts.types;
    if (opts?.project_id)
        params.project_id = opts.project_id;
    if (opts?.limit)
        params.limit = opts.limit;
    const { data } = await apiClient.get('/search', { params });
    return data;
}
