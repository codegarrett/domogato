import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Checkbox from 'primevue/checkbox';
import Tag from 'primevue/tag';
import { useToastService } from '@/composables/useToast';
import { listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition, addFieldOption, removeFieldOption, } from '@/api/custom-fields';
const route = useRoute();
const { t } = useI18n();
const toast = useToastService();
const projectId = route.params.projectId;
const fields = ref([]);
const loading = ref(false);
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const saving = ref(false);
const fieldTypeOptions = [
    { label: t('customFields.types.text'), value: 'text' },
    { label: t('customFields.types.number'), value: 'number' },
    { label: t('customFields.types.date'), value: 'date' },
    { label: t('customFields.types.select'), value: 'select' },
    { label: t('customFields.types.multiSelect'), value: 'multi_select' },
    { label: t('customFields.types.user'), value: 'user' },
    { label: t('customFields.types.url'), value: 'url' },
    { label: t('customFields.types.checkbox'), value: 'checkbox' },
];
const newField = ref({
    name: '',
    field_type: 'text',
    description: '',
    is_required: false,
    options: [],
});
const editingField = ref(null);
const editName = ref('');
const editDescription = ref('');
const editRequired = ref(false);
const newOptionLabel = ref('');
const newOptionColor = ref('#6366f1');
const showsOptions = computed(() => ['select', 'multi_select'].includes(newField.value.field_type));
async function loadFields() {
    loading.value = true;
    try {
        fields.value = await listFieldDefinitions(projectId);
    }
    finally {
        loading.value = false;
    }
}
function openCreateDialog() {
    newField.value = { name: '', field_type: 'text', description: '', is_required: false, options: [] };
    newOptionLabel.value = '';
    newOptionColor.value = '#6366f1';
    showCreateDialog.value = true;
}
function addNewOption() {
    if (!newOptionLabel.value.trim())
        return;
    newField.value.options = [
        ...(newField.value.options ?? []),
        { label: newOptionLabel.value.trim(), color: newOptionColor.value },
    ];
    newOptionLabel.value = '';
    newOptionColor.value = '#6366f1';
}
function removeNewOption(index) {
    newField.value.options = (newField.value.options ?? []).filter((_, i) => i !== index);
}
async function onCreate() {
    if (!newField.value.name.trim())
        return;
    saving.value = true;
    try {
        await createFieldDefinition(projectId, newField.value);
        showCreateDialog.value = false;
        toast.showSuccess(t('common.success'), t('customFields.created'));
        await loadFields();
    }
    finally {
        saving.value = false;
    }
}
function openEditDialog(field) {
    editingField.value = field;
    editName.value = field.name;
    editDescription.value = field.description ?? '';
    editRequired.value = field.is_required;
    showEditDialog.value = true;
}
async function onUpdate() {
    if (!editingField.value)
        return;
    saving.value = true;
    try {
        await updateFieldDefinition(editingField.value.id, {
            name: editName.value,
            description: editDescription.value || undefined,
            is_required: editRequired.value,
        });
        showEditDialog.value = false;
        toast.showSuccess(t('common.success'), t('customFields.updated'));
        await loadFields();
    }
    finally {
        saving.value = false;
    }
}
async function onDelete(field) {
    try {
        await deleteFieldDefinition(field.id);
        toast.showSuccess(t('common.success'), t('customFields.deleted'));
        await loadFields();
    }
    catch {
        // handled by global interceptor
    }
}
const editOptionLabel = ref('');
const editOptionColor = ref('#6366f1');
async function onAddOption() {
    if (!editingField.value || !editOptionLabel.value.trim())
        return;
    try {
        await addFieldOption(editingField.value.id, {
            label: editOptionLabel.value.trim(),
            color: editOptionColor.value,
        });
        editOptionLabel.value = '';
        editOptionColor.value = '#6366f1';
        await loadFields();
        editingField.value = fields.value.find((f) => f.id === editingField.value.id) ?? null;
    }
    catch {
        // handled by global interceptor
    }
}
async function onRemoveOption(optionId) {
    try {
        await removeFieldOption(optionId);
        await loadFields();
        if (editingField.value) {
            editingField.value = fields.value.find((f) => f.id === editingField.value.id) ?? null;
        }
    }
    catch {
        // handled by global interceptor
    }
}
function fieldTypeLabel(type) {
    const found = fieldTypeOptions.find((o) => o.value === type);
    return found?.label ?? type;
}
onMounted(loadFields);
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
(__VLS_ctx.$t('customFields.title'));
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('customFields.create')),
    icon: "pi pi-plus",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('customFields.create')),
    icon: "pi pi-plus",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.openCreateDialog)
};
var __VLS_3;
const __VLS_8 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    value: (__VLS_ctx.fields),
    loading: (__VLS_ctx.loading),
    stripedRows: true,
    responsiveLayout: "scroll",
}));
const __VLS_10 = __VLS_9({
    value: (__VLS_ctx.fields),
    loading: (__VLS_ctx.loading),
    stripedRows: true,
    responsiveLayout: "scroll",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
{
    const { empty: __VLS_thisSlot } = __VLS_11.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-color-secondary p-4" },
    });
    (__VLS_ctx.$t('customFields.empty'));
}
const __VLS_12 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    header: (__VLS_ctx.$t('customFields.fieldName')),
    field: "name",
}));
const __VLS_14 = __VLS_13({
    header: (__VLS_ctx.$t('customFields.fieldName')),
    field: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const __VLS_16 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    header: (__VLS_ctx.$t('customFields.fieldType')),
}));
const __VLS_18 = __VLS_17({
    header: (__VLS_ctx.$t('customFields.fieldType')),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_19.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_20 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        value: (__VLS_ctx.fieldTypeLabel(data.field_type)),
        severity: "info",
    }));
    const __VLS_22 = __VLS_21({
        value: (__VLS_ctx.fieldTypeLabel(data.field_type)),
        severity: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
}
var __VLS_19;
const __VLS_24 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    header: (__VLS_ctx.$t('customFields.required')),
}));
const __VLS_26 = __VLS_25({
    header: (__VLS_ctx.$t('customFields.required')),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_27.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (data.is_required) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-check text-green-500" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-minus text-color-secondary" },
        });
    }
}
var __VLS_27;
const __VLS_28 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    header: (__VLS_ctx.$t('customFields.options')),
}));
const __VLS_30 = __VLS_29({
    header: (__VLS_ctx.$t('customFields.options')),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_31.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (data.options?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-1 flex-wrap" },
        });
        for (const [opt] of __VLS_getVForSourceType((data.options))) {
            const __VLS_32 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                key: (opt.id),
                value: (opt.label),
                ...{ style: (opt.color ? { background: opt.color, color: '#fff', borderColor: opt.color } : {}) },
                rounded: true,
            }));
            const __VLS_34 = __VLS_33({
                key: (opt.id),
                value: (opt.label),
                ...{ style: (opt.color ? { background: opt.color, color: '#fff', borderColor: opt.color } : {}) },
                rounded: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary" },
        });
    }
}
var __VLS_31;
const __VLS_36 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    header: (__VLS_ctx.$t('common.actions')),
    ...{ style: {} },
}));
const __VLS_38 = __VLS_37({
    header: (__VLS_ctx.$t('common.actions')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_39.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-2" },
    });
    const __VLS_40 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        icon: "pi pi-pencil",
        severity: "secondary",
        text: true,
        rounded: true,
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        icon: "pi pi-pencil",
        severity: "secondary",
        text: true,
        rounded: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditDialog(data);
        }
    };
    var __VLS_43;
    const __VLS_48 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        severity: "danger",
        text: true,
        rounded: true,
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        icon: "pi pi-trash",
        severity: "danger",
        text: true,
        rounded: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (...[$event]) => {
            __VLS_ctx.onDelete(data);
        }
    };
    var __VLS_51;
}
var __VLS_39;
var __VLS_11;
const __VLS_56 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('customFields.create')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}));
const __VLS_58 = __VLS_57({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('customFields.create')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('customFields.fieldName'));
const __VLS_60 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    modelValue: (__VLS_ctx.newField.name),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('customFields.fieldNamePlaceholder')),
}));
const __VLS_62 = __VLS_61({
    modelValue: (__VLS_ctx.newField.name),
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('customFields.fieldNamePlaceholder')),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('customFields.fieldType'));
const __VLS_64 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.newField.field_type),
    options: (__VLS_ctx.fieldTypeOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.newField.field_type),
    options: (__VLS_ctx.fieldTypeOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('customFields.description'));
