import apiClient from '@/api/client';
import { useAuth } from '@/composables/useAuth';
export async function fetchAIConfig() {
    const response = await apiClient.get('/ai/config');
    return response.data;
}
export async function listConversations(offset = 0, limit = 20) {
    const response = await apiClient.get('/ai/conversations', {
        params: { offset, limit },
    });
    return response.data;
}
export async function getConversation(id) {
    const response = await apiClient.get(`/ai/conversations/${id}`);
    return response.data;
}
export async function deleteConversation(id) {
    await apiClient.delete(`/ai/conversations/${id}`);
}
export async function sendChatMessage(conversationId, message, onEvent) {
    const { accessToken } = useAuth();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const response = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken.value ?? ''}`,
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            message,
        }),
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: '))
                continue;
            try {
                const data = JSON.parse(trimmed.slice(6));
                onEvent(data);
            }
            catch {
                // skip malformed events
            }
        }
    }
    if (buffer.trim().startsWith('data: ')) {
        try {
            const data = JSON.parse(buffer.trim().slice(6));
            onEvent(data);
        }
        catch {
            // skip
        }
    }
}
