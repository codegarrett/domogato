import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchAIConfig, listConversations, getConversation, deleteConversation as apiDeleteConversation, sendChatMessage, } from '@/api/ai';
export const useChatStore = defineStore('chat', () => {
    const aiConfig = ref(null);
    const conversations = ref([]);
    const activeConversationId = ref(null);
    const messages = ref([]);
    const streamingContent = ref('');
    const streamingReasoning = ref('');
    const activeToolCall = ref(null);
    const pendingInteraction = ref(null);
    const isStreaming = ref(false);
    const isOpen = ref(false);
    const isLoading = ref(false);
    const view = ref('list');
    const isConfigured = computed(() => aiConfig.value?.is_configured ?? false);
    async function loadConfig() {
        try {
            aiConfig.value = await fetchAIConfig();
        }
        catch {
            aiConfig.value = null;
        }
    }
    async function loadConversations() {
        isLoading.value = true;
        try {
            const result = await listConversations(0, 50);
            conversations.value = result.items;
        }
        catch {
            conversations.value = [];
        }
        finally {
            isLoading.value = false;
        }
    }
    async function openConversation(id) {
        isLoading.value = true;
        activeConversationId.value = id;
        view.value = 'chat';
        try {
            const detail = await getConversation(id);
            messages.value = detail.messages;
        }
        catch {
            messages.value = [];
        }
        finally {
            isLoading.value = false;
        }
    }
    function newConversation() {
        activeConversationId.value = null;
        messages.value = [];
        streamingContent.value = '';
        streamingReasoning.value = '';
        view.value = 'chat';
    }
    function goToList() {
        view.value = 'list';
        activeConversationId.value = null;
        messages.value = [];
        streamingContent.value = '';
        streamingReasoning.value = '';
    }
    async function sendMessage(content) {
        if (isStreaming.value || !content.trim())
            return;
        pendingInteraction.value = null;
        const userMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: content.trim(),
            model: null,
            prompt_tokens: null,
            completion_tokens: null,
            tool_calls: null,
            created_at: new Date().toISOString(),
        };
        messages.value.push(userMessage);
        isStreaming.value = true;
        streamingContent.value = '';
        streamingReasoning.value = '';
        try {
            await sendChatMessage(activeConversationId.value, content.trim(), (event) => {
                switch (event.type) {
                    case 'conversation':
                        if (event.conversation_id) {
                            activeConversationId.value = event.conversation_id;
                        }
                        break;
                    case 'reasoning':
                        if (event.content) {
                            streamingReasoning.value += event.content;
                        }
                        break;
                    case 'tool_start':
                        activeToolCall.value = {
                            name: event.name || '',
                            arguments: event.arguments,
                        };
                        break;
                    case 'tool_result':
                        activeToolCall.value = null;
                        break;
                    case 'choice_request':
                        pendingInteraction.value = {
                            type: 'choice',
                            question: event.question,
                            options: event.options,
                        };
                        break;
                    case 'approval_request':
                        pendingInteraction.value = {
                            type: 'approval',
                            action: event.action,
                            details: event.details,
                        };
                        break;
                    case 'chunk':
                        if (event.content) {
                            streamingContent.value += event.content;
                        }
                        break;
                    case 'done': {
                        const assistantMessage = {
                            id: event.message_id || crypto.randomUUID(),
                            role: 'assistant',
                            content: streamingContent.value,
                            model: event.model || null,
                            prompt_tokens: event.prompt_tokens || null,
                            completion_tokens: event.completion_tokens || null,
                            tool_calls: null,
                            created_at: new Date().toISOString(),
                        };
                        messages.value.push(assistantMessage);
                        streamingContent.value = '';
                        streamingReasoning.value = '';
                        activeToolCall.value = null;
                        break;
                    }
                    case 'error':
                        streamingContent.value = '';
                        streamingReasoning.value = '';
                        activeToolCall.value = null;
                        pendingInteraction.value = null;
                        break;
                }
            });
        }
        catch {
            streamingContent.value = '';
            streamingReasoning.value = '';
        }
        finally {
            isStreaming.value = false;
            loadConversations();
        }
    }
    async function deleteConversation(id) {
        try {
            await apiDeleteConversation(id);
            conversations.value = conversations.value.filter((c) => c.id !== id);
            if (activeConversationId.value === id) {
                goToList();
            }
        }
        catch {
            // handled by api client interceptor
        }
    }
    function toggle() {
        isOpen.value = !isOpen.value;
        if (isOpen.value && aiConfig.value === null) {
            loadConfig();
        }
        if (isOpen.value) {
            loadConversations();
        }
    }
    return {
        aiConfig,
        conversations,
        activeConversationId,
        messages,
        streamingContent,
        streamingReasoning,
        activeToolCall,
        pendingInteraction,
        isStreaming,
        isOpen,
        isLoading,
        view,
        isConfigured,
        loadConfig,
        loadConversations,
        openConversation,
        newConversation,
        goToList,
        sendMessage,
        deleteConversation,
        toggle,
    };
});