const __VLS_68 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    modelValue: (__VLS_ctx.newField.description),
    ...{ class: "w-full" },
    rows: "2",
}));
const __VLS_70 = __VLS_69({
    modelValue: (__VLS_ctx.newField.description),
    ...{ class: "w-full" },
    rows: "2",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-2" },
});
const __VLS_72 = {}.Checkbox;
/** @type {[typeof __VLS_components.Checkbox, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    modelValue: (__VLS_ctx.newField.is_required),
    binary: (true),
    inputId: "new-required",
}));
const __VLS_74 = __VLS_73({
    modelValue: (__VLS_ctx.newField.is_required),
    binary: (true),
    inputId: "new-required",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "new-required",
    ...{ class: "text-sm" },
});
(__VLS_ctx.$t('customFields.required'));
if (__VLS_ctx.showsOptions) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold" },
    });
    (__VLS_ctx.$t('customFields.options'));
    for (const [opt, i] of __VLS_getVForSourceType(((__VLS_ctx.newField.options ?? [])))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: "flex align-items-center gap-2" },
        });
        const __VLS_76 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            value: (opt.label),
            ...{ style: (opt.color ? { background: opt.color, color: '#fff' } : {}) },
            rounded: true,
        }));
        const __VLS_78 = __VLS_77({
            value: (opt.label),
            ...{ style: (opt.color ? { background: opt.color, color: '#fff' } : {}) },
            rounded: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        const __VLS_80 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            ...{ 'onClick': {} },
            icon: "pi pi-times",
            severity: "danger",
            text: true,
            rounded: true,
            size: "small",
        }));
        const __VLS_82 = __VLS_81({
            ...{ 'onClick': {} },
            icon: "pi pi-times",
            severity: "danger",
            text: true,
            rounded: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        let __VLS_84;
        let __VLS_85;
        let __VLS_86;
        const __VLS_87 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.showsOptions))
                    return;
                __VLS_ctx.removeNewOption(i);
            }
        };
        var __VLS_83;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-2 align-items-end" },
    });
    const __VLS_88 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.newOptionLabel),
        placeholder: (__VLS_ctx.$t('customFields.optionLabel')),
        ...{ class: "flex-1" },
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.newOptionLabel),
        placeholder: (__VLS_ctx.$t('customFields.optionLabel')),
        ...{ class: "flex-1" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onKeyup: (__VLS_ctx.addNewOption)
    };
    var __VLS_91;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "color",
        ...{ style: {} },
    });
    (__VLS_ctx.newOptionColor);
    const __VLS_96 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
        icon: "pi pi-plus",
        severity: "secondary",
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        icon: "pi pi-plus",
        severity: "secondary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (__VLS_ctx.addNewOption)
    };
    var __VLS_99;
}
{
    const { footer: __VLS_thisSlot } = __VLS_59.slots;
    const __VLS_104 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreateDialog = false;
        }
    };
    var __VLS_107;
    const __VLS_112 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.save')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_114 = __VLS_113({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.save')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    let __VLS_116;
    let __VLS_117;
    let __VLS_118;
    const __VLS_119 = {
        onClick: (__VLS_ctx.onCreate)
    };
    var __VLS_115;
}
var __VLS_59;
const __VLS_120 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    visible: (__VLS_ctx.showEditDialog),
    header: (__VLS_ctx.$t('customFields.edit')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}));
const __VLS_122 = __VLS_121({
    visible: (__VLS_ctx.showEditDialog),
    header: (__VLS_ctx.$t('customFields.edit')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
if (__VLS_ctx.editingField) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold mb-1" },
    });
    (__VLS_ctx.$t('customFields.fieldName'));
    const __VLS_124 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        modelValue: (__VLS_ctx.editName),
        ...{ class: "w-full" },
    }));
    const __VLS_126 = __VLS_125({
        modelValue: (__VLS_ctx.editName),
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold mb-1" },
    });
    (__VLS_ctx.$t('customFields.fieldType'));
    const __VLS_128 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        value: (__VLS_ctx.fieldTypeLabel(__VLS_ctx.editingField.field_type)),
        severity: "info",
    }));
    const __VLS_130 = __VLS_129({
        value: (__VLS_ctx.fieldTypeLabel(__VLS_ctx.editingField.field_type)),
        severity: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs text-color-secondary ml-2" },
    });
    (__VLS_ctx.$t('customFields.typeNotEditable'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold mb-1" },
    });
    (__VLS_ctx.$t('customFields.description'));
    const __VLS_132 = {}.Textarea;
    /** @type {[typeof __VLS_components.Textarea, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        modelValue: (__VLS_ctx.editDescription),
        ...{ class: "w-full" },
        rows: "2",
    }));
    const __VLS_134 = __VLS_133({
        modelValue: (__VLS_ctx.editDescription),
        ...{ class: "w-full" },
        rows: "2",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2" },
    });
    const __VLS_136 = {}.Checkbox;
    /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        modelValue: (__VLS_ctx.editRequired),
        binary: (true),
        inputId: "edit-required",
    }));
    const __VLS_138 = __VLS_137({
        modelValue: (__VLS_ctx.editRequired),
        binary: (true),
        inputId: "edit-required",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "edit-required",
        ...{ class: "text-sm" },
    });
    (__VLS_ctx.$t('customFields.required'));
    if (['select', 'multi_select'].includes(__VLS_ctx.editingField.field_type)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "block text-sm font-semibold" },
        });
        (__VLS_ctx.$t('customFields.options'));
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.editingField.options))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (opt.id),
                ...{ class: "flex align-items-center gap-2" },
            });
            const __VLS_140 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
                value: (opt.label),
                ...{ style: (opt.color ? { background: opt.color, color: '#fff' } : {}) },
                rounded: true,
            }));
            const __VLS_142 = __VLS_141({
                value: (opt.label),
                ...{ style: (opt.color ? { background: opt.color, color: '#fff' } : {}) },
                rounded: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_141));
            const __VLS_144 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                severity: "danger",
                text: true,
                rounded: true,
                size: "small",
            }));
            const __VLS_146 = __VLS_145({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                severity: "danger",
                text: true,
                rounded: true,
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_145));
            let __VLS_148;
            let __VLS_149;
            let __VLS_150;
            const __VLS_151 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.editingField))
                        return;
                    if (!(['select', 'multi_select'].includes(__VLS_ctx.editingField.field_type)))
                        return;
                    __VLS_ctx.onRemoveOption(opt.id);
                }
            };
            var __VLS_147;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-2 align-items-end" },
        });
        const __VLS_152 = {}.InputText;
        /** @type {[typeof __VLS_components.InputText, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            ...{ 'onKeyup': {} },
            modelValue: (__VLS_ctx.editOptionLabel),
            placeholder: (__VLS_ctx.$t('customFields.optionLabel')),
            ...{ class: "flex-1" },
        }));
        const __VLS_154 = __VLS_153({
            ...{ 'onKeyup': {} },
            modelValue: (__VLS_ctx.editOptionLabel),
            placeholder: (__VLS_ctx.$t('customFields.optionLabel')),
            ...{ class: "flex-1" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        let __VLS_156;
        let __VLS_157;
        let __VLS_158;
        const __VLS_159 = {
            onKeyup: (__VLS_ctx.onAddOption)
        };
        var __VLS_155;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "color",
            ...{ style: {} },
        });
        (__VLS_ctx.editOptionColor);
        const __VLS_160 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            severity: "secondary",
        }));
        const __VLS_162 = __VLS_161({
            ...{ 'onClick': {} },
            icon: "pi pi-plus",
            severity: "secondary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        let __VLS_164;
        let __VLS_165;
        let __VLS_166;
        const __VLS_167 = {
            onClick: (__VLS_ctx.onAddOption)
        };
        var __VLS_163;
    }
}
{
    const { footer: __VLS_thisSlot } = __VLS_123.slots;
    const __VLS_168 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_172;
    let __VLS_173;
    let __VLS_174;
    const __VLS_175 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showEditDialog = false;
        }
    };
    var __VLS_171;
    const __VLS_176 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.save')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.save')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_180;
    let __VLS_181;
    let __VLS_182;
    const __VLS_183 = {
        onClick: (__VLS_ctx.onUpdate)
    };
    var __VLS_179;
}
var __VLS_123;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-minus']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
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
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            DataTable: DataTable,
            Column: Column,
            Dialog: Dialog,
            InputText: InputText,
            Select: Select,
            Textarea: Textarea,
            Checkbox: Checkbox,
            Tag: Tag,
            fields: fields,
            loading: loading,
            showCreateDialog: showCreateDialog,
            showEditDialog: showEditDialog,
            saving: saving,
            fieldTypeOptions: fieldTypeOptions,
            newField: newField,
            editingField: editingField,
            editName: editName,
            editDescription: editDescription,
            editRequired: editRequired,
            newOptionLabel: newOptionLabel,
            newOptionColor: newOptionColor,
            showsOptions: showsOptions,
            openCreateDialog: openCreateDialog,
            addNewOption: addNewOption,
            removeNewOption: removeNewOption,
            onCreate: onCreate,
            openEditDialog: openEditDialog,
            onUpdate: onUpdate,
            onDelete: onDelete,
            editOptionLabel: editOptionLabel,
            editOptionColor: editOptionColor,
            onAddOption: onAddOption,
            onRemoveOption: onRemoveOption,
            fieldTypeLabel: fieldTypeLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
