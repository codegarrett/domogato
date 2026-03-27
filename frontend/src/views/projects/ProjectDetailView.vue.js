import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import { getProject, updateProject, listProjectMembers } from '@/api/projects';
import { listWorkflows } from '@/api/workflows';
import { useToastService } from '@/composables/useToast';
const { t } = useI18n();
const toast = useToastService();
const route = useRoute();
const projectId = route.params.projectId;
const project = ref(null);
const members = ref([]);
const loadingMembers = ref(false);
const workflows = ref([]);
const loadingWorkflows = ref(false);
const selectedWorkflowId = ref(null);
const workflowOptions = computed(() => workflows.value.filter(w => w.is_active).map(w => ({ label: w.name, value: w.id })));
async function onWorkflowChange() {
    if (!selectedWorkflowId.value || !project.value)
        return;
    try {
        project.value = await updateProject(projectId, { default_workflow_id: selectedWorkflowId.value });
        toast.showSuccess(t('common.save'), t('projects.workflowUpdated'));
    }
    catch {
        selectedWorkflowId.value = project.value.default_workflow_id;
    }
}
onMounted(async () => {
    project.value = await getProject(projectId);
    selectedWorkflowId.value = project.value.default_workflow_id;
    loadingMembers.value = true;
    loadingWorkflows.value = true;
    const [memberResult, wfResult] = await Promise.all([
        listProjectMembers(projectId),
        listWorkflows(project.value.organization_id),
    ]);
    members.value = memberResult.items;
    workflows.value = wfResult.items;
    loadingMembers.value = false;
    loadingWorkflows.value = false;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.project) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2 mb-4" },
    });
    const __VLS_0 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        value: (__VLS_ctx.project.key),
        severity: "info",
        ...{ class: "text-lg" },
    }));
    const __VLS_2 = __VLS_1({
        value: (__VLS_ctx.project.key),
        severity: "info",
        ...{ class: "text-lg" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "m-0" },
    });
    (__VLS_ctx.project.name);
    if (__VLS_ctx.project.is_archived) {
        const __VLS_4 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            value: (__VLS_ctx.$t('common.archived')),
            severity: "warning",
        }));
        const __VLS_6 = __VLS_5({
            value: (__VLS_ctx.$t('common.archived')),
            severity: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
    if (__VLS_ctx.project.description) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-color-secondary mb-4" },
        });
        (__VLS_ctx.project.description);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('common.visibility'));
    const __VLS_8 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        value: (__VLS_ctx.project.visibility),
    }));
    const __VLS_10 = __VLS_9({
        value: (__VLS_ctx.project.visibility),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('projects.tickets'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-2xl font-bold" },
    });
    (__VLS_ctx.project.ticket_sequence);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-color-secondary mb-2" },
    });
    (__VLS_ctx.$t('projects.defaultWorkflow'));
    const __VLS_12 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.selectedWorkflowId),
        options: (__VLS_ctx.workflowOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('projects.selectWorkflow')),
        ...{ class: "w-full" },
        loading: (__VLS_ctx.loadingWorkflows),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onChange': {} },
        modelValue: (__VLS_ctx.selectedWorkflowId),
        options: (__VLS_ctx.workflowOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('projects.selectWorkflow')),
        ...{ class: "w-full" },
        loading: (__VLS_ctx.loadingWorkflows),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onChange: (__VLS_ctx.onWorkflowChange)
    };
    var __VLS_15;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "mt-3" },
    });
    (__VLS_ctx.$t('orgs.members'));
    const __VLS_20 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        value: (__VLS_ctx.members),
        loading: (__VLS_ctx.loadingMembers),
        stripedRows: true,
        ...{ class: "p-datatable-sm" },
    }));
    const __VLS_22 = __VLS_21({
        value: (__VLS_ctx.members),
        loading: (__VLS_ctx.loadingMembers),
        stripedRows: true,
        ...{ class: "p-datatable-sm" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    const __VLS_24 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        field: "display_name",
        header: (__VLS_ctx.$t('common.name')),
    }));
    const __VLS_26 = __VLS_25({
        field: "display_name",
        header: (__VLS_ctx.$t('common.name')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_28 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        field: "email",
        header: (__VLS_ctx.$t('common.email')),
    }));
    const __VLS_30 = __VLS_29({
        field: "email",
        header: (__VLS_ctx.$t('common.email')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    const __VLS_32 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        field: "role",
        header: (__VLS_ctx.$t('common.role')),
    }));
    const __VLS_34 = __VLS_33({
        field: "role",
        header: (__VLS_ctx.$t('common.role')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_35.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_36 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            value: (data.role),
        }));
        const __VLS_38 = __VLS_37({
            value: (data.role),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
    var __VLS_35;
    var __VLS_23;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner" },
        ...{ style: {} },
    });
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataTable: DataTable,
            Column: Column,
            Tag: Tag,
            Select: Select,
            project: project,
            members: members,
            loadingMembers: loadingMembers,
            loadingWorkflows: loadingWorkflows,
            selectedWorkflowId: selectedWorkflowId,
            workflowOptions: workflowOptions,
            onWorkflowChange: onWorkflowChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
