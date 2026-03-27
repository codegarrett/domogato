import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useToastService } from '@/composables/useToast';
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});
apiClient.interceptors.request.use((config) => {
    const { accessToken } = useAuth();
    if (accessToken.value) {
        config.headers.Authorization = `Bearer ${accessToken.value}`;
    }
    return config;
});
function formatValidationErrors(detail) {
    return detail
        .map((err) => {
        const field = err.loc?.slice(1).join('.') || 'unknown field';
        return `${field}: ${err.msg}`;
    })
        .join('\n');
}
apiClient.interceptors.response.use((response) => response, async (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    if (status === 401) {
        const { isLocalMode, setLocalToken, loggedOut } = useAuth();
        if (isLocalMode.value && !loggedOut.value) {
            loggedOut.value = true;
            setLocalToken(null);
            window.location.href = '/auth/login';
        }
    }
    else if (status === 422 && Array.isArray(data?.detail)) {
        const toast = useToastService();
        toast.showError('Validation Error', formatValidationErrors(data.detail));
    }
    else if (status === 409) {
        const toast = useToastService();
        const msg = data?.error?.message || data?.detail || 'Resource conflict';
        toast.showError('Conflict', msg);
    }
    else if (status === 503) {
        const toast = useToastService();
        const msg = data?.error?.message || data?.detail || 'Service temporarily unavailable';
        toast.showError('Service Unavailable', typeof msg === 'string' ? msg : 'A backend service is temporarily unavailable. Please try again in a few moments.');
    }
    else if (status && status >= 500 && status !== 503) {
        const toast = useToastService();
        toast.showError('Server Error', 'An unexpected server error occurred. Please try again later.');
    }
    else if (status && status >= 400 && status !== 401) {
        const toast = useToastService();
        const msg = data?.error?.message || data?.detail || `Request failed (${status})`;
        toast.showError('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    else if (!error.response) {
        const toast = useToastService();
        toast.showError('Network Error', 'Unable to reach the server. Please check your connection.');
    }
    return Promise.reject(error);
});
export default apiClient;
