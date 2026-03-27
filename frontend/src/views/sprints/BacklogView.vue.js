import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useToastService } from '@/composables/useToast';
import { getBacklog, listSprints, moveToSprint, } from '@/api/sprints';
import { updateTicket } from '@/api/tickets';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToastService();
const projectId = route.params.projectId;
const backlogTickets = ref([]);
const sprints = ref([]);
const loading = ref(false);
const total = ref(0);
const selectedTickets = ref([]);
const showMoveDialog = ref(false);
const targetSprintId = ref(null);
const moving = ref(false);
const TICKET_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'];
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'];
const typeOptions = TICKET_TYPES.map(v => ({ label: formatLabel(v), value: v }));
const priorityOptions = PRIORITIES.map(v => ({ label: formatLabel(v), value: v }));
const availableSprints = computed(() => sprints.value
    .filter(s => s.status !== 'completed')
    .map(s => ({ label: `${s.name}${s.status === 'active' ? ' ★' : ''}`, value: s.id })));
const sprintRowOptions = computed(() => [
    ...availableSprints.value,
]);
const editingCell = ref(null);
const storyPointsEditModel = computed({
    get() {
        const c = editingCell.value;
        if (!c || c.field !== 'story_points')
            return null;
        const v = c.value;
        if (v == null)
            return null;
        return typeof v === 'number' ? v : Number(v);
    },
    set(next) {
        const c = editingCell.value;
        if (c?.field === 'story_points')
            c.value = next;
    },
});
function formatLabel(s) {
    if (!s)
        return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function prioritySeverity(p) {
    if (p === 'highest' || p === 'high')
        return 'danger';
    if (p === 'low' || p === 'lowest')
        return 'secondary';
    return 'info';
}
function sprintName(sprintId) {
    if (!sprintId)
        return '—';
    const s = sprints.value.find(sp => sp.id === sprintId);
    return s ? s.name : '—';
}
async function loadBacklog() {
    loading.value = true;
    try {
        const [backlogRes, sprintRes] = await Promise.all([
            getBacklog(projectId, { limit: 200 }),
            listSprints(projectId, { limit: 100 }),
        ]);
        backlogTickets.value = backlogRes.items;
        total.value = backlogRes.total;
        sprints.value = sprintRes.items;
    }
    finally {
        loading.value = false;
    }
}
function startEdit(row, field, currentValue) {
    editingCell.value = { id: row.id, field, value: currentValue };
}
function cancelEdit() {
    editingCell.value = null;
}
function isEditing(rowId, field) {
    return editingCell.value?.id === rowId && editingCell.value?.field === field;
}
function applyPatch(ticketId, updated) {
    backlogTickets.value = backlogTickets.value.map(tk => tk.id === ticketId ? updated : tk);
}
async function commitEdit(row) {
    const cell = editingCell.value;
    if (!cell)
        return;
    const newVal = cell.value;
    const payload = {};
    let changed = false;
    if (cell.field === 'ticket_type' && newVal !== row.ticket_type) {
        payload.ticket_type = newVal;
        changed = true;
    }
    else if (cell.field === 'priority' && newVal !== row.priority) {
        payload.priority = newVal;
        changed = true;
    }
    else if (cell.field === 'story_points') {
        const n = newVal ?? null;
        if (n !== (row.story_points ?? null)) {
            payload.story_points = n;
            changed = true;
        }
    }
    else if (cell.field === 'sprint_id') {
        const next = newVal ?? null;
        if (next !== (row.sprint_id ?? null)) {
            payload.sprint_id = next;
            changed = true;
        }
    }
    if (changed) {
        try {
            const updated = await updateTicket(row.id, payload);
            if (cell.field === 'sprint_id' && payload.sprint_id) {
                backlogTickets.value = backlogTickets.value.filter(tk => tk.id !== row.id);
                total.value = Math.max(0, total.value - 1);
            }
            else {
                applyPatch(row.id, updated);
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    cancelEdit();
}
async function onStoryPointsBlur(row) {
    await commitEdit(row);
}
function openMoveDialog() {
    if (selectedTickets.value.length === 0)
        return;
    targetSprintId.value = availableSprints.value[0]?.value ?? null;
    showMoveDialog.value = true;
}
async function onMove() {
    if (!targetSprintId.value || selectedTickets.value.length === 0)
        return;
    moving.value = true;
    try {
        const ids = selectedTickets.value.map(tk => tk.id);
        const result = await moveToSprint(projectId, ids, targetSprintId.value);
        toast.showSuccess(t('common.success'), t('sprints.movedToSprint', { count: result.moved }));
        showMoveDialog.value = false;
        selectedTickets.value = [];
        await loadBacklog();
    }
    finally {
        moving.value = false;
    }
}
function goToSprints() {
    router.push(`/projects/${projectId}/sprints`);
}
onMounted(loadBacklog);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inline-editable']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0" },
});
(__VLS_ctx.$t('sprints.backlog'));
const __VLS_0 = {}.Tag;
/** @type {[typeof __VLS_components.Tag, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    value: (`${__VLS_ctx.total} ${__VLS_ctx.$t('sprints.items')}`),
    severity: "secondary",
}));
const __VLS_2 = __VLS_1({
    value: (`${__VLS_ctx.total} ${__VLS_ctx.$t('sprints.items')}`),
    severity: "secondary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2" },
});
const __VLS_4 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.moveToSprintBtn')),
    icon: "pi pi-arrow-right",
    severity: "info",
    size: "small",
    disabled: (__VLS_ctx.selectedTickets.length === 0),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.moveToSprintBtn')),
    icon: "pi pi-arrow-right",
    severity: "info",
    size: "small",
    disabled: (__VLS_ctx.selectedTickets.length === 0),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.openMoveDialog)
};
var __VLS_7;
const __VLS_12 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.title')),
    icon: "pi pi-calendar",
    severity: "secondary",
}));
const __VLS_14 = __VLS_13({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('sprints.title')),
    icon: "pi pi-calendar",
    severity: "secondary",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onClick: (__VLS_ctx.goToSprints)
};
var __VLS_15;
const __VLS_20 = {}.DataTable;
/** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    value: (__VLS_ctx.backlogTickets),
    loading: (__VLS_ctx.loading),
    selection: (__VLS_ctx.selectedTickets),
    dataKey: "id",
    stripedRows: true,
    scrollable: true,
    scrollHeight: "60vh",
    paginator: true,
    rows: (50),
    rowsPerPageOptions: ([25, 50, 100]),
    responsiveLayout: "scroll",
    ...{ class: "backlog-table" },
}));
const __VLS_22 = __VLS_21({
    value: (__VLS_ctx.backlogTickets),
    loading: (__VLS_ctx.loading),
    selection: (__VLS_ctx.selectedTickets),
    dataKey: "id",
    stripedRows: true,
    scrollable: true,
    scrollHeight: "60vh",
    paginator: true,
    rows: (50),
    rowsPerPageOptions: ([25, 50, 100]),
    responsiveLayout: "scroll",
    ...{ class: "backlog-table" },
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
{
    const { empty: __VLS_thisSlot } = __VLS_23.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-color-secondary p-4" },
    });
    (__VLS_ctx.$t('sprints.emptyBacklog'));
}
const __VLS_24 = {}.Column;
/** @type {[typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    selectionMode: "multiple",
    headerStyle: "width: 3rem",
}));
const __VLS_26 = __VLS_25({
    selectionMode: "multiple",
    headerStyle: "width: 3rem",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
const __VLS_28 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    header: (__VLS_ctx.$t('tickets.title')),
    field: "ticket_key",
}));
const __VLS_30 = __VLS_29({
    header: (__VLS_ctx.$t('tickets.title')),
    field: "ticket_key",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_31.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2" },
    });
    const __VLS_32 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        to: (`/tickets/${data.id}`),
        ...{ class: "no-underline flex align-items-center gap-2" },
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        to: (`/tickets/${data.id}`),
        ...{ class: "no-underline flex align-items-center gap-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: () => { }
    };
    __VLS_35.slots.default;
    const __VLS_40 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        value: (data.ticket_key || `#${data.ticket_number}`),
        severity: "info",
        ...{ class: "text-xs" },
    }));
    const __VLS_42 = __VLS_41({
        value: (data.ticket_key || `#${data.ticket_number}`),
        severity: "info",
        ...{ class: "text-xs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "font-medium text-primary hover:underline" },
    });
    (data.title);
    var __VLS_35;
}
var __VLS_31;
const __VLS_44 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    header: (__VLS_ctx.$t('tickets.type')),
    ...{ style: {} },
}));
const __VLS_46 = __VLS_45({
    header: (__VLS_ctx.$t('tickets.type')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_47.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (__VLS_ctx.isEditing(data.id, 'ticket_type')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
        });
        const __VLS_48 = {}.Select;
        /** @type {[typeof __VLS_components.Select, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.editingCell.value),
            options: (__VLS_ctx.typeOptions),
            optionLabel: "label",
            optionValue: "value",
            ...{ class: "w-full p-inputtext-sm" },
        }));
        const __VLS_50 = __VLS_49({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.editingCell.value),
            options: (__VLS_ctx.typeOptions),
            optionLabel: "label",
            optionValue: "value",
            ...{ class: "w-full p-inputtext-sm" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        let __VLS_52;
        let __VLS_53;
        let __VLS_54;
        const __VLS_55 = {
            'onUpdate:modelValue': (...[$event]) => {
                if (!(__VLS_ctx.isEditing(data.id, 'ticket_type')))
                    return;
                __VLS_ctx.commitEdit(data);
            }
        };
        var __VLS_51;
    }
    else {
        const __VLS_56 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            ...{ 'onClick': {} },
            value: (__VLS_ctx.formatLabel(data.ticket_type)),
            severity: "secondary",
            ...{ class: "text-xs cursor-pointer inline-editable-tag" },
        }));
        const __VLS_58 = __VLS_57({
            ...{ 'onClick': {} },
            value: (__VLS_ctx.formatLabel(data.ticket_type)),
            severity: "secondary",
            ...{ class: "text-xs cursor-pointer inline-editable-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_60;
        let __VLS_61;
        let __VLS_62;
        const __VLS_63 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isEditing(data.id, 'ticket_type')))
                    return;
                __VLS_ctx.startEdit(data, 'ticket_type', data.ticket_type);
            }
        };
        var __VLS_59;
    }
}
var __VLS_47;
const __VLS_64 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    header: (__VLS_ctx.$t('tickets.priority')),
    ...{ style: {} },
}));
const __VLS_66 = __VLS_65({
    header: (__VLS_ctx.$t('tickets.priority')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_67.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (__VLS_ctx.isEditing(data.id, 'priority')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
        });
        const __VLS_68 = {}.Select;
        /** @type {[typeof __VLS_components.Select, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.editingCell.value),
            options: (__VLS_ctx.priorityOptions),
            optionLabel: "label",
            optionValue: "value",
            ...{ class: "w-full p-inputtext-sm" },
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.editingCell.value),
            options: (__VLS_ctx.priorityOptions),
            optionLabel: "label",
            optionValue: "value",
            ...{ class: "w-full p-inputtext-sm" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_72;
        let __VLS_73;
        let __VLS_74;
        const __VLS_75 = {
            'onUpdate:modelValue': (...[$event]) => {
                if (!(__VLS_ctx.isEditing(data.id, 'priority')))
                    return;
                __VLS_ctx.commitEdit(data);
            }
        };
        var __VLS_71;
    }
    else {
        const __VLS_76 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
            ...{ 'onClick': {} },
            value: (__VLS_ctx.formatLabel(data.priority)),
            severity: (__VLS_ctx.prioritySeverity(data.priority)),
            ...{ class: "text-xs cursor-pointer inline-editable-tag" },
        }));
        const __VLS_78 = __VLS_77({
            ...{ 'onClick': {} },
            value: (__VLS_ctx.formatLabel(data.priority)),
            severity: (__VLS_ctx.prioritySeverity(data.priority)),
            ...{ class: "text-xs cursor-pointer inline-editable-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
        let __VLS_80;
        let __VLS_81;
        let __VLS_82;
        const __VLS_83 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isEditing(data.id, 'priority')))
                    return;
                __VLS_ctx.startEdit(data, 'priority', data.priority);
            }
        };
        var __VLS_79;
    }
}
var __VLS_67;
const __VLS_84 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    header: (__VLS_ctx.$t('tickets.storyPoints')),
    ...{ style: {} },
}));
const __VLS_86 = __VLS_85({
    header: (__VLS_ctx.$t('tickets.storyPoints')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_87.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (__VLS_ctx.isEditing(data.id, 'story_points')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
        });
        const __VLS_88 = {}.InputNumber;
        /** @type {[typeof __VLS_components.InputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
            ...{ 'onKeydown': {} },
            ...{ 'onKeydown': {} },
            ...{ 'onBlur': {} },
            modelValue: (__VLS_ctx.storyPointsEditModel),
            min: (0),
            max: (999),
            ...{ class: "w-full p-inputtext-sm" },
            inputClass: "w-full",
        }));
        const __VLS_90 = __VLS_89({
            ...{ 'onKeydown': {} },
            ...{ 'onKeydown': {} },
            ...{ 'onBlur': {} },
            modelValue: (__VLS_ctx.storyPointsEditModel),
            min: (0),
            max: (999),
            ...{ class: "w-full p-inputtext-sm" },
            inputClass: "w-full",
        }, ...__VLS_functionalComponentArgsRest(__VLS_89));
        let __VLS_92;
        let __VLS_93;
        let __VLS_94;
        const __VLS_95 = {
            onKeydown: (...[$event]) => {
                if (!(__VLS_ctx.isEditing(data.id, 'story_points')))
                    return;
                __VLS_ctx.commitEdit(data);
            }
        };
        const __VLS_96 = {
            onKeydown: (__VLS_ctx.cancelEdit)
        };
        const __VLS_97 = {
            onBlur: (...[$event]) => {
                if (!(__VLS_ctx.isEditing(data.id, 'story_points')))
                    return;
                __VLS_ctx.onStoryPointsBlur(data);
            }
        };
        var __VLS_91;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isEditing(data.id, 'story_points')))
                        return;
                    __VLS_ctx.startEdit(data, 'story_points', data.story_points ?? null);
                } },
            ...{ class: "inline-editable text-sm" },
        });
        (data.story_points != null ? data.story_points : '—');
    }
}
var __VLS_87;
const __VLS_98 = {}.Column;
/** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
// @ts-ignore
const __VLS_99 = __VLS_asFunctionalComponent(__VLS_98, new __VLS_98({
    header: (__VLS_ctx.$t('nav.sprints')),
    ...{ style: {} },
}));
const __VLS_100 = __VLS_99({
    header: (__VLS_ctx.$t('nav.sprints')),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_99));
__VLS_101.slots.default;
{
    const { body: __VLS_thisSlot } = __VLS_101.slots;
    const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
    if (__VLS_ctx.isEditing(data.id, 'sprint_id')) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
        });
        const __VLS_102 = {}.Select;
        /** @type {[typeof __VLS_components.Select, ]} */ ;
        // @ts-ignore
        const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.editingCell.value),
            options: (__VLS_ctx.sprintRowOptions),
            optionLabel: "label",
            optionValue: "value",
            placeholder: (__VLS_ctx.$t('tickets.noSprint')),
            ...{ class: "w-full p-inputtext-sm" },
            showClear: true,
        }));
        const __VLS_104 = __VLS_103({
            ...{ 'onUpdate:modelValue': {} },
            modelValue: (__VLS_ctx.editingCell.value),
            options: (__VLS_ctx.sprintRowOptions),
            optionLabel: "label",
            optionValue: "value",
            placeholder: (__VLS_ctx.$t('tickets.noSprint')),
            ...{ class: "w-full p-inputtext-sm" },
            showClear: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_103));
        let __VLS_106;
        let __VLS_107;
        let __VLS_108;
        const __VLS_109 = {
            'onUpdate:modelValue': (...[$event]) => {
                if (!(__VLS_ctx.isEditing(data.id, 'sprint_id')))
                    return;
                __VLS_ctx.commitEdit(data);
            }
        };
        var __VLS_105;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isEditing(data.id, 'sprint_id')))
                        return;
                    __VLS_ctx.startEdit(data, 'sprint_id', data.sprint_id);
                } },
            ...{ class: "inline-editable text-sm" },
        });
        (__VLS_ctx.sprintName(data.sprint_id));
    }
}
var __VLS_101;
var __VLS_23;
const __VLS_110 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_111 = __VLS_asFunctionalComponent(__VLS_110, new __VLS_110({
    visible: (__VLS_ctx.showMoveDialog),
    header: (__VLS_ctx.$t('sprints.moveToSprintBtn')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}));
const __VLS_112 = __VLS_111({
    visible: (__VLS_ctx.showMoveDialog),
    header: (__VLS_ctx.$t('sprints.moveToSprintBtn')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_111));
__VLS_113.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-color-secondary m-0" },
});
(__VLS_ctx.$t('sprints.moveDescription', { count: __VLS_ctx.selectedTickets.length }));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('sprints.targetSprint'));
const __VLS_114 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
    modelValue: (__VLS_ctx.targetSprintId),
    options: (__VLS_ctx.availableSprints),
    optionLabel: "label",
    optionValue: "value",
    placeholder: (__VLS_ctx.$t('sprints.selectSprint')),
    ...{ class: "w-full" },
}));
const __VLS_116 = __VLS_115({
    modelValue: (__VLS_ctx.targetSprintId),
    options: (__VLS_ctx.availableSprints),
    optionLabel: "label",
    optionValue: "value",
    placeholder: (__VLS_ctx.$t('sprints.selectSprint')),
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_115));
{
    const { footer: __VLS_thisSlot } = __VLS_113.slots;
    const __VLS_118 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_119 = __VLS_asFunctionalComponent(__VLS_118, new __VLS_118({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_120 = __VLS_119({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_119));
    let __VLS_122;
    let __VLS_123;
    let __VLS_124;
    const __VLS_125 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showMoveDialog = false;
        }
    };
    var __VLS_121;
    const __VLS_126 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('sprints.moveToSprintBtn')),
        icon: "pi pi-arrow-right",
        loading: (__VLS_ctx.moving),
        disabled: (!__VLS_ctx.targetSprintId),
    }));
    const __VLS_128 = __VLS_127({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('sprints.moveToSprintBtn')),
        icon: "pi pi-arrow-right",
        loading: (__VLS_ctx.moving),
        disabled: (!__VLS_ctx.targetSprintId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_127));
    let __VLS_130;
    let __VLS_131;
    let __VLS_132;
    const __VLS_133 = {
        onClick: (__VLS_ctx.onMove)
    };
    var __VLS_129;
}
var __VLS_113;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['backlog-table']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['no-underline']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Tag: Tag,
            Select: Select,
            InputNumber: InputNumber,
            Dialog: Dialog,
            DataTable: DataTable,
            Column: Column,
            backlogTickets: backlogTickets,
            loading: loading,
            total: total,
            selectedTickets: selectedTickets,
            showMoveDialog: showMoveDialog,
            targetSprintId: targetSprintId,
            moving: moving,
            typeOptions: typeOptions,
            priorityOptions: priorityOptions,
            availableSprints: availableSprints,
            sprintRowOptions: sprintRowOptions,
            editingCell: editingCell,
            storyPointsEditModel: storyPointsEditModel,
            formatLabel: formatLabel,
            prioritySeverity: prioritySeverity,
            sprintName: sprintName,
            startEdit: startEdit,
            cancelEdit: cancelEdit,
            isEditing: isEditing,
            commitEdit: commitEdit,
            onStoryPointsBlur: onStoryPointsBlur,
            openMoveDialog: openMoveDialog,
            onMove: onMove,
            goToSprints: goToSprints,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
