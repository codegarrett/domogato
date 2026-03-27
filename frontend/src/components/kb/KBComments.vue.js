import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import RichTextEditor from '@/components/editor/RichTextEditor.vue';
import KBCommentItem from './KBCommentItem.vue';
import { listComments, createComment, updateComment, deleteComment, } from '@/api/kb';
const { t } = useI18n();
const props = defineProps();
const comments = ref([]);
const loading = ref(false);
const submitting = ref(false);
const newCommentBody = ref('');
const replyingTo = ref(null);
async function load() {
    loading.value = true;
    try {
        comments.value = await listComments(props.pageId);
    }
    finally {
        loading.value = false;
    }
}
async function addComment() {
    if (!newCommentBody.value.trim())
        return;
    submitting.value = true;
    try {
        const body = {
            body: newCommentBody.value,
        };
        if (replyingTo.value)
            body.parent_comment_id = replyingTo.value;
        await createComment(props.pageId, body);
        newCommentBody.value = '';
        replyingTo.value = null;
        await load();
    }
    finally {
        submitting.value = false;
    }
}
function onReply(commentId) {
    replyingTo.value = commentId;
}
function cancelReply() {
    replyingTo.value = null;
}
function findCommentById(id, tree) {
    for (const c of tree) {
        if (c.id === id)
            return c;
        const found = findCommentById(id, c.replies);
        if (found)
            return found;
    }
    return undefined;
}
async function onEdit(comment) {
    const newBody = prompt('Edit comment:', comment.body);
    if (newBody !== null && newBody.trim()) {
        await updateComment(comment.id, { body: newBody });
        await load();
    }
}
async function onDelete(commentId) {
    if (!confirm('Delete this comment?'))
        return;
    await deleteComment(commentId);
    await load();
}
watch(() => props.pageId, load);
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['reply-indicator']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kb-comments" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "m-0 mb-3" },
});
(__VLS_ctx.$t('kb.comments'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "new-comment mb-4" },
});
if (__VLS_ctx.replyingTo) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reply-indicator flex align-items-center gap-2 mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-reply text-xs text-color-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs text-color-secondary" },
    });
    (__VLS_ctx.t('kb.replyingTo', { name: __VLS_ctx.findCommentById(__VLS_ctx.replyingTo, __VLS_ctx.comments)?.author.display_name ?? '…' }));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.cancelReply) },
        ...{ class: "p-link text-xs text-color-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-times" },
    });
}
/** @type {[typeof RichTextEditor, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(RichTextEditor, new RichTextEditor({
    modelValue: (__VLS_ctx.newCommentBody),
    placeholder: (__VLS_ctx.replyingTo ? __VLS_ctx.t('kb.replyPlaceholder') : __VLS_ctx.t('kb.commentPlaceholder')),
}));
const __VLS_1 = __VLS_0({
    modelValue: (__VLS_ctx.newCommentBody),
    placeholder: (__VLS_ctx.replyingTo ? __VLS_ctx.t('kb.replyPlaceholder') : __VLS_ctx.t('kb.commentPlaceholder')),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex justify-content-end mt-2" },
});
const __VLS_3 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('common.submit')),
    size: "small",
    icon: "pi pi-send",
    disabled: (!__VLS_ctx.newCommentBody.trim()),
    loading: (__VLS_ctx.submitting),
}));
const __VLS_5 = __VLS_4({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('common.submit')),
    size: "small",
    icon: "pi pi-send",
    disabled: (!__VLS_ctx.newCommentBody.trim()),
    loading: (__VLS_ctx.submitting),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
let __VLS_7;
let __VLS_8;
let __VLS_9;
const __VLS_10 = {
    onClick: (...[$event]) => {
        __VLS_ctx.addComment();
    }
};
var __VLS_6;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-4" },
    });
    const __VLS_11 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({}));
    const __VLS_13 = __VLS_12({}, ...__VLS_functionalComponentArgsRest(__VLS_12));
}
else if (__VLS_ctx.comments.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-color-secondary text-center py-4" },
    });
    (__VLS_ctx.$t('kb.noComments'));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "comment-list" },
    });
    for (const [comment] of __VLS_getVForSourceType((__VLS_ctx.comments))) {
        /** @type {[typeof KBCommentItem, ]} */ ;
        // @ts-ignore
        const __VLS_15 = __VLS_asFunctionalComponent(KBCommentItem, new KBCommentItem({
            ...{ 'onReply': {} },
            ...{ 'onEdit': {} },
            ...{ 'onDelete': {} },
            key: (comment.id),
            comment: (comment),
            depth: (0),
        }));
        const __VLS_16 = __VLS_15({
            ...{ 'onReply': {} },
            ...{ 'onEdit': {} },
            ...{ 'onDelete': {} },
            key: (comment.id),
            comment: (comment),
            depth: (0),
        }, ...__VLS_functionalComponentArgsRest(__VLS_15));
        let __VLS_18;
        let __VLS_19;
        let __VLS_20;
        const __VLS_21 = {
            onReply: (__VLS_ctx.onReply)
        };
        const __VLS_22 = {
            onEdit: (__VLS_ctx.onEdit)
        };
        const __VLS_23 = {
            onDelete: (__VLS_ctx.onDelete)
        };
        var __VLS_17;
    }
}
/** @type {__VLS_StyleScopedClasses['kb-comments']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['new-comment']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-reply']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-link']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['comment-list']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            ProgressSpinner: ProgressSpinner,
            RichTextEditor: RichTextEditor,
            KBCommentItem: KBCommentItem,
            t: t,
            comments: comments,
            loading: loading,
            submitting: submitting,
            newCommentBody: newCommentBody,
            replyingTo: replyingTo,
            addComment: addComment,
            onReply: onReply,
            cancelReply: cancelReply,
            findCommentById: findCommentById,
            onEdit: onEdit,
            onDelete: onDelete,
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
