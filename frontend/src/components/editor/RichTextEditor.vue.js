import { watch, onBeforeUnmount, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
const { t } = useI18n();
const props = withDefaults(defineProps(), {
    modelValue: '',
    readonly: false,
});
const emit = defineEmits();
const resolvedPlaceholder = computed(() => props.placeholder ?? t('editor.placeholder'));
const isFocused = ref(false);
const editor = useEditor({
    content: props.modelValue,
    editable: !props.readonly,
    extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: resolvedPlaceholder.value }),
        Link.configure({ openOnClick: false }),
        Underline,
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
    ],
    onUpdate: ({ editor: e }) => {
        emit('update:modelValue', e.getHTML());
    },
    onFocus: () => { isFocused.value = true; },
    onBlur: () => { isFocused.value = false; },
});
watch(resolvedPlaceholder, (val) => {
    if (!editor.value)
        return;
    const placeholderExt = editor.value.extensionManager.extensions.find((e) => e.name === 'placeholder');
    if (placeholderExt)
        placeholderExt.options.placeholder = val;
});
watch(() => props.modelValue, (val) => {
    if (editor.value && editor.value.getHTML() !== val) {
        editor.value.commands.setContent(val || '', { emitUpdate: false });
    }
});
watch(() => props.readonly, (val) => {
    editor.value?.setEditable(!val);
});
onBeforeUnmount(() => {
    editor.value?.destroy();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    modelValue: '',
    readonly: false,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rich-text-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['selectedCell']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
/** @type {__VLS_StyleScopedClasses['tiptap']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rich-text-editor" },
    ...{ class: ({ 'editor-focused': __VLS_ctx.isFocused }) },
});
if (__VLS_ctx.editor && !__VLS_ctx.readonly) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "editor-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleBold().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('bold') }) },
        title: (__VLS_ctx.$t('editor.bold')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-bold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleItalic().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('italic') }) },
        title: (__VLS_ctx.$t('editor.italic')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-italic" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleUnderline().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('underline') }) },
        title: (__VLS_ctx.$t('editor.underline')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-underline" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleStrike().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('strike') }) },
        title: (__VLS_ctx.$t('editor.strikethrough')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-minus" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "toolbar-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleHeading({ level: 2 }).run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('heading', { level: 2 }) }) },
        title: (__VLS_ctx.$t('editor.heading2')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleHeading({ level: 3 }).run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('heading', { level: 3 }) }) },
        title: (__VLS_ctx.$t('editor.heading3')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "toolbar-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleBulletList().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('bulletList') }) },
        title: (__VLS_ctx.$t('editor.bulletList')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleOrderedList().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('orderedList') }) },
        title: (__VLS_ctx.$t('editor.orderedList')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-sort-numeric-up" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleTaskList().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('taskList') }) },
        title: (__VLS_ctx.$t('editor.taskList')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-check-square" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "toolbar-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleBlockquote().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('blockquote') }) },
        title: (__VLS_ctx.$t('editor.blockquote')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-align-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().toggleCodeBlock().run();
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.editor.isActive('codeBlock') }) },
        title: (__VLS_ctx.$t('editor.codeBlock')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-code" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().setHorizontalRule().run();
            } },
        type: "button",
        title: (__VLS_ctx.$t('editor.horizontalRule')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "toolbar-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            } },
        type: "button",
        title: (__VLS_ctx.$t('editor.insertTable')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-table" },
    });
    if (__VLS_ctx.editor.isActive('table')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                        return;
                    if (!(__VLS_ctx.editor.isActive('table')))
                        return;
                    __VLS_ctx.editor.chain().focus().addColumnAfter().run();
                } },
            type: "button",
            title: (__VLS_ctx.$t('editor.addColumn')),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "toolbar-icon-text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                        return;
                    if (!(__VLS_ctx.editor.isActive('table')))
                        return;
                    __VLS_ctx.editor.chain().focus().addRowAfter().run();
                } },
            type: "button",
            title: (__VLS_ctx.$t('editor.addRow')),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "toolbar-icon-text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                        return;
                    if (!(__VLS_ctx.editor.isActive('table')))
                        return;
                    __VLS_ctx.editor.chain().focus().deleteColumn().run();
                } },
            type: "button",
            title: (__VLS_ctx.$t('editor.deleteColumn')),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "toolbar-icon-text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                        return;
                    if (!(__VLS_ctx.editor.isActive('table')))
                        return;
                    __VLS_ctx.editor.chain().focus().deleteRow().run();
                } },
            type: "button",
            title: (__VLS_ctx.$t('editor.deleteRow')),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "toolbar-icon-text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                        return;
                    if (!(__VLS_ctx.editor.isActive('table')))
                        return;
                    __VLS_ctx.editor.chain().focus().deleteTable().run();
                } },
            type: "button",
            title: (__VLS_ctx.$t('editor.deleteTable')),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-trash" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "toolbar-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().undo().run();
            } },
        type: "button",
        disabled: (!__VLS_ctx.editor.can().undo()),
        title: (__VLS_ctx.$t('editor.undo')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-undo" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.editor && !__VLS_ctx.readonly))
                    return;
                __VLS_ctx.editor.chain().focus().redo().run();
            } },
        type: "button",
        disabled: (!__VLS_ctx.editor.can().redo()),
        title: (__VLS_ctx.$t('editor.redo')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-refresh" },
    });
}
const __VLS_0 = {}.EditorContent;
/** @type {[typeof __VLS_components.EditorContent, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    editor: (__VLS_ctx.editor),
    ...{ class: "editor-content" },
}));
const __VLS_2 = __VLS_1({
    editor: (__VLS_ctx.editor),
    ...{ class: "editor-content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['rich-text-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-italic']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-underline']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-minus']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-list']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-sort-numeric-up']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check-square']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-align-right']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-code']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-table']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-icon-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-icon-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-icon-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-icon-text']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-trash']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-group']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-undo']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-refresh']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            EditorContent: EditorContent,
            isFocused: isFocused,
            editor: editor,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
