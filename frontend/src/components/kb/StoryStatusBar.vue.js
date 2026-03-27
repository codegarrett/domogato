import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getStoryWorkflow, updatePageMeta, } from '@/api/kb';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
const props = defineProps();
const emit = defineEmits();
const { t } = useI18n();
const statuses = ref([]);
const selectedStatusId = ref(null);
const loading = ref(false);
const editing = ref(false);
const currentStatus = computed(() => {
    if (!props.meta?.story_status)
        return null;
    return props.meta.story_status;
});
onMounted(async () => {
    try {
        const workflow = await getStoryWorkflow(props.projectId);
        statuses.value = workflow.statuses;
        selectedStatusId.value = props.meta.story_workflow_status_id;
    }
    catch {
        // workflow may not exist yet
    }
});
function startEdit() {
    selectedStatusId.value = props.meta.story_workflow_status_id;
    editing.value = true;
}
async function commitChange() {
    if (!selectedStatusId.value || selectedStatusId.value === props.meta.story_workflow_status_id) {
        editing.value = false;
        return;
    }
    loading.value = true;
    try {
        const updated = await updatePageMeta(props.pageId, {
            story_workflow_status_id: selectedStatusId.value,
        });
        const brief = {
            id: updated.id,
            page_type: updated.page_type,
            story_workflow_status_id: updated.story_workflow_status_id,
            story_status: updated.story_status
                ? {
                    id: updated.story_status.id,
                    name: updated.story_status.name,
                    category: updated.story_status.category,
                    color: updated.story_status.color,
                }
                : null,
            ticket_link_count: updated.ticket_link_count,
        };
        emit('updated', brief);
        editing.value = false;
    }
    finally {
        loading.value = false;
    }
}
function severityForCategory(cat) {
    switch (cat) {
        case 'draft': return 'secondary';
        case 'review': return 'warn';
        case 'ready': return 'info';
        case 'ticketed': return 'success';
        default: return 'secondary';
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "story-status-bar flex align-items-center gap-2 mb-3 py-2 px-3 border-round surface-50" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-clipboard text-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-sm font-semibold" },
});
(__VLS_ctx.t('kb.storyStatus'));
if (!__VLS_ctx.editing) {
    if (__VLS_ctx.currentStatus) {
        const __VLS_0 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onClick': {} },
            value: (__VLS_ctx.currentStatus.name),
            severity: (__VLS_ctx.severityForCategory(__VLS_ctx.currentStatus.category)),
            ...{ class: "cursor-pointer" },
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onClick': {} },
            value: (__VLS_ctx.currentStatus.name),
            severity: (__VLS_ctx.severityForCategory(__VLS_ctx.currentStatus.category)),
            ...{ class: "cursor-pointer" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        let __VLS_4;
        let __VLS_5;
        let __VLS_6;
        const __VLS_7 = {
            onClick: (__VLS_ctx.startEdit)
        };
        var __VLS_3;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (__VLS_ctx.startEdit) },
            ...{ class: "text-color-secondary text-sm cursor-pointer" },
        });
        (__VLS_ctx.t('kb.setStatus'));
    }
}
else {
    const __VLS_8 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.selectedStatusId),
        options: (__VLS_ctx.statuses),
        optionLabel: "name",
        optionValue: "id",
        ...{ class: "w-12rem" },
        size: "small",
        loading: (__VLS_ctx.loading),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.selectedStatusId),
        options: (__VLS_ctx.statuses),
        optionLabel: "name",
        optionValue: "id",
        ...{ class: "w-12rem" },
        size: "small",
        loading: (__VLS_ctx.loading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onChange: (__VLS_ctx.commitChange)
    };
    var __VLS_11;
}
/** @type {__VLS_StyleScopedClasses['story-status-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-50']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-clipboard']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12rem']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Select: Select,
            Tag: Tag,
            t: t,
            statuses: statuses,
            selectedStatusId: selectedStatusId,
            loading: loading,
            editing: editing,
            currentStatus: currentStatus,
            startEdit: startEdit,
            commitChange: commitChange,
            severityForCategory: severityForCategory,
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
