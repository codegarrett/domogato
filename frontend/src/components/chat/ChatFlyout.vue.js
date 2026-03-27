import { watch, ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import { useChatStore } from '@/stores/chat';
import ChatMessage from '@/components/chat/ChatMessage.vue';
import ChatInput from '@/components/chat/ChatInput.vue';
const { t } = useI18n();
const chatStore = useChatStore();
const messagesContainer = ref();
const reasoningExpanded = ref(true);
const TOOL_DISPLAY_NAMES = {
    list_my_projects: 'ai.toolListProjects',
    search_tickets: 'ai.toolSearchTickets',
    get_ticket_details: 'ai.toolGetTicket',
    get_sprint_status: 'ai.toolSprintStatus',
    search_knowledge_base: 'ai.toolSearchKB',
    semantic_search_kb: 'ai.toolSemanticSearchKB',
    create_ticket: 'ai.toolCreateTicket',
    update_ticket: 'ai.toolUpdateTicket',
    transition_ticket_status: 'ai.toolTransitionStatus',
};
function toolDisplayName(name) {
    const key = TOOL_DISPLAY_NAMES[name];
    return key ? t(key) : name.replace(/_/g, ' ');
}
const showOtherInput = ref(false);
const otherInputValue = ref('');
function submitOther() {
    if (otherInputValue.value.trim()) {
        chatStore.sendMessage(otherInputValue.value.trim());
        otherInputValue.value = '';
        showOtherInput.value = false;
    }
}
function formatDetailKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
const expandedToolResults = ref({});
function toggleToolResult(msgId) {
    expandedToolResults.value[msgId] = !expandedToolResults.value[msgId];
}
function toolResultLabel(msg) {
    const tc = msg.tool_calls;
    const name = tc?.name;
    if (name) {
        const displayKey = TOOL_DISPLAY_NAMES[name];
        const displayName = displayKey ? t(displayKey) : name.replace(/_/g, ' ');
        return displayName.replace(/\.{3}$/, '') + ' Result';
    }
    return 'Tool Result';
}
function formatToolResult(content) {
    try {
        return JSON.stringify(JSON.parse(content), null, 2);
    }
    catch {
        return content;
    }
}
function formatRelative(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1)
        return 'just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
        return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
function scrollToBottom() {
    nextTick(() => {
        const el = messagesContainer.value;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    });
}
watch(() => chatStore.messages.length, () => scrollToBottom());
watch(() => chatStore.streamingContent, () => scrollToBottom());
watch(() => chatStore.streamingReasoning, () => scrollToBottom());
watch(() => chatStore.activeToolCall, () => scrollToBottom());
watch(() => chatStore.isStreaming, (streaming) => {
    if (streaming)
        reasoningExpanded.value = true;
});
watch(() => chatStore.activeConversationId, () => {
    expandedToolResults.value = {};
    showOtherInput.value = false;
    otherInputValue.value = '';
});
watch(() => chatStore.pendingInteraction, () => {
    showOtherInput.value = false;
    otherInputValue.value = '';
    scrollToBottom();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['chat-conv-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-reasoning-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-reasoning-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-result-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-result-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-activity']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--other']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-other-input']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--submit']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-approval-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--approve']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--reject']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Drawer;
/** @type {[typeof __VLS_components.Drawer, typeof __VLS_components.Drawer, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    visible: (__VLS_ctx.chatStore.isOpen),
    position: "right",
    header: (__VLS_ctx.$t('ai.assistant')),
    ...{ class: "chat-flyout" },
    ...{ style: ({ width: '420px' }) },
    modal: (false),
    dismissable: (true),
}));
const __VLS_2 = __VLS_1({
    visible: (__VLS_ctx.chatStore.isOpen),
    position: "right",
    header: (__VLS_ctx.$t('ai.assistant')),
    ...{ class: "chat-flyout" },
    ...{ style: ({ width: '420px' }) },
    modal: (false),
    dismissable: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
{
    const { header: __VLS_thisSlot } = __VLS_3.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-flyout-header" },
    });
    if (__VLS_ctx.chatStore.view === 'chat') {
        const __VLS_5 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
            ...{ 'onClick': {} },
            icon: "pi pi-arrow-left",
            text: true,
            size: "small",
            'aria-label': (__VLS_ctx.$t('ai.back')),
        }));
        const __VLS_7 = __VLS_6({
            ...{ 'onClick': {} },
            icon: "pi pi-arrow-left",
            text: true,
            size: "small",
            'aria-label': (__VLS_ctx.$t('ai.back')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_6));
        let __VLS_9;
        let __VLS_10;
        let __VLS_11;
        const __VLS_12 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.chatStore.view === 'chat'))
                    return;
                __VLS_ctx.chatStore.goToList();
            }
        };
        var __VLS_8;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "chat-flyout-title" },
    });
    (__VLS_ctx.$t('ai.assistant'));
    if (__VLS_ctx.chatStore.view === 'list') {
        const __VLS_13 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            text: true,
            size: "small",
            'aria-label': (__VLS_ctx.$t('ai.newConversation')),
        }));
        const __VLS_15 = __VLS_14({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            text: true,
            size: "small",
            'aria-label': (__VLS_ctx.$t('ai.newConversation')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
        let __VLS_17;
        let __VLS_18;
        let __VLS_19;
        const __VLS_20 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.chatStore.view === 'list'))
                    return;
                __VLS_ctx.chatStore.newConversation();
            }
        };
        var __VLS_16;
    }
}
if (__VLS_ctx.chatStore.view === 'list') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-flyout-list" },
    });
    if (__VLS_ctx.chatStore.isLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-flyout-loading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-spin pi-spinner" },
        });
    }
    else if (__VLS_ctx.chatStore.conversations.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-flyout-empty" },
        });
        (__VLS_ctx.$t('ai.noConversations'));
    }
    else {
        for (const [conv] of __VLS_getVForSourceType((__VLS_ctx.chatStore.conversations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.chatStore.view === 'list'))
                            return;
                        if (!!(__VLS_ctx.chatStore.isLoading))
                            return;
                        if (!!(__VLS_ctx.chatStore.conversations.length === 0))
                            return;
                        __VLS_ctx.chatStore.openConversation(conv.id);
                    } },
                key: (conv.id),
                ...{ class: "chat-conv-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-conv-item-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "chat-conv-title" },
            });
            (conv.title || 'Untitled');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "chat-conv-meta" },
            });
            if (conv.model) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "chat-conv-model" },
                });
                (conv.model);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "chat-conv-time" },
            });
            (__VLS_ctx.formatRelative(conv.updated_at));
            const __VLS_21 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                text: true,
                severity: "danger",
                size: "small",
                ...{ class: "chat-conv-delete" },
            }));
            const __VLS_23 = __VLS_22({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                text: true,
                severity: "danger",
                size: "small",
                ...{ class: "chat-conv-delete" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_22));
            let __VLS_25;
            let __VLS_26;
            let __VLS_27;
            const __VLS_28 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.chatStore.view === 'list'))
                        return;
                    if (!!(__VLS_ctx.chatStore.isLoading))
                        return;
                    if (!!(__VLS_ctx.chatStore.conversations.length === 0))
                        return;
                    __VLS_ctx.chatStore.deleteConversation(conv.id);
                }
            };
            var __VLS_24;
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-flyout-chat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "messagesContainer",
        ...{ class: "chat-messages" },
    });
    /** @type {typeof __VLS_ctx.messagesContainer} */ ;
    for (const [msg] of __VLS_getVForSourceType((__VLS_ctx.chatStore.messages))) {
        (msg.id);
        if (msg.role === 'assistant' && msg.tool_calls && !msg.content) {
        }
        else if (msg.role === 'tool') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-tool-result" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.chatStore.view === 'list'))
                            return;
                        if (!!(msg.role === 'assistant' && msg.tool_calls && !msg.content))
                            return;
                        if (!(msg.role === 'tool'))
                            return;
                        __VLS_ctx.toggleToolResult(msg.id);
                    } },
                ...{ class: "chat-tool-result-toggle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-wrench" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.toolResultLabel(msg));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: (__VLS_ctx.expandedToolResults[msg.id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right') },
                ...{ class: "chat-tool-result-chevron" },
            });
            if (__VLS_ctx.expandedToolResults[msg.id]) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                    ...{ class: "chat-tool-result-data" },
                });
                (__VLS_ctx.formatToolResult(msg.content));
            }
        }
        else {
            /** @type {[typeof ChatMessage, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(ChatMessage, new ChatMessage({
                role: msg.role,
                content: (msg.content),
                createdAt: (msg.created_at),
            }));
            const __VLS_30 = __VLS_29({
                role: msg.role,
                content: (msg.content),
                createdAt: (msg.created_at),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
    }
    if (__VLS_ctx.chatStore.isStreaming && __VLS_ctx.chatStore.activeToolCall) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-tool-activity" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-search" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.toolDisplayName(__VLS_ctx.chatStore.activeToolCall.name));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-thinking-dots" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
    }
    if (__VLS_ctx.chatStore.isStreaming && __VLS_ctx.chatStore.streamingReasoning) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-reasoning" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.chatStore.view === 'list'))
                        return;
                    if (!(__VLS_ctx.chatStore.isStreaming && __VLS_ctx.chatStore.streamingReasoning))
                        return;
                    __VLS_ctx.reasoningExpanded = !__VLS_ctx.reasoningExpanded;
                } },
            ...{ class: "chat-reasoning-toggle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: (__VLS_ctx.reasoningExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right') },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-reasoning-label" },
        });
        (__VLS_ctx.$t('ai.thinking'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-thinking-dots" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        if (__VLS_ctx.reasoningExpanded) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-reasoning-content" },
            });
            (__VLS_ctx.chatStore.streamingReasoning);
        }
    }
    if (__VLS_ctx.chatStore.streamingContent) {
        /** @type {[typeof ChatMessage, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(ChatMessage, new ChatMessage({
            role: "assistant",
            content: (__VLS_ctx.chatStore.streamingContent),
        }));
        const __VLS_33 = __VLS_32({
            role: "assistant",
            content: (__VLS_ctx.chatStore.streamingContent),
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    }
    if (__VLS_ctx.chatStore.isStreaming && !__VLS_ctx.chatStore.streamingContent && !__VLS_ctx.chatStore.streamingReasoning) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-thinking" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-thinking-dots" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
        (__VLS_ctx.$t('ai.thinking'));
    }
    if (__VLS_ctx.chatStore.pendingInteraction) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-interaction" },
        });
        if (__VLS_ctx.chatStore.pendingInteraction.type === 'choice') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-interaction-question" },
            });
            (__VLS_ctx.chatStore.pendingInteraction.question);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-interaction-options" },
            });
            for (const [option, idx] of __VLS_getVForSourceType((__VLS_ctx.chatStore.pendingInteraction.options))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.chatStore.view === 'list'))
                                return;
                            if (!(__VLS_ctx.chatStore.pendingInteraction))
                                return;
                            if (!(__VLS_ctx.chatStore.pendingInteraction.type === 'choice'))
                                return;
                            __VLS_ctx.chatStore.sendMessage(option);
                        } },
                    key: (idx),
                    ...{ class: "chat-interaction-btn chat-interaction-btn--option" },
                });
                (option);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.chatStore.view === 'list'))
                            return;
                        if (!(__VLS_ctx.chatStore.pendingInteraction))
                            return;
                        if (!(__VLS_ctx.chatStore.pendingInteraction.type === 'choice'))
                            return;
                        __VLS_ctx.showOtherInput = true;
                    } },
                ...{ class: "chat-interaction-btn chat-interaction-btn--other" },
            });
            (__VLS_ctx.$t('ai.otherOption'));
            if (__VLS_ctx.showOtherInput) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "chat-interaction-other" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onKeydown: (__VLS_ctx.submitOther) },
                    value: (__VLS_ctx.otherInputValue),
                    type: "text",
                    ...{ class: "chat-interaction-other-input" },
                    placeholder: (__VLS_ctx.$t('ai.typeYourOption')),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.submitOther) },
                    ...{ class: "chat-interaction-btn chat-interaction-btn--submit" },
                    disabled: (!__VLS_ctx.otherInputValue.trim()),
                });
                (__VLS_ctx.$t('ai.submitOption'));
            }
        }
        if (__VLS_ctx.chatStore.pendingInteraction.type === 'approval') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-interaction-approval" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-interaction-approval-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-shield" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.$t('ai.approvalRequired'));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-interaction-approval-action" },
            });
            (__VLS_ctx.chatStore.pendingInteraction.action);
            if (__VLS_ctx.chatStore.pendingInteraction.details && Object.keys(__VLS_ctx.chatStore.pendingInteraction.details).length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "chat-interaction-approval-details" },
                });
                for (const [val, key] of __VLS_getVForSourceType((__VLS_ctx.chatStore.pendingInteraction.details))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (String(key)),
                        ...{ class: "chat-interaction-detail-row" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "chat-interaction-detail-key" },
                    });
                    (__VLS_ctx.formatDetailKey(String(key)));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "chat-interaction-detail-value" },
                    });
                    (val);
                }
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "chat-interaction-approval-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.chatStore.view === 'list'))
                            return;
                        if (!(__VLS_ctx.chatStore.pendingInteraction))
                            return;
                        if (!(__VLS_ctx.chatStore.pendingInteraction.type === 'approval'))
                            return;
                        __VLS_ctx.chatStore.sendMessage('Yes, go ahead');
                    } },
                ...{ class: "chat-interaction-btn chat-interaction-btn--approve" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-check" },
            });
            (__VLS_ctx.$t('ai.approve'));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.chatStore.view === 'list'))
                            return;
                        if (!(__VLS_ctx.chatStore.pendingInteraction))
                            return;
                        if (!(__VLS_ctx.chatStore.pendingInteraction.type === 'approval'))
                            return;
                        __VLS_ctx.chatStore.sendMessage('No, cancel that');
                    } },
                ...{ class: "chat-interaction-btn chat-interaction-btn--reject" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-times" },
            });
            (__VLS_ctx.$t('ai.reject'));
        }
    }
    /** @type {[typeof ChatInput, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(ChatInput, new ChatInput({
        ...{ 'onSend': {} },
        disabled: (__VLS_ctx.chatStore.isStreaming),
    }));
    const __VLS_36 = __VLS_35({
        ...{ 'onSend': {} },
        disabled: (__VLS_ctx.chatStore.isStreaming),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    let __VLS_38;
    let __VLS_39;
    let __VLS_40;
    const __VLS_41 = {
        onSend: (...[$event]) => {
            if (!!(__VLS_ctx.chatStore.view === 'list'))
                return;
            __VLS_ctx.chatStore.sendMessage($event);
        }
    };
    var __VLS_37;
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['chat-flyout']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-flyout-header']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-flyout-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-flyout-list']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-flyout-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-flyout-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-item']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-item-body']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-title']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-model']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-time']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-conv-delete']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-flyout-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-messages']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-result']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-result-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-wrench']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-result-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-result-data']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-tool-activity']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-reasoning']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-reasoning-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-reasoning-label']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-reasoning-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-thinking-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-question']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-options']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--option']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--other']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-other']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-other-input']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--submit']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-approval']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-approval-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shield']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-approval-action']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-approval-details']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-detail-row']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-detail-key']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-detail-value']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-approval-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--approve']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-interaction-btn--reject']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Drawer: Drawer,
            Button: Button,
            ChatMessage: ChatMessage,
            ChatInput: ChatInput,
            chatStore: chatStore,
            messagesContainer: messagesContainer,
            reasoningExpanded: reasoningExpanded,
            toolDisplayName: toolDisplayName,
            showOtherInput: showOtherInput,
            otherInputValue: otherInputValue,
            submitOther: submitOther,
            formatDetailKey: formatDetailKey,
            expandedToolResults: expandedToolResults,
            toggleToolResult: toggleToolResult,
            toolResultLabel: toolResultLabel,
            formatToolResult: formatToolResult,
            formatRelative: formatRelative,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
