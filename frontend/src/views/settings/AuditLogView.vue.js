import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { getProjectAuditLog } from '@/api/audit';
const route = useRoute();
const projectId = route.params.projectId;
const entries = ref([]);
const total = ref(0);
const first = ref(0);
const rows = ref(25);
const loading = ref(false);
const actionFilter = ref(null);
const ACTION_OPTIONS = [
    { label: 'All actions', value: null },
    { label: 'Created', value: 'created' },
    { label: 'Field change', value: 'field_change' },
    { label: 'Transition', value: 'transition' },
    { label: 'Comment added', value: 'comment_added' },
];
function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    catch {
        return iso;
    }
}
function actionSeverity(action) {
    if (action === 'created')
        return 'success';
    if (action === 'transition')
        return 'warning';
    if (action === 'field_change')
        return 'info';
    return 'secondary';
}
async function load() {
    loading.value = true;
    try {
        const params = { offset: first.value, limit: rows.value };
        if (actionFilter.value)
            params.action = actionFilter.value;
        const res = await getProjectAuditLog(projectId, params);
        entries.value = res.items;
        total.value = res.total;
    }
    finally {
        loading.value = false;
    }
}
function onPage(e) {
    first.value = e.first;
    rows.value = e.rows;
    load();
}
watch(actionFilter, () => {
    first.value = 0;
    load();
});
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0" },
});
(__VLS_ctx.$t('audit.title'));
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    text: true,
    rounded: true,
    loading: (__VLS_ctx.loading),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    text: true,
    rounded: true,
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.load)
};
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-3 mb-3" },
});
const __VLS_8 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    modelValue: (__VLS_ctx.actionFilter),
    options: (__VLS_ctx.ACTION_OPTIONS),
    optionLabel: "label",
    optionValue: "value",
    placeholder: (__VLS_ctx.$t('audit.filterAction')),
    ...{ class: "w-14rem" },
    showClear: true,
}));
const __VLS_10 = __VLS_9({
    modelValue: (__VLS_ctx.actionFilter),
    options: (__VLS_ctx.ACTION_OPTIONS),
    optionLabel: "label",
    optionValue: "value",
    placeholder: (__VLS_ctx.$t('audit.filterAction')),
    ...{ class: "w-14rem" },
    showClear: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "surface-card p-4 border-round shadow-1" },
});
const __VLS_12 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onPage': {} },
    value: (__VLS_ctx.entries),
    loading: (__VLS_ctx.loading),
    lazy: true,
    paginator: true,
    rows: (__VLS_ctx.rows),
    first: (__VLS_ctx.first),
    totalRecords: (__VLS_ctx.total),
    dataKey: "id",
    stripedRows: true,
    scrollable: true,
    scrollHeight: "60vh",
    ...{ class: "p-datatable-sm" },
    rowsPerPageOptions: ([25, 50, 100]),
}));
const __VLS_14 = __VLS_13({
    ...{ 'onPage': {} },
    value: (__VLS_ctx.entries),
    loading: (__VLS_ctx.loading),
    lazy: true,
    paginator: true,
    rows: (__VLS_ctx.rows),
    first: (__VLS_ctx.first),
    totalRecords: (__VLS_ctx.total),
    dataKey: "id",
    stripedRows: true,
    scrollable: true,
    scrollHeight: "60vh",
    ...{ class: "p-datatable-sm" },
    rowsPerPageOptions: ([25, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onPage: (__VLS_ctx.onPage)
};
__VLS_15.slots.default;
const __VLS_20 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    field: "created_at",
    header: (__VLS_ctx.$t('common.created')),
    ...{ style: {} },
}));
const __VLS_22 = __VLS_21({
    field: "created_at",
    header: (__VLS_ctx.$t('common.created')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_23.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm" },
    });
    (__VLS_ctx.formatDate(data.created_at));
}
var __VLS_23;
const __VLS_24 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    field: "user_name",
    header: (__VLS_ctx.$t('audit.user')),
    ...{ style: {} },
}));
const __VLS_26 = __VLS_25({
    field: "user_name",
    header: (__VLS_ctx.$t('audit.user')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_27.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm" },
    });
    (data.user_name || __VLS_ctx.$t('tickets.system'));
}
var __VLS_27;
const __VLS_28 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    field: "action",
    header: (__VLS_ctx.$t('audit.action')),
    ...{ style: {} },
}));
const __VLS_30 = __VLS_29({
    field: "action",
    header: (__VLS_ctx.$t('audit.action')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_31.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_32 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        value: (data.action),
        severity: (__VLS_ctx.actionSeverity(data.action)),
    }));
    const __VLS_34 = __VLS_33({
        value: (data.action),
        severity: (__VLS_ctx.actionSeverity(data.action)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
}
var __VLS_31;
const __VLS_36 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    field: "field_name",
    header: (__VLS_ctx.$t('audit.field')),
    ...{ style: {} },
}));
const __VLS_38 = __VLS_37({
    field: "field_name",
    header: (__VLS_ctx.$t('audit.field')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_39.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm font-mono" },
    });
    (data.field_name || '—');
}
var __VLS_39;
const __VLS_40 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    header: (__VLS_ctx.$t('audit.change')),
}));
const __VLS_42 = __VLS_41({
    header: (__VLS_ctx.$t('audit.change')),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_43.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (data.old_value || data.new_value) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm" },
        });
        if (data.old_value) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-color-secondary line-through" },
            });
            (data.old_value);
        }
        if (data.old_value && data.new_value) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        if (data.new_value) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium" },
            });
            (data.new_value);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary text-sm" },
        });
    }
}
var __VLS_43;
var __VLS_15;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['w-14rem']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['line-through']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataTable: DataTable,
            Column: Column,
            Tag: Tag,
            Select: Select,
            Button: Button,
            entries: entries,
            total: total,
            first: first,
            rows: rows,
            loading: loading,
            actionFilter: actionFilter,
            ACTION_OPTIONS: ACTION_OPTIONS,
            formatDate: formatDate,
            actionSeverity: actionSeverity,
            load: load,
            onPage: onPage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
