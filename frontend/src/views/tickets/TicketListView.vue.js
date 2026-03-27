import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import { listTickets, createTicket, updateTicket, transitionStatus, bulkUpdateTickets, exportTicketsCsv, } from '@/api/tickets';
import { listEpics } from '@/api/epics';
import { listSavedViews, createSavedView } from '@/api/saved-views';
import { getProject, listProjectMembers } from '@/api/projects';
import { listWorkflows } from '@/api/workflows';
import { useWebSocket } from '@/composables/useWebSocket';
const { t } = useI18n();
const route = useRoute();
const projectId = computed(() => route.params.projectId);
const project = ref(null);
const loadingProject = ref(true);
const tickets = ref([]);
const total = ref(0);
const first = ref(0);
const rows = ref(50);
const loadingTickets = ref(false);
const searchInput = ref('');
const appliedSearch = ref('');
const filterTicketType = ref(null);
const filterPriority = ref(null);
const epics = ref([]);
const loadingEpics = ref(false);
const members = ref([]);
const workflows = ref([]);
const createVisible = ref(false);
const creating = ref(false);
const createAttempted = ref(false);
const createForm = ref({
    title: '',
    description: '',
    ticket_type: 'task',
    priority: 'medium',
    epic_id: null,
    story_points: null,
});
const selectedTickets = ref([]);
const bulkDialogVisible = ref(false);
const bulkPriority = ref(null);
const bulkType = ref(null);
const bulkSaving = ref(false);
const exporting = ref(false);
const savedViews = ref([]);
const activeViewId = ref(null);
const saveViewDialogVisible = ref(false);
const saveViewName = ref('');
async function loadSavedViews() {
    try {
        savedViews.value = await listSavedViews(projectId.value);
    }
    catch {
        savedViews.value = [];
    }
}
function applySavedView(view) {
    activeViewId.value = view.id;
    const f = view.filters;
    searchInput.value = f.search || '';
    appliedSearch.value = searchInput.value;
    filterTicketType.value = f.ticket_type || null;
    filterPriority.value = f.priority || null;
    first.value = 0;
    loadTickets();
}
function clearSavedView() {
    activeViewId.value = null;
    clearFilters();
}
async function doSaveView() {
    const name = saveViewName.value.trim();
    if (!name)
        return;
    const filters = {};
    if (appliedSearch.value.trim())
        filters.search = appliedSearch.value.trim();
    if (filterTicketType.value)
        filters.ticket_type = filterTicketType.value;
    if (filterPriority.value)
        filters.priority = filterPriority.value;
    try {
        const created = await createSavedView(projectId.value, { name, filters });
        savedViews.value.push(created);
        activeViewId.value = created.id;
        saveViewDialogVisible.value = false;
        saveViewName.value = '';
    }
    catch {
        /* handled by interceptor */
    }
}
const editingCell = ref(null);
const inlineTitleRef = ref(null);
const TICKET_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'];
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'];
const ticketTypeFilterOptions = computed(() => TICKET_TYPES.map((v) => ({ label: formatLabel(v), value: v })));
const priorityFilterOptions = computed(() => PRIORITIES.map((v) => ({ label: formatLabel(v), value: v })));
const ticketTypeFormOptions = ticketTypeFilterOptions;
const priorityFormOptions = priorityFilterOptions;
const epicOptions = computed(() => epics.value.map((e) => ({ label: e.title, value: e.id })));
const assigneeOptions = computed(() => [
    ...members.value.map((m) => ({
        label: m.display_name || m.email,
        value: m.user_id,
    })),
]);
const memberMap = computed(() => {
    const map = new Map();
    for (const m of members.value) {
        map.set(m.user_id, m.display_name || m.email);
    }
    return map;
});
const statusMap = computed(() => {
    const map = new Map();
    for (const wf of workflows.value) {
        for (const s of wf.statuses) {
            map.set(s.id, s);
        }
    }
    return map;
});
function resolveAssigneeName(id) {
    if (!id)
        return '—';
    return memberMap.value.get(id) ?? '—';
}
function resolveStatusName(id) {
    return statusMap.value.get(id)?.name ?? '—';
}
function resolveStatusStyle(id) {
    const s = statusMap.value.get(id);
    if (!s?.color)
        return {};
    return { background: s.color, color: '#fff', borderColor: s.color };
}
function formatLabel(s) {
    if (!s)
        return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function prioritySeverity(priority) {
    switch (priority) {
        case 'highest':
            return 'danger';
        case 'high':
            return 'warning';
        case 'medium':
            return 'info';
        case 'low':
            return 'success';
        case 'lowest':
            return 'secondary';
        default:
            return 'secondary';
    }
}
function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    }
    catch {
        return iso;
    }
}
function startInlineEdit(row, field, currentValue) {
    editingCell.value = { id: row.id, field, value: currentValue };
    if (field === 'title') {
        void nextTick(() => {
            const root = inlineTitleRef.value;
            const el = root?.$el;
            const input = (el?.tagName === 'INPUT' ? el : el?.querySelector?.('input'));
            input?.focus();
            input?.select();
        });
    }
}
function cancelInlineEdit() {
    editingCell.value = null;
}
async function commitInlineEdit(row) {
    const cell = editingCell.value;
    if (!cell)
        return;
    const newVal = cell.value;
    if (cell.field === 'title') {
        const trimmed = newVal.trim();
        if (!trimmed || trimmed === row.title) {
            cancelInlineEdit();
            return;
        }
        try {
            const updated = await updateTicket(row.id, { title: trimmed });
            applyTicketPatch(row.id, updated);
        }
        catch (e) {
            console.error(e);
        }
    }
    else if (cell.field === 'ticket_type') {
        if (newVal === row.ticket_type) {
            cancelInlineEdit();
            return;
        }
        try {
            const updated = await updateTicket(row.id, { ticket_type: newVal });
            applyTicketPatch(row.id, updated);
        }
        catch (e) {
            console.error(e);
        }
    }
    else if (cell.field === 'priority') {
        if (newVal === row.priority) {
            cancelInlineEdit();
            return;
        }
        try {
            const updated = await updateTicket(row.id, { priority: newVal });
            applyTicketPatch(row.id, updated);
        }
        catch (e) {
            console.error(e);
        }
    }
    else if (cell.field === 'assignee_id') {
        const next = newVal ?? null;
        if (next === row.assignee_id) {
            cancelInlineEdit();
            return;
        }
        try {
            const updated = await updateTicket(row.id, { assignee_id: next });
            applyTicketPatch(row.id, updated);
        }
        catch (e) {
            console.error(e);
        }
    }
    cancelInlineEdit();
}
async function commitStatusTransition(row) {
    const cell = editingCell.value;
    if (!cell)
        return;
    const newStatusId = cell.value;
    if (newStatusId === row.workflow_status_id) {
        cancelInlineEdit();
        return;
    }
    try {
        const updated = await transitionStatus(row.id, { workflow_status_id: newStatusId });
        applyTicketPatch(row.id, updated);
    }
    catch (e) {
        console.error(e);
    }
    cancelInlineEdit();
}
function statusTransitionOptions(row) {
    const currentStatus = statusMap.value.get(row.workflow_status_id);
    const opts = [];
    if (currentStatus) {
        opts.push({ label: `${currentStatus.name} (${t('common.current')})`, value: currentStatus.id });
    }
    for (const wf of workflows.value) {
        const hasStatus = wf.statuses.some(s => s.id === row.workflow_status_id);
        if (!hasStatus)
            continue;
        for (const tr of wf.transitions) {
            if (tr.from_status_id !== row.workflow_status_id)
                continue;
            const target = statusMap.value.get(tr.to_status_id);
            if (target) {
                opts.push({ label: target.name, value: target.id });
            }
        }
    }
    return opts;
}
function applyTicketPatch(ticketId, updated) {
    tickets.value = tickets.value.map(t => t.id === ticketId ? updated : t);
}
async function loadProject() {
    loadingProject.value = true;
    try {
        project.value = await getProject(projectId.value);
    }
    catch {
        project.value = null;
    }
    finally {
        loadingProject.value = false;
    }
}
async function loadEpics() {
    loadingEpics.value = true;
    try {
        const res = await listEpics(projectId.value, 0, 200);
        epics.value = res.items;
    }
    catch {
        epics.value = [];
    }
    finally {
        loadingEpics.value = false;
    }
}
async function loadMembers() {
    try {
        const res = await listProjectMembers(projectId.value, 0, 200);
        members.value = res.items;
    }
    catch {
        members.value = [];
    }
}
async function loadWorkflows() {
    if (!project.value)
        return;
    try {
        const res = await listWorkflows(project.value.organization_id, 0, 100);
        workflows.value = res.items;
    }
    catch {
        workflows.value = [];
    }
}
async function loadTickets() {
    loadingTickets.value = true;
    try {
        const res = await listTickets(projectId.value, {
            offset: first.value,
            limit: rows.value,
            ...(appliedSearch.value.trim() ? { search: appliedSearch.value.trim() } : {}),
            ...(filterTicketType.value ? { ticket_type: filterTicketType.value } : {}),
            ...(filterPriority.value ? { priority: filterPriority.value } : {}),
        });
        tickets.value = res.items;
        total.value = res.total;
    }
    catch {
        tickets.value = [];
        total.value = 0;
    }
    finally {
        loadingTickets.value = false;
    }
}
function onPage(e) {
    first.value = e.first;
    rows.value = e.rows;
    loadTickets();
}
function applyFilters() {
    appliedSearch.value = searchInput.value;
    first.value = 0;
    loadTickets();
}
function clearFilters() {
    searchInput.value = '';
    appliedSearch.value = '';
    filterTicketType.value = null;
    filterPriority.value = null;
    first.value = 0;
    loadTickets();
}
function openCreateDialog() {
    createAttempted.value = false;
    resetCreateForm();
    createVisible.value = true;
}
function resetCreateForm() {
    createForm.value = {
        title: '',
        description: '',
        ticket_type: 'task',
        priority: 'medium',
        epic_id: null,
        story_points: null,
    };
}
async function submitCreate() {
    createAttempted.value = true;
    if (!createForm.value.title.trim())
        return;
    creating.value = true;
    try {
        const payload = {
            title: createForm.value.title.trim(),
            description: createForm.value.description.trim() || null,
            ticket_type: createForm.value.ticket_type,
            priority: createForm.value.priority,
            epic_id: createForm.value.epic_id,
            story_points: createForm.value.story_points,
        };
        await createTicket(projectId.value, payload);
        createVisible.value = false;
        await loadTickets();
    }
    finally {
        creating.value = false;
    }
}
async function submitBulkUpdate() {
    if (selectedTickets.value.length === 0)
        return;
    bulkSaving.value = true;
    try {
        const payload = {
            ticket_ids: selectedTickets.value.map(t => t.id),
        };
        if (bulkPriority.value)
            payload.priority = bulkPriority.value;
        if (bulkType.value)
            payload.ticket_type = bulkType.value;
        await bulkUpdateTickets(projectId.value, payload);
        bulkDialogVisible.value = false;
        selectedTickets.value = [];
        bulkPriority.value = null;
        bulkType.value = null;
        await loadTickets();
    }
    finally {
        bulkSaving.value = false;
    }
}
async function exportCsv() {
    exporting.value = true;
    try {
        await exportTicketsCsv(projectId.value);
    }
    finally {
        exporting.value = false;
    }
}
watch(() => projectId.value, async () => {
    searchInput.value = '';
    appliedSearch.value = '';
    filterTicketType.value = null;
    filterPriority.value = null;
    first.value = 0;
    await loadProject();
    if (project.value) {
        await Promise.all([loadEpics(), loadTickets(), loadMembers(), loadWorkflows()]);
    }
    else {
        tickets.value = [];
        total.value = 0;
        epics.value = [];
        members.value = [];
        workflows.value = [];
    }
});
watch([filterTicketType, filterPriority], () => {
    if (!project.value)
        return;
    first.value = 0;
    loadTickets();
});
let searchDebounce = null;
watch(searchInput, () => {
    if (searchDebounce)
        clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        appliedSearch.value = searchInput.value;
        first.value = 0;
        if (project.value)
            loadTickets();
    }, 350);
});
const ws = useWebSocket();
let refreshTimer = null;
function scheduleRefresh() {
    if (refreshTimer)
        clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
        loadTickets();
        refreshTimer = null;
    }, 500);
}
function onWsEvent(data) {
    const event = data.event;
    if (!event)
        return;
    if (event.startsWith('ticket.')) {
        scheduleRefresh();
    }
}
onMounted(async () => {
    await loadProject();
    if (project.value) {
        await Promise.all([loadEpics(), loadTickets(), loadMembers(), loadWorkflows(), loadSavedViews()]);
        ws.subscribe(`project:${projectId.value}`);
        ws.on('event', onWsEvent);
    }
});
onUnmounted(() => {
    ws.unsubscribe(`project:${projectId.value}`);
    ws.off('event', onWsEvent);
    if (refreshTimer)
        clearTimeout(refreshTimer);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inline-editable']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ticket-list-view" },
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
        ...{ class: "flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-3 flex-wrap" },
    });
    const __VLS_4 = {}.Tag;
    /** @type {[typeof __VLS_components.Tag, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        value: (__VLS_ctx.project.key),
        severity: "info",
        ...{ class: "text-lg font-semibold" },
    }));
    const __VLS_6 = __VLS_5({
        value: (__VLS_ctx.project.key),
        severity: "info",
        ...{ class: "text-lg font-semibold" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "m-0 text-2xl font-semibold" },
    });
    (__VLS_ctx.project.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-2" },
    });
    if (__VLS_ctx.selectedTickets.length > 0) {
        const __VLS_8 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('tickets.bulkEdit', { n: __VLS_ctx.selectedTickets.length })),
            icon: "pi pi-pencil",
            severity: "secondary",
            outlined: true,
            size: "small",
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('tickets.bulkEdit', { n: __VLS_ctx.selectedTickets.length })),
            icon: "pi pi-pencil",
            severity: "secondary",
            outlined: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_12;
        let __VLS_13;
        let __VLS_14;
        const __VLS_15 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loadingProject))
                    return;
                if (!(__VLS_ctx.project))
                    return;
                if (!(__VLS_ctx.selectedTickets.length > 0))
                    return;
                __VLS_ctx.bulkDialogVisible = true;
            }
        };
        var __VLS_11;
    }
    const __VLS_16 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('import.title')),
        icon: "pi pi-upload",
        severity: "secondary",
        outlined: true,
        size: "small",
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('import.title')),
        icon: "pi pi-upload",
        severity: "secondary",
        outlined: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.loadingProject))
                return;
            if (!(__VLS_ctx.project))
                return;
            __VLS_ctx.$router.push({ name: 'import-tickets', params: { projectId: __VLS_ctx.route.params.projectId } });
        }
    };
    var __VLS_19;
    const __VLS_24 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('tickets.exportCsv')),
        icon: "pi pi-download",
        severity: "secondary",
        outlined: true,
        size: "small",
        loading: (__VLS_ctx.exporting),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('tickets.exportCsv')),
        icon: "pi pi-download",
        severity: "secondary",
        outlined: true,
        size: "small",
        loading: (__VLS_ctx.exporting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_28;
    let __VLS_29;
    let __VLS_30;
    const __VLS_31 = {
        onClick: (__VLS_ctx.exportCsv)
    };
    var __VLS_27;
    const __VLS_32 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('tickets.createTicket')),
        icon: "pi pi-plus",
    }));
    const __VLS_34 = __VLS_33({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('tickets.createTicket')),
        icon: "pi pi-plus",
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    let __VLS_36;
    let __VLS_37;
    let __VLS_38;
    const __VLS_39 = {
        onClick: (__VLS_ctx.openCreateDialog)
    };
    var __VLS_35;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    if (__VLS_ctx.savedViews.length > 0 || __VLS_ctx.activeViewId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2 mb-3 flex-wrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-color-secondary text-xs font-semibold" },
            ...{ style: {} },
        });
        (__VLS_ctx.$t('tickets.views'));
        for (const [v] of __VLS_getVForSourceType((__VLS_ctx.savedViews))) {
            const __VLS_40 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                ...{ 'onClick': {} },
                key: (v.id),
                label: (v.name),
                size: "small",
                severity: (__VLS_ctx.activeViewId === v.id ? 'primary' : 'secondary'),
                outlined: (__VLS_ctx.activeViewId !== v.id),
            }));
            const __VLS_42 = __VLS_41({
                ...{ 'onClick': {} },
                key: (v.id),
                label: (v.name),
                size: "small",
                severity: (__VLS_ctx.activeViewId === v.id ? 'primary' : 'secondary'),
                outlined: (__VLS_ctx.activeViewId !== v.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            let __VLS_44;
            let __VLS_45;
            let __VLS_46;
            const __VLS_47 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.savedViews.length > 0 || __VLS_ctx.activeViewId))
                        return;
                    __VLS_ctx.applySavedView(v);
                }
            };
            var __VLS_43;
        }
        if (__VLS_ctx.activeViewId) {
            const __VLS_48 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                size: "small",
                severity: "secondary",
                text: true,
                rounded: true,
                title: (__VLS_ctx.$t('common.clear')),
            }));
            const __VLS_50 = __VLS_49({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                size: "small",
                severity: "secondary",
                text: true,
                rounded: true,
                title: (__VLS_ctx.$t('common.clear')),
            }, ...__VLS_functionalComponentArgsRest(__VLS_49));
            let __VLS_52;
            let __VLS_53;
            let __VLS_54;
            const __VLS_55 = {
                onClick: (__VLS_ctx.clearSavedView)
            };
            var __VLS_51;
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "ticket-search",
        ...{ class: "block text-color-secondary text-sm mb-2" },
    });
    (__VLS_ctx.$t('common.search'));
    const __VLS_56 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        ...{ 'onKeyup': {} },
        id: "ticket-search",
        modelValue: (__VLS_ctx.searchInput),
        ...{ class: "w-full" },
        placeholder: (__VLS_ctx.$t('tickets.searchPlaceholder')),
    }));
    const __VLS_58 = __VLS_57({
        ...{ 'onKeyup': {} },
        id: "ticket-search",
        modelValue: (__VLS_ctx.searchInput),
        ...{ class: "w-full" },
        placeholder: (__VLS_ctx.$t('tickets.searchPlaceholder')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    let __VLS_60;
    let __VLS_61;
    let __VLS_62;
    const __VLS_63 = {
        onKeyup: (__VLS_ctx.applyFilters)
    };
    var __VLS_59;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "filter-type",
        ...{ class: "block text-color-secondary text-sm mb-2" },
    });
    (__VLS_ctx.$t('tickets.type'));
    const __VLS_64 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        id: "filter-type",
        modelValue: (__VLS_ctx.filterTicketType),
        options: (__VLS_ctx.ticketTypeFilterOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.allTypes')),
        ...{ class: "w-full" },
        showClear: true,
    }));
    const __VLS_66 = __VLS_65({
        id: "filter-type",
        modelValue: (__VLS_ctx.filterTicketType),
        options: (__VLS_ctx.ticketTypeFilterOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.allTypes')),
        ...{ class: "w-full" },
        showClear: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "filter-priority",
        ...{ class: "block text-color-secondary text-sm mb-2" },
    });
    (__VLS_ctx.$t('tickets.priority'));
    const __VLS_68 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        id: "filter-priority",
        modelValue: (__VLS_ctx.filterPriority),
        options: (__VLS_ctx.priorityFilterOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.allPriorities')),
        ...{ class: "w-full" },
        showClear: true,
    }));
    const __VLS_70 = __VLS_69({
        id: "filter-priority",
        modelValue: (__VLS_ctx.filterPriority),
        options: (__VLS_ctx.priorityFilterOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('tickets.allPriorities')),
        ...{ class: "w-full" },
        showClear: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 md:col-2 flex align-items-end gap-2" },
    });
    const __VLS_72 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.clear')),
        icon: "pi pi-filter-slash",
        ...{ class: "w-full md:w-auto" },
        outlined: true,
        size: "small",
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.clear')),
        icon: "pi pi-filter-slash",
        ...{ class: "w-full md:w-auto" },
        outlined: true,
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (__VLS_ctx.clearFilters)
    };
    var __VLS_75;
    const __VLS_80 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        ...{ 'onClick': {} },
        icon: "pi pi-save",
        severity: "secondary",
        text: true,
        rounded: true,
        size: "small",
        title: (__VLS_ctx.$t('tickets.saveView')),
    }));
    const __VLS_82 = __VLS_81({
        ...{ 'onClick': {} },
        icon: "pi pi-save",
        severity: "secondary",
        text: true,
        rounded: true,
        size: "small",
        title: (__VLS_ctx.$t('tickets.saveView')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    let __VLS_84;
    let __VLS_85;
    let __VLS_86;
    const __VLS_87 = {
        onClick: (...[$event]) => {
            if (!!(__VLS_ctx.loadingProject))
                return;
            if (!(__VLS_ctx.project))
                return;
            __VLS_ctx.saveViewDialogVisible = true;
        }
    };
    var __VLS_83;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between flex-wrap gap-2 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-color-secondary text-sm" },
    });
    (__VLS_ctx.total === 0 ? __VLS_ctx.$t('tickets.noTickets') : __VLS_ctx.$t('tickets.showing', { from: __VLS_ctx.first + 1, to: Math.min(__VLS_ctx.first + __VLS_ctx.rows, __VLS_ctx.total), total: __VLS_ctx.total }));
    const __VLS_88 = {}.DataTable;
    /** @type {[typeof __VLS_components.DataTable, typeof __VLS_components.DataTable, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        ...{ 'onPage': {} },
        selection: (__VLS_ctx.selectedTickets),
        value: (__VLS_ctx.tickets),
        loading: (__VLS_ctx.loadingTickets),
        lazy: true,
        paginator: true,
        rows: (__VLS_ctx.rows),
        first: (__VLS_ctx.first),
        totalRecords: (__VLS_ctx.total),
        dataKey: "id",
        stripedRows: true,
        scrollable: true,
        scrollHeight: "65vh",
        ...{ class: "p-datatable-sm" },
        rowsPerPageOptions: ([25, 50, 100]),
    }));
    const __VLS_90 = __VLS_89({
        ...{ 'onPage': {} },
        selection: (__VLS_ctx.selectedTickets),
        value: (__VLS_ctx.tickets),
        loading: (__VLS_ctx.loadingTickets),
        lazy: true,
        paginator: true,
        rows: (__VLS_ctx.rows),
        first: (__VLS_ctx.first),
        totalRecords: (__VLS_ctx.total),
        dataKey: "id",
        stripedRows: true,
        scrollable: true,
        scrollHeight: "65vh",
        ...{ class: "p-datatable-sm" },
        rowsPerPageOptions: ([25, 50, 100]),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    let __VLS_92;
    let __VLS_93;
    let __VLS_94;
    const __VLS_95 = {
        onPage: (__VLS_ctx.onPage)
    };
    __VLS_91.slots.default;
    {
        const { loading: __VLS_thisSlot } = __VLS_91.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-center p-5" },
        });
        const __VLS_96 = {}.ProgressSpinner;
        /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
        // @ts-ignore
        const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
            ...{ style: {} },
            strokeWidth: "4",
        }));
        const __VLS_98 = __VLS_97({
            ...{ style: {} },
            strokeWidth: "4",
        }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    }
    const __VLS_100 = {}.Column;
    /** @type {[typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        selectionMode: "multiple",
        ...{ style: {} },
    }));
    const __VLS_102 = __VLS_101({
        selectionMode: "multiple",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    const __VLS_104 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        field: "ticket_key",
        header: (__VLS_ctx.$t('projects.key')),
        ...{ style: {} },
    }));
    const __VLS_106 = __VLS_105({
        field: "ticket_key",
        header: (__VLS_ctx.$t('projects.key')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    __VLS_107.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_107.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_108 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            ...{ 'onClick': {} },
            to: (`/tickets/${data.id}`),
            ...{ class: "font-mono text-sm text-primary no-underline hover:underline" },
        }));
        const __VLS_110 = __VLS_109({
            ...{ 'onClick': {} },
            to: (`/tickets/${data.id}`),
            ...{ class: "font-mono text-sm text-primary no-underline hover:underline" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        let __VLS_112;
        let __VLS_113;
        let __VLS_114;
        const __VLS_115 = {
            onClick: () => { }
        };
        __VLS_111.slots.default;
        (data.ticket_key ?? '—');
        var __VLS_111;
    }
    var __VLS_107;
    const __VLS_116 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        field: "title",
        header: (__VLS_ctx.$t('tickets.title')),
    }));
    const __VLS_118 = __VLS_117({
        field: "title",
        header: (__VLS_ctx.$t('tickets.title')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    __VLS_119.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_119.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'title') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: () => { } },
                ...{ class: "flex align-items-center gap-2" },
            });
            const __VLS_120 = {}.InputText;
            /** @type {[typeof __VLS_components.InputText, ]} */ ;
            // @ts-ignore
            const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
                ...{ 'onKeydown': {} },
                ...{ 'onKeydown': {} },
                ref: "inlineTitleRef",
                modelValue: (__VLS_ctx.editingCell.value),
                ...{ class: "w-full p-inputtext-sm" },
            }));
            const __VLS_122 = __VLS_121({
                ...{ 'onKeydown': {} },
                ...{ 'onKeydown': {} },
                ref: "inlineTitleRef",
                modelValue: (__VLS_ctx.editingCell.value),
                ...{ class: "w-full p-inputtext-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_121));
            let __VLS_124;
            let __VLS_125;
            let __VLS_126;
            const __VLS_127 = {
                onKeydown: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'title'))
                        return;
                    __VLS_ctx.commitInlineEdit(data);
                }
            };
            const __VLS_128 = {
                onKeydown: (__VLS_ctx.cancelInlineEdit)
            };
            /** @type {typeof __VLS_ctx.inlineTitleRef} */ ;
            var __VLS_129 = {};
            var __VLS_123;
            const __VLS_131 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
                ...{ 'onClick': {} },
                icon: "pi pi-check",
                size: "small",
                text: true,
                rounded: true,
            }));
            const __VLS_133 = __VLS_132({
                ...{ 'onClick': {} },
                icon: "pi pi-check",
                size: "small",
                text: true,
                rounded: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_132));
            let __VLS_135;
            let __VLS_136;
            let __VLS_137;
            const __VLS_138 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'title'))
                        return;
                    __VLS_ctx.commitInlineEdit(data);
                }
            };
            var __VLS_134;
            const __VLS_139 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                size: "small",
                text: true,
                rounded: true,
                severity: "secondary",
            }));
            const __VLS_141 = __VLS_140({
                ...{ 'onClick': {} },
                icon: "pi pi-times",
                size: "small",
                text: true,
                rounded: true,
                severity: "secondary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_140));
            let __VLS_143;
            let __VLS_144;
            let __VLS_145;
            const __VLS_146 = {
                onClick: (__VLS_ctx.cancelInlineEdit)
            };
            var __VLS_142;
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loadingProject))
                            return;
                        if (!(__VLS_ctx.project))
                            return;
                        if (!!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'title'))
                            return;
                        __VLS_ctx.startInlineEdit(data, 'title', data.title);
                    } },
                ...{ class: "inline-editable" },
            });
            (data.title);
        }
    }
    var __VLS_119;
    const __VLS_147 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
        field: "ticket_type",
        header: (__VLS_ctx.$t('tickets.type')),
        ...{ style: {} },
    }));
    const __VLS_149 = __VLS_148({
        field: "ticket_type",
        header: (__VLS_ctx.$t('tickets.type')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_148));
    __VLS_150.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_150.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'ticket_type') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: () => { } },
            });
            const __VLS_151 = {}.Select;
            /** @type {[typeof __VLS_components.Select, ]} */ ;
            // @ts-ignore
            const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.ticketTypeFormOptions),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full p-inputtext-sm" },
            }));
            const __VLS_153 = __VLS_152({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.ticketTypeFormOptions),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full p-inputtext-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_152));
            let __VLS_155;
            let __VLS_156;
            let __VLS_157;
            const __VLS_158 = {
                'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'ticket_type'))
                        return;
                    __VLS_ctx.commitInlineEdit(data);
                }
            };
            var __VLS_154;
        }
        else {
            const __VLS_159 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
                ...{ 'onClick': {} },
                value: (__VLS_ctx.formatLabel(data.ticket_type)),
                severity: "secondary",
                ...{ class: "cursor-pointer inline-editable-tag" },
            }));
            const __VLS_161 = __VLS_160({
                ...{ 'onClick': {} },
                value: (__VLS_ctx.formatLabel(data.ticket_type)),
                severity: "secondary",
                ...{ class: "cursor-pointer inline-editable-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_160));
            let __VLS_163;
            let __VLS_164;
            let __VLS_165;
            const __VLS_166 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'ticket_type'))
                        return;
                    __VLS_ctx.startInlineEdit(data, 'ticket_type', data.ticket_type);
                }
            };
            var __VLS_162;
        }
    }
    var __VLS_150;
    const __VLS_167 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
        field: "priority",
        header: (__VLS_ctx.$t('tickets.priority')),
        ...{ style: {} },
    }));
    const __VLS_169 = __VLS_168({
        field: "priority",
        header: (__VLS_ctx.$t('tickets.priority')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_168));
    __VLS_170.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_170.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'priority') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: () => { } },
            });
            const __VLS_171 = {}.Select;
            /** @type {[typeof __VLS_components.Select, ]} */ ;
            // @ts-ignore
            const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.priorityFormOptions),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full p-inputtext-sm" },
            }));
            const __VLS_173 = __VLS_172({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.priorityFormOptions),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full p-inputtext-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_172));
            let __VLS_175;
            let __VLS_176;
            let __VLS_177;
            const __VLS_178 = {
                'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'priority'))
                        return;
                    __VLS_ctx.commitInlineEdit(data);
                }
            };
            var __VLS_174;
        }
        else {
            const __VLS_179 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
                ...{ 'onClick': {} },
                value: (__VLS_ctx.formatLabel(data.priority)),
                severity: (__VLS_ctx.prioritySeverity(data.priority)),
                ...{ class: "cursor-pointer inline-editable-tag" },
            }));
            const __VLS_181 = __VLS_180({
                ...{ 'onClick': {} },
                value: (__VLS_ctx.formatLabel(data.priority)),
                severity: (__VLS_ctx.prioritySeverity(data.priority)),
                ...{ class: "cursor-pointer inline-editable-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_180));
            let __VLS_183;
            let __VLS_184;
            let __VLS_185;
            const __VLS_186 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'priority'))
                        return;
                    __VLS_ctx.startInlineEdit(data, 'priority', data.priority);
                }
            };
            var __VLS_182;
        }
    }
    var __VLS_170;
    const __VLS_187 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
        field: "assignee_id",
        header: (__VLS_ctx.$t('tickets.assignee')),
        ...{ style: {} },
    }));
    const __VLS_189 = __VLS_188({
        field: "assignee_id",
        header: (__VLS_ctx.$t('tickets.assignee')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_188));
    __VLS_190.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_190.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'assignee_id') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: () => { } },
            });
            const __VLS_191 = {}.Select;
            /** @type {[typeof __VLS_components.Select, ]} */ ;
            // @ts-ignore
            const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.assigneeOptions),
                optionLabel: "label",
                optionValue: "value",
                placeholder: (__VLS_ctx.$t('tickets.unassigned')),
                ...{ class: "w-full p-inputtext-sm" },
                showClear: true,
            }));
            const __VLS_193 = __VLS_192({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.assigneeOptions),
                optionLabel: "label",
                optionValue: "value",
                placeholder: (__VLS_ctx.$t('tickets.unassigned')),
                ...{ class: "w-full p-inputtext-sm" },
                showClear: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_192));
            let __VLS_195;
            let __VLS_196;
            let __VLS_197;
            const __VLS_198 = {
                'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'assignee_id'))
                        return;
                    __VLS_ctx.commitInlineEdit(data);
                }
            };
            var __VLS_194;
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loadingProject))
                            return;
                        if (!(__VLS_ctx.project))
                            return;
                        if (!!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'assignee_id'))
                            return;
                        __VLS_ctx.startInlineEdit(data, 'assignee_id', data.assignee_id);
                    } },
                ...{ class: "text-sm inline-editable" },
            });
            (__VLS_ctx.resolveAssigneeName(data.assignee_id));
        }
    }
    var __VLS_190;
    const __VLS_199 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
        field: "workflow_status_id",
        header: (__VLS_ctx.$t('common.status')),
        ...{ style: {} },
    }));
    const __VLS_201 = __VLS_200({
        field: "workflow_status_id",
        header: (__VLS_ctx.$t('common.status')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_200));
    __VLS_202.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_202.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        if (__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'workflow_status_id') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: () => { } },
            });
            const __VLS_203 = {}.Select;
            /** @type {[typeof __VLS_components.Select, ]} */ ;
            // @ts-ignore
            const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.statusTransitionOptions(data)),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full p-inputtext-sm" },
            }));
            const __VLS_205 = __VLS_204({
                ...{ 'onUpdate:modelValue': {} },
                modelValue: (__VLS_ctx.editingCell.value),
                options: (__VLS_ctx.statusTransitionOptions(data)),
                optionLabel: "label",
                optionValue: "value",
                ...{ class: "w-full p-inputtext-sm" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_204));
            let __VLS_207;
            let __VLS_208;
            let __VLS_209;
            const __VLS_210 = {
                'onUpdate:modelValue': (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'workflow_status_id'))
                        return;
                    __VLS_ctx.commitStatusTransition(data);
                }
            };
            var __VLS_206;
        }
        else {
            const __VLS_211 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
                ...{ 'onClick': {} },
                value: (__VLS_ctx.resolveStatusName(data.workflow_status_id)),
                ...{ style: (__VLS_ctx.resolveStatusStyle(data.workflow_status_id)) },
                ...{ class: "cursor-pointer inline-editable-tag" },
            }));
            const __VLS_213 = __VLS_212({
                ...{ 'onClick': {} },
                value: (__VLS_ctx.resolveStatusName(data.workflow_status_id)),
                ...{ style: (__VLS_ctx.resolveStatusStyle(data.workflow_status_id)) },
                ...{ class: "cursor-pointer inline-editable-tag" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_212));
            let __VLS_215;
            let __VLS_216;
            let __VLS_217;
            const __VLS_218 = {
                onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loadingProject))
                        return;
                    if (!(__VLS_ctx.project))
                        return;
                    if (!!(__VLS_ctx.editingCell?.id === data.id && __VLS_ctx.editingCell?.field === 'workflow_status_id'))
                        return;
                    __VLS_ctx.startInlineEdit(data, 'workflow_status_id', data.workflow_status_id);
                }
            };
            var __VLS_214;
        }
    }
    var __VLS_202;
    const __VLS_219 = {}.Column;
    /** @type {[typeof __VLS_components.Column, typeof __VLS_components.Column, ]} */ ;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
        field: "created_at",
        header: (__VLS_ctx.$t('common.created')),
        ...{ style: {} },
    }));
    const __VLS_221 = __VLS_220({
        field: "created_at",
        header: (__VLS_ctx.$t('common.created')),
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    __VLS_222.slots.default;
    {
        const { body: __VLS_thisSlot } = __VLS_222.slots;
        const [{ data }] = __VLS_getSlotParams(__VLS_thisSlot);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm" },
        });
        (__VLS_ctx.formatDate(data.created_at));
    }
    var __VLS_222;
    var __VLS_91;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-6 text-color-secondary" },
    });
    (__VLS_ctx.$t('tickets.projectNotFound'));
}
const __VLS_223 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
    ...{ 'onHide': {} },
    visible: (__VLS_ctx.createVisible),
    header: (__VLS_ctx.$t('tickets.createTicket')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
    dismissableMask: (true),
}));
const __VLS_225 = __VLS_224({
    ...{ 'onHide': {} },
    visible: (__VLS_ctx.createVisible),
    header: (__VLS_ctx.$t('tickets.createTicket')),
    modal: true,
    ...{ style: ({ width: '32rem', maxWidth: '95vw' }) },
    dismissableMask: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
let __VLS_227;
let __VLS_228;
let __VLS_229;
const __VLS_230 = {
    onHide: (__VLS_ctx.resetCreateForm)
};
__VLS_226.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3 pt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "create-title",
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-red-500" },
});
const __VLS_231 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
    id: "create-title",
    modelValue: (__VLS_ctx.createForm.title),
    ...{ class: "w-full" },
    invalid: (__VLS_ctx.createAttempted && !__VLS_ctx.createForm.title.trim()),
}));
const __VLS_233 = __VLS_232({
    id: "create-title",
    modelValue: (__VLS_ctx.createForm.title),
    ...{ class: "w-full" },
    invalid: (__VLS_ctx.createAttempted && !__VLS_ctx.createForm.title.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_232));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "create-desc",
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('common.description'));
const __VLS_235 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
    id: "create-desc",
    modelValue: (__VLS_ctx.createForm.description),
    ...{ class: "w-full" },
    rows: "4",
    autoResize: true,
}));
const __VLS_237 = __VLS_236({
    id: "create-desc",
    modelValue: (__VLS_ctx.createForm.description),
    ...{ class: "w-full" },
    rows: "4",
    autoResize: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_236));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "create-type",
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.type'));
const __VLS_239 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
    id: "create-type",
    modelValue: (__VLS_ctx.createForm.ticket_type),
    options: (__VLS_ctx.ticketTypeFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('tickets.selectType')),
}));
const __VLS_241 = __VLS_240({
    id: "create-type",
    modelValue: (__VLS_ctx.createForm.ticket_type),
    options: (__VLS_ctx.ticketTypeFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('tickets.selectType')),
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "create-priority",
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.priority'));
const __VLS_243 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
    id: "create-priority",
    modelValue: (__VLS_ctx.createForm.priority),
    options: (__VLS_ctx.priorityFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('tickets.selectPriority')),
}));
const __VLS_245 = __VLS_244({
    id: "create-priority",
    modelValue: (__VLS_ctx.createForm.priority),
    options: (__VLS_ctx.priorityFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('tickets.selectPriority')),
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "create-epic",
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.epic'));
const __VLS_247 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
    id: "create-epic",
    modelValue: (__VLS_ctx.createForm.epic_id),
    options: (__VLS_ctx.epicOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('tickets.noEpic')),
    showClear: true,
    loading: (__VLS_ctx.loadingEpics),
}));
const __VLS_249 = __VLS_248({
    id: "create-epic",
    modelValue: (__VLS_ctx.createForm.epic_id),
    options: (__VLS_ctx.epicOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    placeholder: (__VLS_ctx.$t('tickets.noEpic')),
    showClear: true,
    loading: (__VLS_ctx.loadingEpics),
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "create-points",
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.storyPoints'));
const __VLS_251 = {}.InputNumber;
/** @type {[typeof __VLS_components.InputNumber, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    id: "create-points",
    modelValue: (__VLS_ctx.createForm.story_points),
    ...{ class: "w-full" },
    min: (0),
    max: (999),
    showButtons: true,
}));
const __VLS_253 = __VLS_252({
    id: "create-points",
    modelValue: (__VLS_ctx.createForm.story_points),
    ...{ class: "w-full" },
    min: (0),
    max: (999),
    showButtons: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
{
    const { footer: __VLS_thisSlot } = __VLS_226.slots;
    const __VLS_255 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_257 = __VLS_256({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_256));
    let __VLS_259;
    let __VLS_260;
    let __VLS_261;
    const __VLS_262 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createVisible = false;
        }
    };
    var __VLS_258;
    const __VLS_263 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.creating),
        disabled: (!__VLS_ctx.createForm.title.trim()),
    }));
    const __VLS_265 = __VLS_264({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.creating),
        disabled: (!__VLS_ctx.createForm.title.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_264));
    let __VLS_267;
    let __VLS_268;
    let __VLS_269;
    const __VLS_270 = {
        onClick: (__VLS_ctx.submitCreate)
    };
    var __VLS_266;
}
var __VLS_226;
const __VLS_271 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
    visible: (__VLS_ctx.bulkDialogVisible),
    header: (__VLS_ctx.$t('tickets.bulkUpdate')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}));
const __VLS_273 = __VLS_272({
    visible: (__VLS_ctx.bulkDialogVisible),
    header: (__VLS_ctx.$t('tickets.bulkUpdate')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_272));
__VLS_274.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3 pt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.priority'));
const __VLS_275 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent(__VLS_275, new __VLS_275({
    modelValue: (__VLS_ctx.bulkPriority),
    options: (__VLS_ctx.priorityFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    showClear: true,
    placeholder: (__VLS_ctx.$t('tickets.keepCurrent')),
}));
const __VLS_277 = __VLS_276({
    modelValue: (__VLS_ctx.bulkPriority),
    options: (__VLS_ctx.priorityFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    showClear: true,
    placeholder: (__VLS_ctx.$t('tickets.keepCurrent')),
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.type'));
const __VLS_279 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
    modelValue: (__VLS_ctx.bulkType),
    options: (__VLS_ctx.ticketTypeFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    showClear: true,
    placeholder: (__VLS_ctx.$t('tickets.keepCurrent')),
}));
const __VLS_281 = __VLS_280({
    modelValue: (__VLS_ctx.bulkType),
    options: (__VLS_ctx.ticketTypeFormOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-full" },
    showClear: true,
    placeholder: (__VLS_ctx.$t('tickets.keepCurrent')),
}, ...__VLS_functionalComponentArgsRest(__VLS_280));
{
    const { footer: __VLS_thisSlot } = __VLS_274.slots;
    const __VLS_283 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        outlined: true,
    }));
    const __VLS_285 = __VLS_284({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        outlined: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_284));
    let __VLS_287;
    let __VLS_288;
    let __VLS_289;
    const __VLS_290 = {
        onClick: (...[$event]) => {
            __VLS_ctx.bulkDialogVisible = false;
        }
    };
    var __VLS_286;
    const __VLS_291 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.apply')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.bulkSaving),
        disabled: (!__VLS_ctx.bulkPriority && !__VLS_ctx.bulkType),
    }));
    const __VLS_293 = __VLS_292({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.apply')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.bulkSaving),
        disabled: (!__VLS_ctx.bulkPriority && !__VLS_ctx.bulkType),
    }, ...__VLS_functionalComponentArgsRest(__VLS_292));
    let __VLS_295;
    let __VLS_296;
    let __VLS_297;
    const __VLS_298 = {
        onClick: (__VLS_ctx.submitBulkUpdate)
    };
    var __VLS_294;
}
var __VLS_274;
const __VLS_299 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_300 = __VLS_asFunctionalComponent(__VLS_299, new __VLS_299({
    visible: (__VLS_ctx.saveViewDialogVisible),
    header: (__VLS_ctx.$t('tickets.saveView')),
    modal: true,
    ...{ style: ({ width: '24rem', maxWidth: '95vw' }) },
}));
const __VLS_301 = __VLS_300({
    visible: (__VLS_ctx.saveViewDialogVisible),
    header: (__VLS_ctx.$t('tickets.saveView')),
    modal: true,
    ...{ style: ({ width: '24rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_300));
__VLS_302.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3 pt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm mb-2" },
});
(__VLS_ctx.$t('tickets.viewName'));
const __VLS_303 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
    modelValue: (__VLS_ctx.saveViewName),
    ...{ class: "w-full" },
    autofocus: true,
}));
const __VLS_305 = __VLS_304({
    modelValue: (__VLS_ctx.saveViewName),
    ...{ class: "w-full" },
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_304));
{
    const { footer: __VLS_thisSlot } = __VLS_302.slots;
    const __VLS_307 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_309 = __VLS_308({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_308));
    let __VLS_311;
    let __VLS_312;
    let __VLS_313;
    const __VLS_314 = {
        onClick: (...[$event]) => {
            __VLS_ctx.saveViewDialogVisible = false;
        }
    };
    var __VLS_310;
    const __VLS_315 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.save')),
        icon: "pi pi-check",
        disabled: (!__VLS_ctx.saveViewName.trim()),
    }));
    const __VLS_317 = __VLS_316({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.save')),
        icon: "pi pi-check",
        disabled: (!__VLS_ctx.saveViewName.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_316));
    let __VLS_319;
    let __VLS_320;
    let __VLS_321;
    const __VLS_322 = {
        onClick: (__VLS_ctx.doSaveView)
    };
    var __VLS_318;
}
var __VLS_302;
/** @type {__VLS_StyleScopedClasses['ticket-list-view']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['md:align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['md:justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-4']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['md:col-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['md:w-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['p-datatable-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-5']} */ ;
/** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['no-underline']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editable-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
// @ts-ignore
var __VLS_130 = __VLS_129;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataTable: DataTable,
            Column: Column,
            Tag: Tag,
            Button: Button,
            InputText: InputText,
            Select: Select,
            Dialog: Dialog,
            InputNumber: InputNumber,
            Textarea: Textarea,
            ProgressSpinner: ProgressSpinner,
            route: route,
            project: project,
            loadingProject: loadingProject,
            tickets: tickets,
            total: total,
            first: first,
            rows: rows,
            loadingTickets: loadingTickets,
            searchInput: searchInput,
            filterTicketType: filterTicketType,
            filterPriority: filterPriority,
            loadingEpics: loadingEpics,
            createVisible: createVisible,
            creating: creating,
            createAttempted: createAttempted,
            createForm: createForm,
            selectedTickets: selectedTickets,
            bulkDialogVisible: bulkDialogVisible,
            bulkPriority: bulkPriority,
            bulkType: bulkType,
            bulkSaving: bulkSaving,
            exporting: exporting,
            savedViews: savedViews,
            activeViewId: activeViewId,
            saveViewDialogVisible: saveViewDialogVisible,
            saveViewName: saveViewName,
            applySavedView: applySavedView,
            clearSavedView: clearSavedView,
            doSaveView: doSaveView,
            editingCell: editingCell,
            inlineTitleRef: inlineTitleRef,
            ticketTypeFilterOptions: ticketTypeFilterOptions,
            priorityFilterOptions: priorityFilterOptions,
            ticketTypeFormOptions: ticketTypeFormOptions,
            priorityFormOptions: priorityFormOptions,
            epicOptions: epicOptions,
            assigneeOptions: assigneeOptions,
            resolveAssigneeName: resolveAssigneeName,
            resolveStatusName: resolveStatusName,
            resolveStatusStyle: resolveStatusStyle,
            formatLabel: formatLabel,
            prioritySeverity: prioritySeverity,
            formatDate: formatDate,
            startInlineEdit: startInlineEdit,
            cancelInlineEdit: cancelInlineEdit,
            commitInlineEdit: commitInlineEdit,
            commitStatusTransition: commitStatusTransition,
            statusTransitionOptions: statusTransitionOptions,
            onPage: onPage,
            applyFilters: applyFilters,
            clearFilters: clearFilters,
            openCreateDialog: openCreateDialog,
            resetCreateForm: resetCreateForm,
            submitCreate: submitCreate,
            submitBulkUpdate: submitBulkUpdate,
            exportCsv: exportCsv,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
