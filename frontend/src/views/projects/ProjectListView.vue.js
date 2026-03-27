import { onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { useProjectStore } from '@/stores/project';
import { useOrganizationStore } from '@/stores/organization';
const projectStore = useProjectStore();
const orgStore = useOrganizationStore();
onMounted(async () => {
    if (orgStore.currentOrgId) {
        await projectStore.fetchProjects(orgStore.currentOrgId);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.$t('projects.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-color-secondary mb-4" },
});
(__VLS_ctx.$t('projects.subtitle'));
const __VLS_0 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    value: (__VLS_ctx.projectStore.projects),
    loading: (__VLS_ctx.projectStore.loading),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}));
const __VLS_2 = __VLS_1({
    value: (__VLS_ctx.projectStore.projects),
    loading: (__VLS_ctx.projectStore.loading),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    field: "key",
    header: (__VLS_ctx.$t('projects.key')),
    ...{ style: {} },
}));
const __VLS_6 = __VLS_5({
    field: "key",
    header: (__VLS_ctx.$t('projects.key')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_7.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_8 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        value: (data.key),
        severity: "info",
    }));
    const __VLS_10 = __VLS_9({
        value: (data.key),
        severity: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
var __VLS_7;
const __VLS_12 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    field: "name",
    header: (__VLS_ctx.$t('common.name')),
}));
const __VLS_14 = __VLS_13({
    field: "name",
    header: (__VLS_ctx.$t('common.name')),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_15.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_16 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        to: (`/projects/${data.id}`),
        ...{ class: "font-semibold" },
    }));
    const __VLS_18 = __VLS_17({
        to: (`/projects/${data.id}`),
        ...{ class: "font-semibold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    (data.name);
    var __VLS_19;
}
var __VLS_15;
const __VLS_20 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    field: "visibility",
    header: (__VLS_ctx.$t('common.visibility')),
}));
const __VLS_22 = __VLS_21({
    field: "visibility",
    header: (__VLS_ctx.$t('common.visibility')),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    field: "is_archived",
    header: (__VLS_ctx.$t('common.status')),
}));
const __VLS_26 = __VLS_25({
    field: "is_archived",
    header: (__VLS_ctx.$t('common.status')),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_27.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_28 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        value: (data.is_archived ? __VLS_ctx.$t('common.archived') : __VLS_ctx.$t('common.active')),
        severity: (data.is_archived ? 'warning' : 'success'),
    }));
    const __VLS_30 = __VLS_29({
        value: (data.is_archived ? __VLS_ctx.$t('common.archived') : __VLS_ctx.$t('common.active')),
        severity: (data.is_archived ? 'warning' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
}
var __VLS_27;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataTable: DataTable,
            Column: Column,
            Tag: Tag,
            projectStore: projectStore,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
