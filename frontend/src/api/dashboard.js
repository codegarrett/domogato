import apiClient from './client';
export async function getDashboard() {
    const { data } = await apiClient.get('/users/me/dashboard');
    return data;
}
