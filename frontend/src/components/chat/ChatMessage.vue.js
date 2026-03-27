import { computed } from 'vue';
import { marked } from 'marked';
const props = defineProps();
const renderedContent = computed(() => {
    try {
        return marked.parse(props.content, { async: false });
    }
    catch {
        return props.content;
    }
});
const formattedTime = computed(() => {
    if (!props.createdAt)
        return '';
    const date = new Date(props.createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['chat-message--user']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message--assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-message" },
    ...{ class: ([`chat-message--${__VLS_ctx.role}`]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-message-bubble" },
});
if (__VLS_ctx.role === 'assistant') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "chat-message-content" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderedContent) }, null, null);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-message-content chat-message-content--plain" },
    });
    (__VLS_ctx.content);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-message-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "chat-message-time" },
});
(__VLS_ctx.formattedTime);
/** @type {__VLS_StyleScopedClasses['chat-message']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-content--plain']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-message-time']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            renderedContent: renderedContent,
            formattedTime: formattedTime,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
