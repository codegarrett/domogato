import { computed } from 'vue';
import Avatar from 'primevue/avatar';
const props = defineProps();
const emit = defineEmits();
const initials = computed(() => {
    const name = props.comment.author.display_name || '?';
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
});
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['comment-item']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-actions']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "comment-item" },
    ...{ style: ({ marginLeft: __VLS_ctx.depth * 24 + 'px' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "comment-header flex align-items-center gap-2 mb-1" },
});
const __VLS_0 = {}.Avatar;
/** @type {[typeof __VLS_components.Avatar, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    label: (__VLS_ctx.initials),
    image: (__VLS_ctx.comment.author.avatar_url || undefined),
    shape: "circle",
    size: "small",
    ...{ class: "flex-shrink-0" },
}));
const __VLS_2 = __VLS_1({
    label: (__VLS_ctx.initials),
    image: (__VLS_ctx.comment.author.avatar_url || undefined),
    shape: "circle",
    size: "small",
    ...{ class: "flex-shrink-0" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "font-semibold text-sm" },
});
(__VLS_ctx.comment.author.display_name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-xs text-color-secondary" },
});
(__VLS_ctx.formatDate(__VLS_ctx.comment.created_at));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "comment-body text-sm mb-1" },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.comment.is_deleted
        ? '<em class=\'text-color-secondary\'>Comment deleted</em>'
        : __VLS_ctx.comment.body) }, null, null);
if (!__VLS_ctx.comment.is_deleted) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "comment-actions flex gap-2 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.comment.is_deleted))
                    return;
                __VLS_ctx.emit('reply', __VLS_ctx.comment.id);
            } },
        ...{ class: "p-link text-xs text-color-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.comment.is_deleted))
                    return;
                __VLS_ctx.emit('edit', __VLS_ctx.comment);
            } },
        ...{ class: "p-link text-xs text-color-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.comment.is_deleted))
                    return;
                __VLS_ctx.emit('delete', __VLS_ctx.comment.id);
            } },
        ...{ class: "p-link text-xs text-red-500" },
    });
}
for (const [reply] of __VLS_getVForSourceType((__VLS_ctx.comment.replies))) {
    const __VLS_4 = {}.KBCommentItem;
    /** @type {[typeof __VLS_components.KBCommentItem, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ 'onReply': {} },
        ...{ 'onEdit': {} },
        ...{ 'onDelete': {} },
        key: (reply.id),
        comment: (reply),
        depth: (__VLS_ctx.depth + 1),
    }));
    const __VLS_6 = __VLS_5({
        ...{ 'onReply': {} },
        ...{ 'onEdit': {} },
        ...{ 'onDelete': {} },
        key: (reply.id),
        comment: (reply),
        depth: (__VLS_ctx.depth + 1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    let __VLS_8;
    let __VLS_9;
    let __VLS_10;
    const __VLS_11 = {
        onReply: ((id) => __VLS_ctx.emit('reply', id))
    };
    const __VLS_12 = {
        onEdit: ((c) => __VLS_ctx.emit('edit', c))
    };
    const __VLS_13 = {
        onDelete: ((id) => __VLS_ctx.emit('delete', id))
    };
    var __VLS_7;
}
/** @type {__VLS_StyleScopedClasses['comment-item']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-header']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Avatar: Avatar,
            emit: emit,
            initials: initials,
            formatDate: formatDate,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
