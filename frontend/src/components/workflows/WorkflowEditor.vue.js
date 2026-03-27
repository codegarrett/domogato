import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import { getWorkflow, addStatus, updateStatus, removeStatus, addTransition, removeTransition, validateWorkflow, } from '@/api/workflows';
const props = defineProps();
const workflow = ref(null);
const showAddStatus = ref(false);
const showEditStatus = ref(false);
const addingTransition = ref(false);
const transitionSource = ref(null);
const validationErrors = ref([]);
const validationSuccess = ref(false);
const editingStatus = ref(null);
const newStatus = ref({ name: '', category: 'to_do', color: '#6B7280', is_initial: false, is_terminal: false });
const sortedStatuses = computed(() => [...(workflow.value?.statuses || [])].sort((a, b) => a.position - b.position));
function statusName(id) {
    return workflow.value?.statuses.find(s => s.id === id)?.name ?? '???';
}
function categoryColor(cat) {
    if (cat === 'to_do')
        return 'info';
    if (cat === 'in_progress')
        return 'warn';
    return 'success';
}
async function reload() {
    workflow.value = await getWorkflow(props.workflowId);
}
onMounted(reload);
function toggleTransitionMode() {
    addingTransition.value = !addingTransition.value;
    transitionSource.value = null;
}
async function handleStatusClick(status) {
    if (addingTransition.value) {
        if (!transitionSource.value) {
            transitionSource.value = status;
        }
        else {
            await addTransition(props.workflowId, {
                from_status_id: transitionSource.value.id,
                to_status_id: status.id,
            });
            addingTransition.value = false;
            transitionSource.value = null;
            await reload();
        }
        return;
    }
    editingStatus.value = {
        id: status.id,
        name: status.name,
        category: status.category,
        color: status.color,
        is_initial: status.is_initial,
        is_terminal: status.is_terminal,
    };
    showEditStatus.value = true;
}
async function handleAddStatus() {
    const pos = (workflow.value?.statuses.length ?? 0);
    await addStatus(props.workflowId, { ...newStatus.value, position: pos });
    showAddStatus.value = false;
    newStatus.value = { name: '', category: 'to_do', color: '#6B7280', is_initial: false, is_terminal: false };
    await reload();
}
async function handleUpdateStatus() {
    if (!editingStatus.value)
        return;
    await updateStatus(editingStatus.value.id, {
        name: editingStatus.value.name,
        category: editingStatus.value.category,
        color: editingStatus.value.color,
        is_initial: editingStatus.value.is_initial,
        is_terminal: editingStatus.value.is_terminal,
    });
    showEditStatus.value = false;
    editingStatus.value = null;
    await reload();
}
async function handleRemoveStatus(statusId) {
    await removeStatus(statusId);
    await reload();
}
async function handleRemoveTransition(transitionId) {
    await removeTransition(transitionId);
    await reload();
}
async function handleValidate() {
    const result = await validateWorkflow(props.workflowId);
    validationErrors.value = result.errors;
    validationSuccess.value = result.valid;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workflow-editor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex justify-content-between align-items-center mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.workflow?.name || 'Workflow Editor');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2" },
});
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    label: "Add Status",
    icon: "pi pi-plus",
    size: "small",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    label: "Add Status",
    icon: "pi pi-plus",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showAddStatus = true;
    }
};
var __VLS_3;
const __VLS_8 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.addingTransition ? 'Cancel' : 'Add Transition'),
    icon: (__VLS_ctx.addingTransition ? 'pi pi-times' : 'pi pi-arrow-right'),
    severity: (__VLS_ctx.addingTransition ? 'danger' : 'secondary'),
    size: "small",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.addingTransition ? 'Cancel' : 'Add Transition'),
    icon: (__VLS_ctx.addingTransition ? 'pi pi-times' : 'pi pi-arrow-right'),
    severity: (__VLS_ctx.addingTransition ? 'danger' : 'secondary'),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.toggleTransitionMode)
};
var __VLS_11;
const __VLS_16 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    label: "Validate",
    icon: "pi pi-check-circle",
    severity: "info",
    size: "small",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    label: "Validate",
    icon: "pi pi-check-circle",
    severity: "info",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (__VLS_ctx.handleValidate)
};
var __VLS_19;
if (__VLS_ctx.validationErrors.length) {
    const __VLS_24 = {}.Message;
    /** @type {[typeof __VLS_components.Message, typeof __VLS_components.Message, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        severity: "warn",
        ...{ class: "mb-3" },
    }));
    const __VLS_26 = __VLS_25({
        severity: "warn",
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "m-0 pl-3" },
    });
    for (const [err] of __VLS_getVForSourceType((__VLS_ctx.validationErrors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (err),
        });
        (err);
    }
    var __VLS_27;
}
if (__VLS_ctx.validationSuccess) {
    const __VLS_28 = {}.Message;
    /** @type {[typeof __VLS_components.Message, typeof __VLS_components.Message, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        severity: "success",
        ...{ class: "mb-3" },
    }));
    const __VLS_30 = __VLS_29({
        severity: "success",
        ...{ class: "mb-3" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    var __VLS_31;
}
if (__VLS_ctx.addingTransition) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    const __VLS_32 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        severity: "info",
    }));
    const __VLS_34 = __VLS_33({
        severity: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    (__VLS_ctx.transitionSource ? `Click target status (from: ${__VLS_ctx.transitionSource.name})` : 'Click source status');
    var __VLS_35;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "status-row flex gap-3 flex-wrap mb-4" },
});
for (const [status] of __VLS_getVForSourceType((__VLS_ctx.sortedStatuses))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleStatusClick(status);
            } },
        key: (status.id),
        ...{ class: "status-card p-3 border-round shadow-1 cursor-pointer" },
        ...{ style: ({ borderLeft: `4px solid ${status.color}`, minWidth: '160px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-between align-items-start" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "font-semibold mb-1" },
    });
    (status.name);
    const __VLS_36 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        value: (status.category),
        severity: (__VLS_ctx.categoryColor(status.category)),
        ...{ class: "text-xs" },
    }));
    const __VLS_38 = __VLS_37({
        value: (status.category),
        severity: (__VLS_ctx.categoryColor(status.category)),
        ...{ class: "text-xs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    const __VLS_40 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        text: true,
        severity: "danger",
        size: "small",
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        text: true,
        severity: "danger",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleRemoveStatus(status.id);
        }
    };
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-1 mt-2" },
    });
    if (status.is_initial) {
        const __VLS_48 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            value: "Initial",
            severity: "info",
            ...{ class: "text-xs" },
        }));
        const __VLS_50 = __VLS_49({
            value: "Initial",
            severity: "info",
            ...{ class: "text-xs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    }
    if (status.is_terminal) {
        const __VLS_52 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            value: "Terminal",
            severity: "success",
            ...{ class: "text-xs" },
        }));
        const __VLS_54 = __VLS_53({
            value: "Terminal",
            severity: "success",
            ...{ class: "text-xs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
const __VLS_56 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    value: (__VLS_ctx.workflow?.transitions || []),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}));
const __VLS_58 = __VLS_57({
    value: (__VLS_ctx.workflow?.transitions || []),
    stripedRows: true,
    ...{ class: "p-datatable-sm" },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    header: "From",
}));
const __VLS_62 = __VLS_61({
    header: "From",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_63.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.statusName(data.from_status_id));
}
var __VLS_63;
const __VLS_64 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    header: "To",
}));
const __VLS_66 = __VLS_65({
    header: "To",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_67.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.statusName(data.to_status_id));
}
var __VLS_67;
const __VLS_68 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    field: "name",
    header: "Name",
}));
const __VLS_70 = __VLS_69({
    field: "name",
    header: "Name",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    header: "",
}));
const __VLS_74 = __VLS_73({
    header: "",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_75.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_76 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        text: true,
        severity: "danger",
        size: "small",
    }));
    const __VLS_78 = __VLS_77({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        text: true,
        severity: "danger",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    let __VLS_80;
    let __VLS_81;
    let __VLS_82;
    const __VLS_83 = {
        onClick: (...[$event]) => {
            __VLS_ctx.handleRemoveTransition(data.id);
        }
    };
    var __VLS_79;
}
var __VLS_75;
var __VLS_59;
const __VLS_84 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    visible: (__VLS_ctx.showAddStatus),
    header: "Add Status",
    modal: true,
    ...{ style: ({ width: '400px' }) },
}));
const __VLS_86 = __VLS_85({
    visible: (__VLS_ctx.showAddStatus),
    header: "Add Status",
    modal: true,
    ...{ style: ({ width: '400px' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3 pt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
const __VLS_88 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    modelValue: (__VLS_ctx.newStatus.name),
}));
const __VLS_90 = __VLS_89({
    modelValue: (__VLS_ctx.newStatus.name),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
const __VLS_92 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    modelValue: (__VLS_ctx.newStatus.category),
    options: (['to_do', 'in_progress', 'done']),
}));
const __VLS_94 = __VLS_93({
    modelValue: (__VLS_ctx.newStatus.category),
    options: (['to_do', 'in_progress', 'done']),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
const __VLS_96 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: (__VLS_ctx.newStatus.color),
    placeholder: "#6B7280",
}));
const __VLS_98 = __VLS_97({
    modelValue: (__VLS_ctx.newStatus.color),
    placeholder: "#6B7280",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-2" },
});
const __VLS_100 = {}.Checkbox;
/** @type {[typeof __VLS_components.Checkbox, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    modelValue: (__VLS_ctx.newStatus.is_initial),
    binary: (true),
    inputId: "initial",
}));
const __VLS_102 = __VLS_101({
    modelValue: (__VLS_ctx.newStatus.is_initial),
    binary: (true),
    inputId: "initial",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "initial",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-2" },
});
const __VLS_104 = {}.Checkbox;
/** @type {[typeof __VLS_components.Checkbox, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    modelValue: (__VLS_ctx.newStatus.is_terminal),
    binary: (true),
    inputId: "terminal",
}));
const __VLS_106 = __VLS_105({
    modelValue: (__VLS_ctx.newStatus.is_terminal),
    binary: (true),
    inputId: "terminal",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "terminal",
});
{
    const { footer: __VLS_thisSlot } = __VLS_87.slots;
    const __VLS_108 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        label: "Cancel",
        text: true,
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        label: "Cancel",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showAddStatus = false;
        }
    };
    var __VLS_111;
    const __VLS_116 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ 'onClick': {} },
        label: "Add",
        icon: "pi pi-check",
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onClick': {} },
        label: "Add",
        icon: "pi pi-check",
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_120;
    let __VLS_121;
    let __VLS_122;
    const __VLS_123 = {
        onClick: (__VLS_ctx.handleAddStatus)
    };
    var __VLS_119;
}
var __VLS_87;
const __VLS_124 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    visible: (__VLS_ctx.showEditStatus),
    header: "Edit Status",
    modal: true,
    ...{ style: ({ width: '400px' }) },
}));
const __VLS_126 = __VLS_125({
    visible: (__VLS_ctx.showEditStatus),
    header: "Edit Status",
    modal: true,
    ...{ style: ({ width: '400px' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
if (__VLS_ctx.editingStatus) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3 pt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_128 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        modelValue: (__VLS_ctx.editingStatus.name),
    }));
    const __VLS_130 = __VLS_129({
        modelValue: (__VLS_ctx.editingStatus.name),
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_132 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        modelValue: (__VLS_ctx.editingStatus.category),
        options: (['to_do', 'in_progress', 'done']),
    }));
    const __VLS_134 = __VLS_133({
        modelValue: (__VLS_ctx.editingStatus.category),
        options: (['to_do', 'in_progress', 'done']),
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    const __VLS_136 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        modelValue: (__VLS_ctx.editingStatus.color),
    }));
    const __VLS_138 = __VLS_137({
        modelValue: (__VLS_ctx.editingStatus.color),
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2" },
    });
    const __VLS_140 = {}.Checkbox;
    /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        modelValue: (__VLS_ctx.editingStatus.is_initial),
        binary: (true),
        inputId: "editInitial",
    }));
    const __VLS_142 = __VLS_141({
        modelValue: (__VLS_ctx.editingStatus.is_initial),
        binary: (true),
        inputId: "editInitial",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "editInitial",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2" },
    });
    const __VLS_144 = {}.Checkbox;
    /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        modelValue: (__VLS_ctx.editingStatus.is_terminal),
        binary: (true),
        inputId: "editTerminal",
    }));
    const __VLS_146 = __VLS_145({
        modelValue: (__VLS_ctx.editingStatus.is_terminal),
        binary: (true),
        inputId: "editTerminal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "editTerminal",
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_127.slots;
    const __VLS_148 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        ...{ 'onClick': {} },
        label: "Cancel",
        text: true,
    }));
    const __VLS_150 = __VLS_149({
        ...{ 'onClick': {} },
        label: "Cancel",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    let __VLS_152;
    let __VLS_153;
    let __VLS_154;
    const __VLS_155 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showEditStatus = false;
        }
    };
    var __VLS_151;
    const __VLS_156 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        ...{ 'onClick': {} },
        label: "Save",
        icon: "pi pi-check",
    }));
    const __VLS_158 = __VLS_157({
        ...{ 'onClick': {} },
        label: "Save",
        icon: "pi pi-check",
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    let __VLS_160;
    let __VLS_161;
    let __VLS_162;
    const __VLS_163 = {
        onClick: (__VLS_ctx.handleUpdateStatus)
    };
    var __VLS_159;
}
var __VLS_127;
/** @type {__VLS_StyleScopedClasses['workflow-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['pl-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
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
            Select: Select,
            Checkbox: Checkbox,
            Message: Message,
            workflow: workflow,
            showAddStatus: showAddStatus,
            showEditStatus: showEditStatus,
            addingTransition: addingTransition,
            transitionSource: transitionSource,
            validationErrors: validationErrors,
            validationSuccess: validationSuccess,
            editingStatus: editingStatus,
            newStatus: newStatus,
            sortedStatuses: sortedStatuses,
            statusName: statusName,
            categoryColor: categoryColor,
            toggleTransitionMode: toggleTransitionMode,
            handleStatusClick: handleStatusClick,
            handleAddStatus: handleAddStatus,
            handleUpdateStatus: handleUpdateStatus,
            handleRemoveStatus: handleRemoveStatus,
            handleRemoveTransition: handleRemoveTransition,
            handleValidate: handleValidate,
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
