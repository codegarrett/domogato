import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToastService } from '@/composables/useToast';
import { getProject } from '@/api/projects';
import { getWorkflow } from '@/api/workflows';
import { analyzeImport, executeImport, } from '@/api/importTickets';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToastService();
const projectId = computed(() => route.params.projectId);
const project = ref(null);
const loadingProject = ref(true);
const workflowStatuses = ref([]);
const activeStep = ref(0);
const stepLabels = computed(() => [
    t('import.stepUpload'),
    t('import.stepColumns'),
    t('import.stepValues'),
    t('import.stepPreview'),
    t('import.stepResults'),
]);
const inputMode = ref('file');
const fileFormat = ref('csv');
const rawText = ref('');
const fileName = ref('');
const fileSize = ref(0);
const dragOver = ref(false);
const analyzing = ref(false);
const executing = ref(false);
const analysis = ref(null);
const importResult = ref(null);
const fileSizeFormatted = computed(() => {
    const s = fileSize.value;
    if (s < 1024)
        return `${s} B`;
    if (s < 1024 * 1024)
        return `${(s / 1024).toFixed(1)} KB`;
    return `${(s / (1024 * 1024)).toFixed(1)} MB`;
});
const hasContent = computed(() => {
    if (inputMode.value === 'file')
        return rawText.value.length > 0;
    return rawText.value.trim().length > 0;
});
const columnMappingRows = ref([]);
const TARGET_FIELDS = [
    { value: 'title', label: 'Title' },
    { value: 'description', label: 'Description' },
    { value: 'ticket_type', label: 'Type' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'reporter', label: 'Reporter' },
    { value: 'labels', label: 'Labels' },
    { value: 'sprint', label: 'Sprint' },
    { value: 'story_points', label: 'Story Points' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'start_date', label: 'Start Date' },
    { value: 'external_key', label: 'External Key' },
    { value: 'parent_key', label: 'Parent Key' },
    { value: 'resolution', label: 'Resolution' },
    { value: 'resolved_at', label: 'Resolved Date' },
    { value: 'created_date', label: 'Created Date' },
    { value: 'updated_date', label: 'Updated Date' },
];
const targetFieldOptions = computed(() => TARGET_FIELDS);
const ticketTypeOptions = [
    { value: 'task', label: 'Task' },
    { value: 'bug', label: 'Bug' },
    { value: 'story', label: 'Story' },
    { value: 'epic', label: 'Epic' },
    { value: 'subtask', label: 'Subtask' },
];
const priorityOptions = [
    { value: 'lowest', label: 'Lowest' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'highest', label: 'Highest' },
];
const workflowStatusOptions = computed(() => workflowStatuses.value.map((ws) => ({ value: ws.id, label: ws.name })));
const valueMappingFields = ref([]);
const valueMappingData = ref({});
const importOptions = ref({
    create_labels: true,
    create_sprints: false,
    skip_resolved: false,
});
function fieldLabel(field) {
    const match = TARGET_FIELDS.find((f) => f.value === field);
    return match ? match.label : field;
}
function getSampleValue(col) {
    if (!analysis.value?.sample_rows?.length)
        return '';
    for (const row of analysis.value.sample_rows) {
        const val = row[col];
        if (val != null && val !== '') {
            const str = Array.isArray(val) ? val.filter(Boolean).join(', ') : String(val);
            return str.length > 80 ? str.substring(0, 80) + '...' : str;
        }
    }
    return '';
}
function autoSuggestValueMappings(field, values) {
    return values.map((v) => {
        let target = null;
        if (field === 'ticket_type') {
            const lower = v.toLowerCase().replace(/[- ]/g, '');
            const map = { task: 'task', bug: 'bug', story: 'story', epic: 'epic', subtask: 'subtask' };
            target = map[lower] ?? null;
        }
        else if (field === 'priority') {
            const lower = v.toLowerCase();
            const map = { highest: 'highest', high: 'high', medium: 'medium', low: 'low', lowest: 'lowest' };
            target = map[lower] ?? null;
        }
        else if (field === 'status') {
            const lower = v.toLowerCase();
            const match = workflowStatuses.value.find((ws) => ws.name.toLowerCase() === lower);
            target = match?.id ?? null;
        }
        return { source: v, target };
    });
}
const previewColumns = computed(() => {
    return columnMappingRows.value
        .filter((r) => r.target)
        .map((r) => r.target);
});
const previewRows = computed(() => {
    if (!analysis.value?.sample_rows)
        return [];
    const colMap = {};
    for (const r of columnMappingRows.value) {
        if (r.target)
            colMap[r.source] = r.target;
    }
    const valMaps = {};
    for (const [field, vms] of Object.entries(valueMappingData.value)) {
        valMaps[field] = {};
        for (const vm of vms) {
            valMaps[field][vm.source] = vm.target;
        }
    }
    return analysis.value.sample_rows.slice(0, 10).map((raw) => {
        const mapped = {};
        for (const [src, tgt] of Object.entries(colMap)) {
            let val = raw[src];
            if (val == null)
                continue;
            if (tgt in valMaps) {
                const fieldMap = valMaps[tgt];
                if (!fieldMap)
                    continue;
                if (Array.isArray(val)) {
                    val = val.map((v) => fieldMap[v] ?? v);
                }
                else {
                    val = fieldMap[String(val)] ?? val;
                }
            }
            mapped[tgt] = val;
        }
        return mapped;
    });
});
function formatPreviewValue(val) {
    if (val == null)
        return '';
    if (Array.isArray(val))
        return val.filter(Boolean).join(', ');
    const s = String(val);
    return s.length > 60 ? s.substring(0, 60) + '...' : s;
}
async function handleFileSelect(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    await readFile(file);
}
function handleDrop(e) {
    dragOver.value = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file)
        return;
    readFile(file);
}
async function readFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        toast.showError(t('import.fileTooLarge'), t('import.maxSize'));
        return;
    }
    fileName.value = file.name;
    fileSize.value = file.size;
    if (file.name.endsWith('.json')) {
        fileFormat.value = 'json';
    }
    else {
        fileFormat.value = 'csv';
    }
    rawText.value = await file.text();
}
async function doAnalyze() {
    analyzing.value = true;
    try {
        analysis.value = await analyzeImport(projectId.value, rawText.value, fileFormat.value);
        columnMappingRows.value = analysis.value.columns.map((col) => {
            const suggested = analysis.value.suggested_mappings.find((m) => m.source_column === col);
            return {
                source: col,
                target: suggested?.target_field ?? null,
                sample: getSampleValue(col),
            };
        });
        activeStep.value = 1;
    }
    catch (e) {
        toast.showError(t('import.analyzeFailed'), e?.response?.data?.detail || e.message);
    }
    finally {
        analyzing.value = false;
    }
}
function goToValueMapping() {
    if (!analysis.value)
        return;
    const mappedTargets = columnMappingRows.value
        .filter((r) => r.target)
        .map((r) => r.target);
    const enumFields = ['ticket_type', 'priority', 'status'];
    const fields = enumFields.filter((f) => mappedTargets.includes(f));
    valueMappingFields.value = fields;
    const data = {};
    for (const field of fields) {
        const values = analysis.value.unique_values[field] || [];
        data[field] = autoSuggestValueMappings(field, values);
    }
    valueMappingData.value = data;
    activeStep.value = 2;
}
function goToPreview() {
    activeStep.value = 3;
}
async function doExecute() {
    if (!analysis.value)
        return;
    executing.value = true;
    const colMappings = columnMappingRows.value
        .filter((r) => r.target)
        .map((r) => ({ source_column: r.source, target_field: r.target }));
    const valMappings = {};
    for (const [field, vms] of Object.entries(valueMappingData.value)) {
        valMappings[field] = vms
            .filter((vm) => vm.target != null)
            .map((vm) => ({ source_value: vm.source, target_value: vm.target }));
    }
    try {
        importResult.value = await executeImport(projectId.value, {
            import_session_id: analysis.value.import_session_id,
            column_mappings: colMappings,
            value_mappings: valMappings,
            options: importOptions.value,
        });
        activeStep.value = 4;
        toast.showSuccess(t('import.importComplete'), t('import.ticketsCreatedMsg', { count: importResult.value.tickets_created }));
    }
    catch (e) {
        toast.showError(t('import.executeFailed'), e?.response?.data?.detail || e.message);
    }
    finally {
        executing.value = false;
    }
}
function goBack() {
    router.push({ name: 'ticket-list', params: { projectId: projectId.value } });
}
onMounted(async () => {
    try {
        project.value = await getProject(projectId.value);
        if (project.value?.default_workflow_id) {
            const wf = await getWorkflow(project.value.default_workflow_id);
            workflowStatuses.value = wf.statuses || [];
        }
    }
    catch {
        toast.showError(t('tickets.projectNotFound'), '');
    }
    finally {
        loadingProject.value = false;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "import-tickets-view" },
});
if (__VLS_ctx.loadingProject) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center align-items-center p-6" },
    });
    const __VLS_0 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ style: {} },
        strokeWidth: "4",
    }));
    const __VLS_2 = __VLS_1({
        ...{ style: {} },
        strokeWidth: "4",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.project) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1 mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-3" },
    });
    const __VLS_4 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ 'onClick': {} },
        icon: "pi pi-arrow-left",
        text: true,
        rounded: true,
    }));
    const __VLS_6 = __VLS_5({
        ...{ 'onClick': {} },
        icon: "pi pi-arrow-left",
        text: true,
        rounded: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    let __VLS_8;
    let __VLS_9;
    let __VLS_10;
    const __VLS_11 = {
        onClick: (__VLS_ctx.goBack)
    };
    var __VLS_7;
    const __VLS_12 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        value: (__VLS_ctx.project.key),
        severity: "info",
        ...{ class: "text-lg font-semibold" },
    }));
    const __VLS_14 = __VLS_13({
        value: (__VLS_ctx.project.key),
        severity: "info",
        ...{ class: "text-lg font-semibold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "m-0 text-2xl font-semibold" },
    });
    (__VLS_ctx.$t('import.title'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-center gap-2 mb-5" },
    });
    for (const [step, idx] of __VLS_getVForSourceType((__VLS_ctx.stepLabels))) {
        (idx);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    idx < __VLS_ctx.activeStep ? __VLS_ctx.activeStep = idx : undefined;
                } },
            ...{ class: "flex align-items-center gap-2 cursor-pointer" },
            ...{ class: ({ 'opacity-50': idx > __VLS_ctx.activeStep }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "flex align-items-center justify-content-center border-circle w-2rem h-2rem text-sm font-bold" },
            ...{ class: (idx === __VLS_ctx.activeStep ? 'bg-primary text-white' : idx < __VLS_ctx.activeStep ? 'bg-green-500 text-white' : 'surface-200 text-color-secondary') },
        });
        if (idx < __VLS_ctx.activeStep) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "pi pi-check text-xs" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (idx + 1);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm font-medium hidden md:inline" },
            ...{ class: (idx === __VLS_ctx.activeStep ? 'text-primary' : 'text-color-secondary') },
        });
        (step);
        if (idx < __VLS_ctx.stepLabels.length - 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "pi pi-chevron-right text-color-secondary text-xs" },
            });
        }
    }
    if (__VLS_ctx.activeStep === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-xl font-semibold mb-3" },
        });
        (__VLS_ctx.$t('import.uploadTitle'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-color-secondary mb-4" },
        });
        (__VLS_ctx.$t('import.uploadDescription'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ onDragover: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.activeStep === 0))
                        return;
                    __VLS_ctx.dragOver = true;
                } },
            ...{ onDragleave: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.activeStep === 0))
                        return;
                    __VLS_ctx.dragOver = false;
                } },
            ...{ onDrop: (__VLS_ctx.handleDrop) },
            ...{ class: "flex flex-column align-items-center justify-content-center border-2 border-dashed border-round p-6 cursor-pointer" },
            ...{ class: (__VLS_ctx.dragOver ? 'border-primary' : 'border-300') },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "pi pi-upload text-4xl text-color-secondary mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-lg font-medium" },
        });
        (__VLS_ctx.$t('import.dropFile'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary text-sm mt-1" },
        });
        (__VLS_ctx.$t('import.orClickBrowse'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.handleFileSelect) },
            type: "file",
            accept: ".csv,.json,.txt",
            ...{ style: {} },
        });
        if (__VLS_ctx.fileName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3 flex align-items-center gap-2 p-3 surface-ground border-round" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "pi pi-file text-primary text-xl" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium" },
            });
            (__VLS_ctx.fileName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-color-secondary text-sm" },
            });
            (__VLS_ctx.fileSizeFormatted);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "pi pi-check-circle text-green-500 ml-auto" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-4 pt-3 border-top-1 surface-border flex justify-content-end" },
        });
        const __VLS_16 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.hasContent ? 'Analyze & Continue' : 'Select a file first'),
            icon: (__VLS_ctx.hasContent ? 'pi pi-arrow-right' : 'pi pi-info-circle'),
            iconPos: (__VLS_ctx.hasContent ? 'right' : 'left'),
            disabled: (!__VLS_ctx.hasContent),
            loading: (__VLS_ctx.analyzing),
        }));
        const __VLS_18 = __VLS_17({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.hasContent ? 'Analyze & Continue' : 'Select a file first'),
            icon: (__VLS_ctx.hasContent ? 'pi pi-arrow-right' : 'pi pi-info-circle'),
            iconPos: (__VLS_ctx.hasContent ? 'right' : 'left'),
            disabled: (!__VLS_ctx.hasContent),
            loading: (__VLS_ctx.analyzing),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        let __VLS_20;
        let __VLS_21;
        let __VLS_22;
        const __VLS_23 = {
            onClick: (__VLS_ctx.doAnalyze)
        };
        var __VLS_19;
    }
    if (__VLS_ctx.activeStep === 1 && __VLS_ctx.analysis) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-xl font-semibold mb-2" },
        });
        (__VLS_ctx.$t('import.columnMappingTitle'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-color-secondary mb-4" },
        });
        (__VLS_ctx.$t('import.columnMappingDescription', { total: __VLS_ctx.analysis.total_rows }));
        const __VLS_24 = {}.DataTable;
        /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            value: (__VLS_ctx.columnMappingRows),
            responsiveLayout: "scroll",
            ...{ class: "mb-4" },
        }));
        const __VLS_26 = __VLS_25({
            value: (__VLS_ctx.columnMappingRows),
            responsiveLayout: "scroll",
            ...{ class: "mb-4" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        const __VLS_28 = {}.Column;
        /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            field: "source",
            header: (__VLS_ctx.$t('import.sourceColumn')),
            ...{ style: {} },
        }));
        const __VLS_30 = __VLS_29({
            field: "source",
            header: (__VLS_ctx.$t('import.sourceColumn')),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_31.slots.default;
        {
            const { body: __VLS_thisSlot } = __VLS_31.slots;
            const { data: row } = __VLS_getSlotParam(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium" },
            });
            (row.source);
        }
        var __VLS_31;
        const __VLS_32 = {}.Column;
        /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            header: (__VLS_ctx.$t('import.targetField')),
            ...{ style: {} },
        }));
        const __VLS_34 = __VLS_33({
            header: (__VLS_ctx.$t('import.targetField')),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        {
            const { body: __VLS_thisSlot } = __VLS_35.slots;
            const { data: row } = __VLS_getSlotParam(__VLS_thisSlot);
            const __VLS_36 = {}.Select;
            /** @type {[typeof __VLS_components.Select, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                modelValue: (row.target),
                options: (__VLS_ctx.targetFieldOptions),
                optionLabel: "label",
                optionValue: "value",
                placeholder: (__VLS_ctx.$t('import.skipColumn')),
                ...{ class: "w-full" },
                showClear: true,
            }));
            const __VLS_38 = __VLS_37({
                modelValue: (row.target),
                options: (__VLS_ctx.targetFieldOptions),
                optionLabel: "label",
                optionValue: "value",
                placeholder: (__VLS_ctx.$t('import.skipColumn')),
                ...{ class: "w-full" },
                showClear: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        }
        var __VLS_35;
        const __VLS_40 = {}.Column;
        /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
        // @ts-ignore
        const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
            header: (__VLS_ctx.$t('import.sampleValue')),
            ...{ style: {} },
        }));
        const __VLS_42 = __VLS_41({
            header: (__VLS_ctx.$t('import.sampleValue')),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_41));
        __VLS_43.slots.default;
        {
            const { body: __VLS_thisSlot } = __VLS_43.slots;
            const { data: row } = __VLS_getSlotParam(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-color-secondary text-sm" },
                ...{ style: {} },
            });
            (row.sample);
        }
        var __VLS_43;
        var __VLS_27;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-between" },
        });
        const __VLS_44 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.back')),
            icon: "pi pi-arrow-left",
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_46 = __VLS_45({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.back')),
            icon: "pi pi-arrow-left",
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        let __VLS_48;
        let __VLS_49;
        let __VLS_50;
        const __VLS_51 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadingProject))
                    return;
                if (!(__VLS_ctx.project))
                    return;
                if (!(__VLS_ctx.activeStep === 1 && __VLS_ctx.analysis))
                    return;
                __VLS_ctx.activeStep = 0;
            }
        };
        var __VLS_47;
        const __VLS_52 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.next')),
            icon: "pi pi-arrow-right",
            iconPos: "right",
        }));
        const __VLS_54 = __VLS_53({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.next')),
            icon: "pi pi-arrow-right",
            iconPos: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        let __VLS_56;
        let __VLS_57;
        let __VLS_58;
        const __VLS_59 = {
            onClick: (__VLS_ctx.goToValueMapping)
        };
        var __VLS_55;
    }
    if (__VLS_ctx.activeStep === 2 && __VLS_ctx.analysis) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-xl font-semibold mb-2" },
        });
        (__VLS_ctx.$t('import.valueMappingTitle'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-color-secondary mb-4" },
        });
        (__VLS_ctx.$t('import.valueMappingDescription'));
        for (const [field] of __VLS_getVForSourceType((__VLS_ctx.valueMappingFields))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (field),
                ...{ class: "mb-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                ...{ class: "text-lg font-semibold mb-2" },
            });
            (__VLS_ctx.fieldLabel(field));
            (__VLS_ctx.valueMappingData[field]?.length ?? 0);
            (__VLS_ctx.$t('import.values'));
            const __VLS_60 = {}.DataTable;
            /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                value: (__VLS_ctx.valueMappingData[field] || []),
                responsiveLayout: "scroll",
            }));
            const __VLS_62 = __VLS_61({
                value: (__VLS_ctx.valueMappingData[field] || []),
                responsiveLayout: "scroll",
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            __VLS_63.slots.default;
            const __VLS_64 = {}.Column;
            /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                field: "source",
                header: (__VLS_ctx.$t('import.sourceValue')),
                ...{ style: {} },
            }));
            const __VLS_66 = __VLS_65({
                field: "source",
                header: (__VLS_ctx.$t('import.sourceValue')),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
            __VLS_67.slots.default;
            {
                const { body: __VLS_thisSlot } = __VLS_67.slots;
                const { data: row } = __VLS_getSlotParam(__VLS_thisSlot);
                const __VLS_68 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                    value: (row.source),
                    severity: "secondary",
                }));
                const __VLS_70 = __VLS_69({
                    value: (row.source),
                    severity: "secondary",
                }, ...__VLS_functionalComponentArgsRest(__VLS_69));
            }
            var __VLS_67;
            const __VLS_72 = {}.Column;
            /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
            // @ts-ignore
            const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
                header: (__VLS_ctx.$t('import.mappedTo')),
                ...{ style: {} },
            }));
            const __VLS_74 = __VLS_73({
                header: (__VLS_ctx.$t('import.mappedTo')),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_73));
            __VLS_75.slots.default;
            {
                const { body: __VLS_thisSlot } = __VLS_75.slots;
                const { data: row } = __VLS_getSlotParam(__VLS_thisSlot);
                if (field === 'status') {
                    const __VLS_76 = {}.Select;
                    /** @type {[typeof __VLS_components.Select, ]} */ ;
                    // @ts-ignore
                    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
                        modelValue: (row.target),
                        options: (__VLS_ctx.workflowStatusOptions),
                        optionLabel: "label",
                        optionValue: "value",
                        placeholder: (__VLS_ctx.$t('import.useDefault')),
                        ...{ class: "w-full" },
                        showClear: true,
                    }));
                    const __VLS_78 = __VLS_77({
                        modelValue: (row.target),
                        options: (__VLS_ctx.workflowStatusOptions),
                        optionLabel: "label",
                        optionValue: "value",
                        placeholder: (__VLS_ctx.$t('import.useDefault')),
                        ...{ class: "w-full" },
                        showClear: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
                }
                else if (field === 'ticket_type') {
                    const __VLS_80 = {}.Select;
                    /** @type {[typeof __VLS_components.Select, ]} */ ;
                    // @ts-ignore
                    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                        modelValue: (row.target),
                        options: (__VLS_ctx.ticketTypeOptions),
                        optionLabel: "label",
                        optionValue: "value",
                        placeholder: (__VLS_ctx.$t('import.useDefault')),
                        ...{ class: "w-full" },
                        showClear: true,
                    }));
                    const __VLS_82 = __VLS_81({
                        modelValue: (row.target),
                        options: (__VLS_ctx.ticketTypeOptions),
                        optionLabel: "label",
                        optionValue: "value",
                        placeholder: (__VLS_ctx.$t('import.useDefault')),
                        ...{ class: "w-full" },
                        showClear: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
                }
                else if (field === 'priority') {
                    const __VLS_84 = {}.Select;
                    /** @type {[typeof __VLS_components.Select, ]} */ ;
                    // @ts-ignore
                    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
                        modelValue: (row.target),
                        options: (__VLS_ctx.priorityOptions),
                        optionLabel: "label",
                        optionValue: "value",
                        placeholder: (__VLS_ctx.$t('import.useDefault')),
                        ...{ class: "w-full" },
                        showClear: true,
                    }));
                    const __VLS_86 = __VLS_85({
                        modelValue: (row.target),
                        options: (__VLS_ctx.priorityOptions),
                        optionLabel: "label",
                        optionValue: "value",
                        placeholder: (__VLS_ctx.$t('import.useDefault')),
                        ...{ class: "w-full" },
                        showClear: true,
                    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
                }
                else {
                    const __VLS_88 = {}.InputText;
                    /** @type {[typeof __VLS_components.InputText, ]} */ ;
                    // @ts-ignore
                    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
                        modelValue: (row.target),
                        ...{ class: "w-full" },
                    }));
                    const __VLS_90 = __VLS_89({
                        modelValue: (row.target),
                        ...{ class: "w-full" },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
                }
            }
            var __VLS_75;
            var __VLS_63;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-between mt-4" },
        });
        const __VLS_92 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.back')),
            icon: "pi pi-arrow-left",
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.back')),
            icon: "pi pi-arrow-left",
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_96;
        let __VLS_97;
        let __VLS_98;
        const __VLS_99 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadingProject))
                    return;
                if (!(__VLS_ctx.project))
                    return;
                if (!(__VLS_ctx.activeStep === 2 && __VLS_ctx.analysis))
                    return;
                __VLS_ctx.activeStep = 1;
            }
        };
        var __VLS_95;
        const __VLS_100 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.next')),
            icon: "pi pi-arrow-right",
            iconPos: "right",
        }));
        const __VLS_102 = __VLS_101({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.next')),
            icon: "pi pi-arrow-right",
            iconPos: "right",
        }, ...__VLS_functionalComponentArgsRest(__VLS_101));
        let __VLS_104;
        let __VLS_105;
        let __VLS_106;
        const __VLS_107 = {
            onClick: (__VLS_ctx.goToPreview)
        };
        var __VLS_103;
    }
    if (__VLS_ctx.activeStep === 3 && __VLS_ctx.analysis) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-xl font-semibold mb-2" },
        });
        (__VLS_ctx.$t('import.previewTitle'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-color-secondary mb-4" },
        });
        (__VLS_ctx.$t('import.previewDescription', { total: __VLS_ctx.analysis.total_rows }));
        const __VLS_108 = {}.DataTable;
        /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            value: (__VLS_ctx.previewRows),
            responsiveLayout: "scroll",
            ...{ class: "mb-4" },
            scrollable: true,
            scrollHeight: "400px",
        }));
        const __VLS_110 = __VLS_109({
            value: (__VLS_ctx.previewRows),
            responsiveLayout: "scroll",
            ...{ class: "mb-4" },
            scrollable: true,
            scrollHeight: "400px",
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        __VLS_111.slots.default;
        for (const [col] of __VLS_getVForSourceType((__VLS_ctx.previewColumns))) {
            const __VLS_112 = {}.Column;
            /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
            // @ts-ignore
            const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
                key: (col),
                field: (col),
                header: (__VLS_ctx.fieldLabel(col)),
                ...{ style: {} },
            }));
            const __VLS_114 = __VLS_113({
                key: (col),
                field: (col),
                header: (__VLS_ctx.fieldLabel(col)),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_113));
            __VLS_115.slots.default;
            {
                const { body: __VLS_thisSlot } = __VLS_115.slots;
                const { data: row } = __VLS_getSlotParam(__VLS_thisSlot);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-sm" },
                    ...{ style: {} },
                });
                (__VLS_ctx.formatPreviewValue(row[col]));
            }
            var __VLS_115;
        }
        var __VLS_111;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-ground border-round p-3 mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "text-lg font-semibold mb-3" },
        });
        (__VLS_ctx.$t('import.options'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex flex-column gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2" },
        });
        const __VLS_116 = {}.Checkbox;
        /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
        // @ts-ignore
        const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
            modelValue: (__VLS_ctx.importOptions.create_labels),
            binary: (true),
            inputId: "opt-labels",
        }));
        const __VLS_118 = __VLS_117({
            modelValue: (__VLS_ctx.importOptions.create_labels),
            binary: (true),
            inputId: "opt-labels",
        }, ...__VLS_functionalComponentArgsRest(__VLS_117));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: "opt-labels",
        });
        (__VLS_ctx.$t('import.createLabels'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2" },
        });
        const __VLS_120 = {}.Checkbox;
        /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
            modelValue: (__VLS_ctx.importOptions.create_sprints),
            binary: (true),
            inputId: "opt-sprints",
        }));
        const __VLS_122 = __VLS_121({
            modelValue: (__VLS_ctx.importOptions.create_sprints),
            binary: (true),
            inputId: "opt-sprints",
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: "opt-sprints",
        });
        (__VLS_ctx.$t('import.createSprints'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2" },
        });
        const __VLS_124 = {}.Checkbox;
        /** @type {[typeof __VLS_components.Checkbox, ]} */ ;
        // @ts-ignore
        const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
            modelValue: (__VLS_ctx.importOptions.skip_resolved),
            binary: (true),
            inputId: "opt-resolved",
        }));
        const __VLS_126 = __VLS_125({
            modelValue: (__VLS_ctx.importOptions.skip_resolved),
            binary: (true),
            inputId: "opt-resolved",
        }, ...__VLS_functionalComponentArgsRest(__VLS_125));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: "opt-resolved",
        });
        (__VLS_ctx.$t('import.skipResolved'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-between" },
        });
        const __VLS_128 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.back')),
            icon: "pi pi-arrow-left",
            severity: "secondary",
            outlined: true,
        }));
        const __VLS_130 = __VLS_129({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('common.back')),
            icon: "pi pi-arrow-left",
            severity: "secondary",
            outlined: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_129));
        let __VLS_132;
        let __VLS_133;
        let __VLS_134;
        const __VLS_135 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadingProject))
                    return;
                if (!(__VLS_ctx.project))
                    return;
                if (!(__VLS_ctx.activeStep === 3 && __VLS_ctx.analysis))
                    return;
                __VLS_ctx.activeStep = 2;
            }
        };
        var __VLS_131;
        const __VLS_136 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.executeImport', { count: __VLS_ctx.analysis.total_rows })),
            icon: "pi pi-check",
            severity: "success",
            loading: (__VLS_ctx.executing),
        }));
        const __VLS_138 = __VLS_137({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.executeImport', { count: __VLS_ctx.analysis.total_rows })),
            icon: "pi pi-check",
            severity: "success",
            loading: (__VLS_ctx.executing),
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
        let __VLS_140;
        let __VLS_141;
        let __VLS_142;
        const __VLS_143 = {
            onClick: (__VLS_ctx.doExecute)
        };
        var __VLS_139;
    }
    if (__VLS_ctx.activeStep === 4 && __VLS_ctx.importResult) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "text-xl font-semibold mb-4" },
        });
        (__VLS_ctx.$t('import.resultsTitle'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "grid mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-6 md:col-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-ground border-round p-3 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-3xl font-bold text-primary" },
        });
        (__VLS_ctx.importResult.tickets_created);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm mt-1" },
        });
        (__VLS_ctx.$t('import.ticketsCreated'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-6 md:col-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-ground border-round p-3 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-3xl font-bold" },
        });
        (__VLS_ctx.importResult.tickets_skipped);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm mt-1" },
        });
        (__VLS_ctx.$t('import.ticketsSkipped'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-6 md:col-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-ground border-round p-3 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-3xl font-bold text-green-500" },
        });
        (__VLS_ctx.importResult.parent_links_resolved);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm mt-1" },
        });
        (__VLS_ctx.$t('import.parentLinks'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-6 md:col-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "surface-ground border-round p-3 text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-3xl font-bold" },
            ...{ class: (__VLS_ctx.importResult.errors.length > 0 ? 'text-red-500' : 'text-green-500') },
        });
        (__VLS_ctx.importResult.errors.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm mt-1" },
        });
        (__VLS_ctx.$t('import.errorCount'));
        if (__VLS_ctx.importResult.labels_created.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium" },
            });
            (__VLS_ctx.$t('import.labelsCreated'));
            for (const [l] of __VLS_getVForSourceType((__VLS_ctx.importResult.labels_created))) {
                const __VLS_144 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
                    key: (l),
                    value: (l),
                    severity: "info",
                    ...{ class: "ml-2" },
                }));
                const __VLS_146 = __VLS_145({
                    key: (l),
                    value: (l),
                    severity: "info",
                    ...{ class: "ml-2" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_145));
            }
        }
        if (__VLS_ctx.importResult.sprints_created.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-medium" },
            });
            (__VLS_ctx.$t('import.sprintsCreated'));
            for (const [s] of __VLS_getVForSourceType((__VLS_ctx.importResult.sprints_created))) {
                const __VLS_148 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
                    key: (s),
                    value: (s),
                    severity: "info",
                    ...{ class: "ml-2" },
                }));
                const __VLS_150 = __VLS_149({
                    key: (s),
                    value: (s),
                    severity: "info",
                    ...{ class: "ml-2" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_149));
            }
        }
        if (__VLS_ctx.importResult.errors.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
                ...{ class: "text-lg font-semibold mb-2 text-red-500" },
            });
            (__VLS_ctx.$t('import.errors'));
            const __VLS_152 = {}.DataTable;
            /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
            // @ts-ignore
            const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
                value: (__VLS_ctx.importResult.errors),
                responsiveLayout: "scroll",
                paginator: (__VLS_ctx.importResult.errors.length > 10),
                rows: (10),
            }));
            const __VLS_154 = __VLS_153({
                value: (__VLS_ctx.importResult.errors),
                responsiveLayout: "scroll",
                paginator: (__VLS_ctx.importResult.errors.length > 10),
                rows: (10),
            }, ...__VLS_functionalComponentArgsRest(__VLS_153));
            __VLS_155.slots.default;
            const __VLS_156 = {}.Column;
            /** @type {[typeof __VLS_components.Column, ]} */ ;
            // @ts-ignore
            const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
                field: "row_number",
                header: (__VLS_ctx.$t('import.row')),
                ...{ style: {} },
            }));
            const __VLS_158 = __VLS_157({
                field: "row_number",
                header: (__VLS_ctx.$t('import.row')),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_157));
            const __VLS_160 = {}.Column;
            /** @type {[typeof __VLS_components.Column, ]} */ ;
            // @ts-ignore
            const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
                field: "external_key",
                header: (__VLS_ctx.$t('import.key')),
                ...{ style: {} },
            }));
            const __VLS_162 = __VLS_161({
                field: "external_key",
                header: (__VLS_ctx.$t('import.key')),
                ...{ style: {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_161));
            const __VLS_164 = {}.Column;
            /** @type {[typeof __VLS_components.Column, ]} */ ;
            // @ts-ignore
            const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
                field: "error",
                header: (__VLS_ctx.$t('import.errorDetail')),
            }));
            const __VLS_166 = __VLS_165({
                field: "error",
                header: (__VLS_ctx.$t('import.errorDetail')),
            }, ...__VLS_functionalComponentArgsRest(__VLS_165));
            var __VLS_155;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-end" },
        });
        const __VLS_168 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.goToTickets')),
            icon: "pi pi-list",
        }));
        const __VLS_170 = __VLS_169({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('import.goToTickets')),
            icon: "pi pi-list",
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        let __VLS_172;
        let __VLS_173;
        let __VLS_174;
        const __VLS_175 = {
            onClick: (__VLS_ctx.goBack)
        };
        var __VLS_171;
    }
}
/** @type {__VLS_StyleScopedClasses['import-tickets-view']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['border-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['w-2rem']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2rem']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['md:inline']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-chevron-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['border-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-dashed']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-upload']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-ground']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-file']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-top-1']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-border']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-ground']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-ground']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-ground']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-ground']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-ground']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-end']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Tag: Tag,
            ProgressSpinner: ProgressSpinner,
            DataTable: DataTable,
            Column: Column,
            Select: Select,
            InputText: InputText,
            Checkbox: Checkbox,
            project: project,
            loadingProject: loadingProject,
            activeStep: activeStep,
            stepLabels: stepLabels,
            fileName: fileName,
            dragOver: dragOver,
            analyzing: analyzing,
            executing: executing,
            analysis: analysis,
            importResult: importResult,
            fileSizeFormatted: fileSizeFormatted,
            hasContent: hasContent,
            columnMappingRows: columnMappingRows,
            targetFieldOptions: targetFieldOptions,
            ticketTypeOptions: ticketTypeOptions,
            priorityOptions: priorityOptions,
            workflowStatusOptions: workflowStatusOptions,
            valueMappingFields: valueMappingFields,
            valueMappingData: valueMappingData,
            importOptions: importOptions,
            fieldLabel: fieldLabel,
            previewColumns: previewColumns,
            previewRows: previewRows,
            formatPreviewValue: formatPreviewValue,
            handleFileSelect: handleFileSelect,
            handleDrop: handleDrop,
            doAnalyze: doAnalyze,
            goToValueMapping: goToValueMapping,
            goToPreview: goToPreview,
            doExecute: doExecute,
            goBack: goBack,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
