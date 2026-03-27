import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getStoryWorkflow, createStoryWorkflowStatus, updateStoryWorkflowStatus, deleteStoryWorkflowStatus, } from '@/api/kb';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const projectId = computed(() => route.params.projectId);
const workflow = ref(null);
const loading = ref(true);
const showAddDialog = ref(false);
const newStatus = ref({ name: '', category: 'draft', color: '#6B7280', position: 0, is_initial: false, is_terminal: false });
const saving = ref(false);
const editingStatusId = ref(null);
const editDraft = ref({});
const categoryOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Review', value: 'review' },
    { label: 'Ready', value: 'ready' },
    { label: 'Ticketed', value: 'ticketed' },
];
async function load() {
    loading.value = true;
    try {
        workflow.value = await getStoryWorkflow(projectId.value);
    }
    finally {
        loading.value = false;
    }
}
onMounted(load);
async function addStatus() {
    if (!newStatus.value.name.trim())
        return;
    saving.value = true;
    try {
        await createStoryWorkflowStatus(projectId.value, {
            name: newStatus.value.name.trim(),
            category: newStatus.value.category,
            color: newStatus.value.color,
            position: newStatus.value.position,
            is_initial: newStatus.value.is_initial,
            is_terminal: newStatus.value.is_terminal,
        });
        showAddDialog.value = false;
        newStatus.value = { name: '', category: 'draft', color: '#6B7280', position: 0, is_initial: false, is_terminal: false };
        await load();
    }
    finally {
        saving.value = false;
    }
}
function startEdit(s) {
    editingStatusId.value = s.id;
    editDraft.value = { name: s.name, category: s.category, color: s.color, position: s.position, is_initial: s.is_initial, is_terminal: s.is_terminal };
}
async function commitEdit(s) {
    const changes = {};
    if (editDraft.value.name && editDraft.value.name !== s.name)
        changes.name = editDraft.value.name;
    if (editDraft.value.category && editDraft.value.category !== s.category)
        changes.category = editDraft.value.category;
    if (editDraft.value.color && editDraft.value.color !== s.color)
        changes.color = editDraft.value.color;
    if (editDraft.value.position !== undefined && editDraft.value.position !== s.position)
        changes.position = editDraft.value.position;
    if (editDraft.value.is_initial !== undefined && editDraft.value.is_initial !== s.is_initial)
        changes.is_initial = editDraft.value.is_initial;
    if (editDraft.value.is_terminal !== undefined && editDraft.value.is_terminal !== s.is_terminal)
        changes.is_terminal = editDraft.value.is_terminal;
    if (Object.keys(changes).length) {
        await updateStoryWorkflowStatus(projectId.value, s.id, changes);
        await load();
    }
    editingStatusId.value = null;
}
function cancelEdit() {
    editingStatusId.value = null;
}
async function removeStatus(s) {
    if (!confirm(`Delete status "${s.name}"? This cannot be undone.`))
        return;
    try {
        await deleteStoryWorkflowStatus(projectId.value, s.id);
        await load();
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : t('kb.cannotDeleteInUse');
        toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });
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
    ...{ class: "p-4" },
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0" },
});
(__VLS_ctx.t('kb.storyWorkflow'));
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.t('kb.addStatus')),
    icon: "pi pi-plus",
    size: "small",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.t('kb.addStatus')),
    icon: "pi pi-plus",
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.showAddDialog = true;
    }
};
var __VLS_3;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_8 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
else if (__VLS_ctx.workflow) {
    const __VLS_12 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        value: (__VLS_ctx.workflow.statuses),
        size: "small",
        ...{ class: "text-sm" },
    }));
    const __VLS_14 = __VLS_13({
        value: (__VLS_ctx.workflow.statuses),
        size: "small",
        ...{ class: "text-sm" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    const __VLS_16 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        header: (__VLS_ctx.t('kb.statusName')),
        ...{ style: {} },
    }));
    const __VLS_18 = __VLS_17({
        header: (__VLS_ctx.t('kb.statusName')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_19.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            const __VLS_20 = {}.InputText;
            /** @type {[typeof __VLS_components.InputText, ]} */ ;
            // @ts-ignore
            const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                modelValue: (__VLS_ctx.editDraft.name),
                size: "small",
                ...{ class: "w-full" },
            }));
            const __VLS_22 = __VLS_21({
                modelValue: (__VLS_ctx.editDraft.name),
                size: "small",
                ...{ class: "w-full" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.workflow))
                            return;
                        if (!!(__VLS_ctx.editingStatusId === data.id))
                            return;
                        __VLS_ctx.startEdit(data);
                    } },
                ...{ class: "font-semibold cursor-pointer" },
            });
            (data.name);
        }
    }
    var __VLS_19;
    const __VLS_24 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        header: (__VLS_ctx.t('kb.statusCategory')),
        ...{ style: {} },
    }));
    const __VLS_26 = __VLS_25({
        header: (__VLS_ctx.t('kb.statusCategory')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_27.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_27.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            const __VLS_28 = {}.Select;
            /** @type {[typeof __VLS_components.Select, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                modelValue: (__VLS_ctx.editDraft.category),
                options: (__VLS_ctx.categoryOptions),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full" },
                size: "small",
            }));
            const __VLS_30 = __VLS_29({
                modelValue: (__VLS_ctx.editDraft.category),
                options: (__VLS_ctx.categoryOptions),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full" },
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        }
        else {
            const __VLS_32 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                value: (data.category),
                severity: (__VLS_ctx.severityForCategory(data.category)),
            }));
            const __VLS_34 = __VLS_33({
                value: (data.category),
                severity: (__VLS_ctx.severityForCategory(data.category)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        }
    }
    var __VLS_27;
    const __VLS_36 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        header: (__VLS_ctx.t('kb.statusColor')),
        ...{ style: {} },
    }));
    const __VLS_38 = __VLS_37({
        header: (__VLS_ctx.t('kb.statusColor')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    __VLS_39.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_39.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "color",
                ...{ class: "w-full" },
                ...{ style: {} },
            });
            (__VLS_ctx.editDraft.color);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "border-round" },
                ...{ style: ({ background: data.color, width: '2rem', height: '1.25rem' }) },
            });
        }
    }
    var __VLS_39;
    const __VLS_40 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        header: (__VLS_ctx.t('kb.statusPosition')),
        ...{ style: {} },
    }));
    const __VLS_42 = __VLS_41({
        header: (__VLS_ctx.t('kb.statusPosition')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_43.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            const __VLS_44 = {}.InputNumber;
            /** @type {[typeof __VLS_components.InputNumber, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                modelValue: (__VLS_ctx.editDraft.position),
                size: "small",
                ...{ class: "w-full" },
                min: (0),
            }));
            const __VLS_46 = __VLS_45({
                modelValue: (__VLS_ctx.editDraft.position),
                size: "small",
                ...{ class: "w-full" },
                min: (0),
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        }
        else {
            (data.position);
        }
    }
    var __VLS_43;
    const __VLS_48 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        header: (__VLS_ctx.t('kb.isInitial')),
        ...{ style: {} },
    }));
    const __VLS_50 = __VLS_49({
        header: (__VLS_ctx.t('kb.isInitial')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_51.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "checkbox",
            });
            (__VLS_ctx.editDraft.is_initial);
        }
        else {
            if (data.is_initial) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                    ...{ class: "pi pi-check text-green-500" },
                });
            }
        }
    }
    var __VLS_51;
    const __VLS_52 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        header: (__VLS_ctx.t('kb.isTerminal')),
        ...{ style: {} },
    }));
    const __VLS_54 = __VLS_53({
        header: (__VLS_ctx.t('kb.isTerminal')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_55.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "checkbox",
            });
            (__VLS_ctx.editDraft.is_terminal);
        }
        else {
            if (data.is_terminal) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                    ...{ class: "pi pi-check text-green-500" },
                });
            }
        }
    }
    var __VLS_55;
    const __VLS_56 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ style: {} },
    }));
    const __VLS_58 = __VLS_57({
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_59.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingStatusId === data.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex gap-1" },
            });
            const __VLS_60 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                ...{ 'onClick': {} },
                icon: "pi pi-check",
                size: "small",
                text: true,
                severity: "success",
            }));
            const __VLS_62 = __VLS_61({
                ...{ 'onClick': {} },
                icon: "pi pi-check",
                size: "small",
                text: true,
                severity: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            let __VLS_64;
            let __VLS_65;
            let __VLS_66;
            const __VLS_67 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.workflow))
                        return;
                    if (!(__VLS_ctx.editingStatusId === data.id))
                        return;
                    __VLS_ctx.commitEdit(data);
                }
            };
            var __VLS_63;
            const __VLS_68 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                size: "small",
                text: true,
                severity: "secondary",
            }));
            const __VLS_70 = __VLS_69({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                size: "small",
                text: true,
                severity: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
            let __VLS_72;
            let __VLS_73;
            let __VLS_74;
            const __VLS_75 = {
                onClick: (__VLS_ctx.cancelEdit)
            };
            var __VLS_71;
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex gap-1" },
            });
            const __VLS_76 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
                ...{ 'onClick': {} },
                icon: "pi pi-pencil",
                size: "small",
                text: true,
                severity: "secondary",
            }));
            const __VLS_78 = __VLS_77({
                ...{ 'onClick': {} },
                icon: "pi pi-pencil",
                size: "small",
                text: true,
                severity: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_77));
            let __VLS_80;
            let __VLS_81;
            let __VLS_82;
            const __VLS_83 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.workflow))
                        return;
                    if (!!(__VLS_ctx.editingStatusId === data.id))
                        return;
                    __VLS_ctx.startEdit(data);
                }
            };
            var __VLS_79;
            const __VLS_84 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                size: "small",
                text: true,
                severity: "danger",
            }));
            const __VLS_86 = __VLS_85({
                ...{ 'onClick': {} },
                icon: "pi pi-trash",
                size: "small",
                text: true,
                severity: "danger",
            }, ...__VLS_functionalComponentArgsRest(__VLS_85));
            let __VLS_88;
            let __VLS_89;
            let __VLS_90;
            const __VLS_91 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.workflow))
                        return;
                    if (!!(__VLS_ctx.editingStatusId === data.id))
                        return;
                    __VLS_ctx.removeStatus(data);
                }
            };
            var __VLS_87;
        }
    }
    var __VLS_59;
    var __VLS_15;
}
const __VLS_92 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    visible: (__VLS_ctx.showAddDialog),
    header: (__VLS_ctx.t('kb.addStatus')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}));
const __VLS_94 = __VLS_93({
    visible: (__VLS_ctx.showAddDialog),
    header: (__VLS_ctx.t('kb.addStatus')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('kb.statusName'));
const __VLS_96 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: (__VLS_ctx.newStatus.name),
    ...{ class: "w-full" },
    autofocus: true,
}));
const __VLS_98 = __VLS_97({
    modelValue: (__VLS_ctx.newStatus.name),
    ...{ class: "w-full" },
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('kb.statusCategory'));
const __VLS_100 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    modelValue: (__VLS_ctx.newStatus.category),
    options: (__VLS_ctx.categoryOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
}));
const __VLS_102 = __VLS_101({
    modelValue: (__VLS_ctx.newStatus.category),
    options: (__VLS_ctx.categoryOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('kb.statusColor'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "color",
    ...{ class: "w-full" },
    ...{ style: {} },
});
(__VLS_ctx.newStatus.color);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.t('kb.statusPosition'));
const __VLS_104 = {}.InputNumber;
/** @type {[typeof __VLS_components.InputNumber, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    modelValue: (__VLS_ctx.newStatus.position),
    ...{ class: "w-full" },
    min: (0),
}));
const __VLS_106 = __VLS_105({
    modelValue: (__VLS_ctx.newStatus.position),
    ...{ class: "w-full" },
    min: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "flex align-items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.newStatus.is_initial);
(__VLS_ctx.t('kb.isInitial'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "flex align-items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.newStatus.is_terminal);
(__VLS_ctx.t('kb.isTerminal'));
{
    const { footer: __VLS_thisSlot } = __VLS_95.slots;
    const __VLS_108 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showAddDialog = false;
        }
    };
    var __VLS_111;
    const __VLS_116 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
        disabled: (!__VLS_ctx.newStatus.name.trim()),
    }));
    const __VLS_118 = __VLS_117({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
        disabled: (!__VLS_ctx.newStatus.name.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    let __VLS_120;
    let __VLS_121;
    let __VLS_122;
    const __VLS_123 = {
        onClick: (__VLS_ctx.addStatus)
    };
    var __VLS_119;
}
var __VLS_95;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
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
            InputText: InputText,
            InputNumber: InputNumber,
            Select: Select,
            Tag: Tag,
            Dialog: Dialog,
            DataTable: DataTable,
            Column: Column,
            ProgressSpinner: ProgressSpinner,
            t: t,
            workflow: workflow,
            loading: loading,
            showAddDialog: showAddDialog,
            newStatus: newStatus,
            saving: saving,
            editingStatusId: editingStatusId,
            editDraft: editDraft,
            categoryOptions: categoryOptions,
            addStatus: addStatus,
            startEdit: startEdit,
            commitEdit: commitEdit,
            cancelEdit: cancelEdit,
            removeStatus: removeStatus,
            severityForCategory: severityForCategory,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
