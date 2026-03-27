import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import { useOrganizationStore } from '@/stores/organization';
import { listWorkflows, createWorkflow, seedDefaultWorkflows } from '@/api/workflows';
const orgStore = useOrganizationStore();
const workflows = ref([]);
const loading = ref(false);
const seeding = ref(false);
const showCreate = ref(false);
const newWorkflow = ref({ name: '', description: '', template_id: null });
const templates = computed(() => workflows.value.filter(w => w.is_template));
async function fetchWorkflows() {
    if (!orgStore.currentOrgId)
        return;
    loading.value = true;
    try {
        const result = await listWorkflows(orgStore.currentOrgId);
        workflows.value = result.items;
    }
    finally {
        loading.value = false;
    }
}
onMounted(fetchWorkflows);
async function handleSeed() {
    if (!orgStore.currentOrgId)
        return;
    seeding.value = true;
    try {
        await seedDefaultWorkflows(orgStore.currentOrgId);
        await fetchWorkflows();
    }
    finally {
        seeding.value = false;
    }
}
async function handleCreate() {
    if (!orgStore.currentOrgId)
        return;
    await createWorkflow(orgStore.currentOrgId, {
        name: newWorkflow.value.name,
        description: newWorkflow.value.description || undefined,
        template_id: newWorkflow.value.template_id || undefined,
    });
    showCreate.value = false;
    newWorkflow.value = { name: '', description: '', template_id: null };
    await fetchWorkflows();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex justify-content-between align-items-center mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.$t('workflows.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2" },
});
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('workflows.seedDefaults')),
    icon: "pi pi-database",
    severity: "secondary",
    size: "small",
    loading: (__VLS_ctx.seeding),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('workflows.seedDefaults')),
    icon: "pi pi-database",
    severity: "secondary",
    size: "small",
    loading: (__VLS_ctx.seeding),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.handleSeed)
};
var __VLS_3;
const __VLS_8 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('workflows.newWorkflow')),
    icon: "pi pi-plus",
    size: "small",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('workflows.newWorkflow')),
    icon: "pi pi-plus",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showCreate = true;
    }
};
var __VLS_11;
const __VLS_16 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    value: (__VLS_ctx.workflows),
    loading: (__VLS_ctx.loading),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}));
const __VLS_18 = __VLS_17({
    value: (__VLS_ctx.workflows),
    loading: (__VLS_ctx.loading),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    field: "name",
    header: (__VLS_ctx.$t('common.name')),
}));
const __VLS_22 = __VLS_21({
    field: "name",
    header: (__VLS_ctx.$t('common.name')),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_23.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_24 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        to: (`/workflows/${data.id}`),
        ...{ class: "font-semibold" },
    }));
    const __VLS_26 = __VLS_25({
        to: (`/workflows/${data.id}`),
        ...{ class: "font-semibold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    (data.name);
    var __VLS_27;
}
var __VLS_23;
const __VLS_28 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    field: "description",
    header: (__VLS_ctx.$t('common.description')),
}));
const __VLS_30 = __VLS_29({
    field: "description",
    header: (__VLS_ctx.$t('common.description')),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
const __VLS_32 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    header: (__VLS_ctx.$t('workflows.statuses')),
}));
const __VLS_34 = __VLS_33({
    header: (__VLS_ctx.$t('workflows.statuses')),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_35.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    (data.statuses?.length ?? 0);
}
var __VLS_35;
const __VLS_36 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    header: (__VLS_ctx.$t('workflows.template')),
}));
const __VLS_38 = __VLS_37({
    header: (__VLS_ctx.$t('workflows.template')),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_39.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (data.is_template) {
        const __VLS_40 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            value: (__VLS_ctx.$t('workflows.template')),
            severity: "info",
        }));
        const __VLS_42 = __VLS_41({
            value: (__VLS_ctx.$t('workflows.template')),
            severity: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    }
}
var __VLS_39;
const __VLS_44 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    header: (__VLS_ctx.$t('common.active')),
}));
const __VLS_46 = __VLS_45({
    header: (__VLS_ctx.$t('common.active')),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_47.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_48 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        value: (data.is_active ? __VLS_ctx.$t('common.active') : __VLS_ctx.$t('common.inactive')),
        severity: (data.is_active ? 'success' : 'danger'),
    }));
    const __VLS_50 = __VLS_49({
        value: (data.is_active ? __VLS_ctx.$t('common.active') : __VLS_ctx.$t('common.inactive')),
        severity: (data.is_active ? 'success' : 'danger'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
}
var __VLS_47;
var __VLS_19;
const __VLS_52 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    visible: (__VLS_ctx.showCreate),
    header: (__VLS_ctx.$t('workflows.createWorkflow')),
    modal: true,
    ...{ style: ({ width: '450px' }) },
}));
const __VLS_54 = __VLS_53({
    visible: (__VLS_ctx.showCreate),
    header: (__VLS_ctx.$t('workflows.createWorkflow')),
    modal: true,
    ...{ style: ({ width: '450px' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3 pt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
(__VLS_ctx.$t('common.name'));
const __VLS_56 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.newWorkflow.name),
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.newWorkflow.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
(__VLS_ctx.$t('common.description'));
const __VLS_60 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    modelValue: (__VLS_ctx.newWorkflow.description),
    rows: "3",
}));
const __VLS_62 = __VLS_61({
    modelValue: (__VLS_ctx.newWorkflow.description),
    rows: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
(__VLS_ctx.$t('workflows.cloneFrom'));
const __VLS_64 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.newWorkflow.template_id),
    options: (__VLS_ctx.templates),
    optionLabel: "name",
    optionValue: "id",
    placeholder: (__VLS_ctx.$t('workflows.startFromScratch')),
    showClear: true,
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.newWorkflow.template_id),
    options: (__VLS_ctx.templates),
    optionLabel: "name",
    optionValue: "id",
    placeholder: (__VLS_ctx.$t('workflows.startFromScratch')),
    showClear: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
{
    const { footer: __VLS_thisSlot } = __VLS_55.slots;
    const __VLS_68 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        text: true,
    }));
    const __VLS_70 = __VLS_69({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    let __VLS_72;
    let __VLS_73;
    let __VLS_74;
    const __VLS_75 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreate = false;
        }
    };
    var __VLS_71;
    const __VLS_76 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
    }));
    const __VLS_78 = __VLS_77({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    let __VLS_80;
    let __VLS_81;
    let __VLS_82;
    const __VLS_83 = {
        onClick: (__VLS_ctx.handleCreate)
    };
    var __VLS_79;
}
var __VLS_55;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            DataTable: DataTable,
            Column: Column,
            Tag: Tag,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            Select: Select,
            workflows: workflows,
            loading: loading,
            seeding: seeding,
            showCreate: showCreate,
            newWorkflow: newWorkflow,
            templates: templates,
            handleSeed: handleSeed,
            handleCreate: handleCreate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
