import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import Select from 'primevue/select';
import { useToastService } from '@/composables/useToast';
import { useWebSocket } from '@/composables/useWebSocket';
import { listBoards, createDefaultBoard, getBoardTickets, moveTicket, } from '@/api/boards';
import { getProject, listProjectMembers } from '@/api/projects';
import { listWorkflows } from '@/api/workflows';
import { listSprints } from '@/api/sprints';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToastService();
const ws = useWebSocket();
const projectId = route.params.projectId;
const STORAGE_KEY = `board_filters_${projectId}`;
const project = ref(null);
const board = ref(null);
const workflow = ref(null);
const ticketsByStatus = ref({});
const loading = ref(false);
const draggingTicket = ref(null);
const dragOverColumn = ref(null);
const sprints = ref([]);
const selectedSprintId = ref(null);
const members = ref([]);
const selectedAssigneeIds = ref(new Set());
const swimlaneMode = ref('none');
const swimlaneOptions = computed(() => [
    { label: t('boards.noSwimlanes'), value: 'none' },
    { label: t('boards.byAssignee'), value: 'assignee' },
    { label: t('boards.byPriority'), value: 'priority' },
    { label: t('boards.byType'), value: 'type' },
]);
const sprintOptions = computed(() => [
    { label: t('boards.allTickets'), value: null },
    ...sprints.value.map(s => ({ label: `${s.name} (${s.status})`, value: s.id })),
]);
function saveFilters() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            sprintId: selectedSprintId.value,
            swimlane: swimlaneMode.value,
        }));
    }
    catch { /* ignore */ }
}
function loadFilters() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data.sprintId)
                selectedSprintId.value = data.sprintId;
            if (data.swimlane)
                swimlaneMode.value = data.swimlane;
        }
    }
    catch { /* ignore */ }
}
const memberMap = computed(() => {
    const map = new Map();
    for (const m of members.value) {
        map.set(m.user_id, m);
    }
    return map;
});
function memberName(userId) {
    return memberMap.value.get(userId)?.display_name || memberMap.value.get(userId)?.email || userId.slice(0, 8) + '…';
}
function memberInitials(userId) {
    const m = memberMap.value.get(userId);
    const name = m?.display_name || m?.email || '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
        return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}
const allBoardTickets = computed(() => {
    return Object.values(ticketsByStatus.value).flat();
});
const assigneesOnBoard = computed(() => {
    const ids = new Set();
    for (const tk of allBoardTickets.value) {
        if (tk.assignee_id)
            ids.add(tk.assignee_id);
    }
    return Array.from(ids).map(id => ({
        id,
        name: memberName(id),
        initials: memberInitials(id),
        avatar_url: memberMap.value.get(id)?.avatar_url ?? null,
        count: allBoardTickets.value.filter(tk => tk.assignee_id === id).length,
    })).sort((a, b) => a.name.localeCompare(b.name));
});
function toggleAssigneeFilter(userId) {
    const next = new Set(selectedAssigneeIds.value);
    if (next.has(userId)) {
        next.delete(userId);
    }
    else {
        next.add(userId);
    }
    selectedAssigneeIds.value = next;
}
function clearAssigneeFilter() {
    selectedAssigneeIds.value = new Set();
}
const filteredTicketsByStatus = computed(() => {
    if (selectedAssigneeIds.value.size === 0)
        return ticketsByStatus.value;
    const result = {};
    for (const [statusId, tickets] of Object.entries(ticketsByStatus.value)) {
        result[statusId] = tickets.filter(tk => tk.assignee_id && selectedAssigneeIds.value.has(tk.assignee_id));
    }
    return result;
});
const columns = computed(() => {
    if (!board.value || !workflow.value)
        return [];
    return board.value.columns.map((col) => {
        const wfStatus = workflow.value.statuses.find((s) => s.id === col.workflow_status_id);
        return {
            ...col,
            name: wfStatus?.name ?? 'Unknown',
            color: wfStatus?.color ?? undefined,
            tickets: filteredTicketsByStatus.value[col.workflow_status_id] ?? [],
        };
    });
});
const swimlanes = computed(() => {
    if (swimlaneMode.value === 'none') {
        return [{ key: '_all', label: '', columns: columns.value }];
    }
    const allTickets = columns.value.flatMap(c => c.tickets);
    let groupFn;
    let labelFn;
    switch (swimlaneMode.value) {
        case 'assignee':
            groupFn = (tk) => tk.assignee_id || '_unassigned';
            labelFn = (k) => k === '_unassigned' ? t('tickets.unassigned') : memberName(k);
            break;
        case 'priority':
            groupFn = (t) => t.priority;
            labelFn = (k) => k.charAt(0).toUpperCase() + k.slice(1);
            break;
        case 'type':
            groupFn = (t) => t.ticket_type;
            labelFn = (k) => k.charAt(0).toUpperCase() + k.slice(1);
            break;
        default:
            return [{ key: '_all', label: '', columns: columns.value }];
    }
    const groups = new Map();
    for (const tk of allTickets) {
        const key = groupFn(tk);
        if (!groups.has(key))
            groups.set(key, new Set());
        groups.get(key).add(tk.id);
    }
    return Array.from(groups.entries()).map(([key, ticketIds]) => ({
        key,
        label: labelFn(key),
        columns: columns.value.map(col => ({
            ...col,
            tickets: col.tickets.filter(t => ticketIds.has(t.id)),
        })),
    }));
});
async function loadBoard() {
    loading.value = true;
    try {
        const proj = await getProject(projectId);
        project.value = proj;
        let boards = await listBoards(projectId);
        let b = boards.find((b) => b.is_default) ?? boards[0];
        if (!b && proj.default_workflow_id) {
            b = await createDefaultBoard(projectId, proj.default_workflow_id);
            toast.showSuccess(t('common.success'), t('boards.created'));
        }
        if (!b) {
            loading.value = false;
            return;
        }
        board.value = b;
        const wfRes = await listWorkflows(proj.organization_id, 0, 100);
        const wf = wfRes.items.find((w) => w.statuses.some((s) => b.columns.some((c) => c.workflow_status_id === s.id)));
        workflow.value = wf ?? null;
        const [sprintRes, memberRes] = await Promise.all([
            listSprints(projectId, { limit: 50 }),
            listProjectMembers(projectId, 0, 200),
        ]);
        sprints.value = sprintRes.items ?? [];
        members.value = memberRes.items ?? [];
        await refreshTickets();
    }
    finally {
        loading.value = false;
    }
}
async function refreshTickets() {
    if (!board.value)
        return;
    const tickets = await getBoardTickets(board.value.id, selectedSprintId.value || undefined);
    ticketsByStatus.value = tickets;
}
watch(selectedSprintId, () => {
    saveFilters();
    void refreshTickets();
});
watch(swimlaneMode, () => {
    saveFilters();
});
function onDragStart(ticket, event) {
    draggingTicket.value = ticket;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', ticket.id);
    }
}
function onDragOver(statusId, event) {
    event.preventDefault();
    dragOverColumn.value = statusId;
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
}
function onDragLeave() {
    dragOverColumn.value = null;
}
async function onDrop(statusId, event) {
    event.preventDefault();
    dragOverColumn.value = null;
    if (!draggingTicket.value)
        return;
    const ticket = draggingTicket.value;
    draggingTicket.value = null;
    const currentCol = columns.value.find((c) => c.tickets.some((t) => t.id === ticket.id));
    if (currentCol?.workflow_status_id === statusId)
        return;
    try {
        await moveTicket(ticket.id, statusId);
        await refreshTickets();
    }
    catch { /* global interceptor */ }
}
function goToTicket(ticketId) {
    router.push(`/tickets/${ticketId}`);
}
function priorityClass(p) {
    if (p === 'highest' || p === 'high')
        return 'text-red-500';
    if (p === 'low' || p === 'lowest')
        return 'text-color-secondary';
    return 'text-orange-500';
}
function priorityIcon(p) {
    if (p === 'highest')
        return 'pi pi-angle-double-up';
    if (p === 'high')
        return 'pi pi-angle-up';
    if (p === 'low')
        return 'pi pi-angle-down';
    if (p === 'lowest')
        return 'pi pi-angle-double-down';
    return 'pi pi-minus';
}
let refreshTimer = null;
function scheduleRefresh() {
    if (refreshTimer)
        return;
    refreshTimer = setTimeout(async () => {
        refreshTimer = null;
        await refreshTickets();
    }, 300);
}
function onWsEvent(data) {
    const event = data.event;
    if (!event)
        return;
    if (event.startsWith('ticket.') ||
        event.startsWith('sprint.') ||
        event === 'comment.added') {
        scheduleRefresh();
    }
}
onMounted(() => {
    loadFilters();
    loadBoard();
    ws.subscribe(`project:${projectId}`);
    ws.on('event', onWsEvent);
});
onUnmounted(() => {
    ws.unsubscribe(`project:${projectId}`);
    ws.off('event', onWsEvent);
    if (refreshTimer)
        clearTimeout(refreshTimer);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['assignee-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['swimlane-group']} */ ;
/** @type {__VLS_StyleScopedClasses['board-column']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-3 flex-wrap gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0" },
});
(__VLS_ctx.$t('boards.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center gap-2 flex-wrap" },
});
if (__VLS_ctx.sprints.length > 0) {
    const __VLS_0 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        modelValue: (__VLS_ctx.selectedSprintId),
        options: (__VLS_ctx.sprintOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('boards.filterBySprint')),
        ...{ class: "w-12rem" },
    }));
    const __VLS_2 = __VLS_1({
        modelValue: (__VLS_ctx.selectedSprintId),
        options: (__VLS_ctx.sprintOptions),
        optionLabel: "label",
        optionValue: "value",
        placeholder: (__VLS_ctx.$t('boards.filterBySprint')),
        ...{ class: "w-12rem" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
const __VLS_4 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    modelValue: (__VLS_ctx.swimlaneMode),
    options: (__VLS_ctx.swimlaneOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-10rem" },
}));
const __VLS_6 = __VLS_5({
    modelValue: (__VLS_ctx.swimlaneMode),
    options: (__VLS_ctx.swimlaneOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-10rem" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
const __VLS_8 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    severity: "secondary",
    text: true,
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    severity: "secondary",
    text: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.loadBoard)
};
var __VLS_11;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner text-4xl text-color-secondary" },
    });
}
else if (!__VLS_ctx.board) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-color-secondary p-6" },
    });
    (__VLS_ctx.$t('boards.empty'));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "board-container" },
    });
    if (__VLS_ctx.assigneesOnBoard.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "assignee-filter-bar mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs font-semibold text-color-secondary mr-2" },
        });
        (__VLS_ctx.$t('tickets.assignee'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2 flex-wrap" },
        });
        for (const [a] of __VLS_getVForSourceType((__VLS_ctx.assigneesOnBoard))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.board))
                            return;
                        if (!(__VLS_ctx.assigneesOnBoard.length > 0))
                            return;
                        __VLS_ctx.toggleAssigneeFilter(a.id);
                    } },
                key: (a.id),
                ...{ class: "assignee-chip" },
                ...{ class: ({ 'assignee-chip--active': __VLS_ctx.selectedAssigneeIds.has(a.id) }) },
            });
            if (a.avatar_url) {
                const __VLS_16 = {}.Avatar;
                /** @type {[typeof __VLS_components.Avatar, ]} */ ;
                // @ts-ignore
                const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                    image: (a.avatar_url),
                    shape: "circle",
                    ...{ class: "flex-shrink-0" },
                    ...{ style: {} },
                }));
                const __VLS_18 = __VLS_17({
                    image: (a.avatar_url),
                    shape: "circle",
                    ...{ class: "flex-shrink-0" },
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_17));
            }
            else {
                const __VLS_20 = {}.Avatar;
                /** @type {[typeof __VLS_components.Avatar, ]} */ ;
                // @ts-ignore
                const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                    label: (a.initials),
                    shape: "circle",
                    ...{ class: "flex-shrink-0 bg-primary-100 text-primary-700" },
                    ...{ style: {} },
                }));
                const __VLS_22 = __VLS_21({
                    label: (a.initials),
                    shape: "circle",
                    ...{ class: "flex-shrink-0 bg-primary-100 text-primary-700" },
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_21));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "text-xs font-medium" },
            });
            (a.name);
            const __VLS_24 = {}.Tag;
            /** @type {[typeof __VLS_components.Tag, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                value: (String(a.count)),
                severity: "secondary",
                rounded: true,
                ...{ class: "text-xs ml-1" },
            }));
            const __VLS_26 = __VLS_25({
                value: (String(a.count)),
                severity: "secondary",
                rounded: true,
                ...{ class: "text-xs ml-1" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        }
        if (__VLS_ctx.selectedAssigneeIds.size > 0) {
            const __VLS_28 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
                ...{ 'onClick': {} },
                icon: "pi pi-filter-slash",
                severity: "secondary",
                text: true,
                rounded: true,
                size: "small",
                'aria-label': (__VLS_ctx.$t('common.clear')),
            }));
            const __VLS_30 = __VLS_29({
                ...{ 'onClick': {} },
                icon: "pi pi-filter-slash",
                severity: "secondary",
                text: true,
                rounded: true,
                size: "small",
                'aria-label': (__VLS_ctx.$t('common.clear')),
            }, ...__VLS_functionalComponentArgsRest(__VLS_29));
            let __VLS_32;
            let __VLS_33;
            let __VLS_34;
            const __VLS_35 = {
                onClick: (__VLS_ctx.clearAssigneeFilter)
            };
            var __VLS_31;
        }
    }
    for (const [lane] of __VLS_getVForSourceType((__VLS_ctx.swimlanes))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (lane.key),
            ...{ class: "swimlane-group" },
        });
        if (lane.label) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "swimlane-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-2" },
            });
            if (__VLS_ctx.swimlaneMode === 'assignee' && lane.key !== '_unassigned') {
                if (__VLS_ctx.memberMap.get(lane.key)?.avatar_url) {
                    const __VLS_36 = {}.Avatar;
                    /** @type {[typeof __VLS_components.Avatar, ]} */ ;
                    // @ts-ignore
                    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                        image: (__VLS_ctx.memberMap.get(lane.key).avatar_url),
                        shape: "circle",
                        ...{ class: "flex-shrink-0" },
                        ...{ style: {} },
                    }));
                    const __VLS_38 = __VLS_37({
                        image: (__VLS_ctx.memberMap.get(lane.key).avatar_url),
                        shape: "circle",
                        ...{ class: "flex-shrink-0" },
                        ...{ style: {} },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
                }
                else {
                    const __VLS_40 = {}.Avatar;
                    /** @type {[typeof __VLS_components.Avatar, ]} */ ;
                    // @ts-ignore
                    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                        label: (__VLS_ctx.memberInitials(lane.key)),
                        shape: "circle",
                        ...{ class: "flex-shrink-0 bg-primary-100 text-primary-700" },
                        ...{ style: {} },
                    }));
                    const __VLS_42 = __VLS_41({
                        label: (__VLS_ctx.memberInitials(lane.key)),
                        shape: "circle",
                        ...{ class: "flex-shrink-0 bg-primary-100 text-primary-700" },
                        ...{ style: {} },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
                }
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-sm text-color-secondary" },
            });
            (lane.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "board-columns" },
        });
        for (const [col] of __VLS_getVForSourceType((lane.columns))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onDragover: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.board))
                            return;
                        __VLS_ctx.onDragOver(col.workflow_status_id, $event);
                    } },
                ...{ onDragleave: (__VLS_ctx.onDragLeave) },
                ...{ onDrop: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.board))
                            return;
                        __VLS_ctx.onDrop(col.workflow_status_id, $event);
                    } },
                key: (col.id),
                ...{ class: "board-column" },
                ...{ class: ({ 'drag-over': __VLS_ctx.dragOverColumn === col.workflow_status_id }) },
            });
            if (lane.key === __VLS_ctx.swimlanes[0]?.key) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "column-header" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex align-items-center gap-2" },
                });
                if (col.color) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                        ...{ class: "status-dot" },
                        ...{ style: ({ background: col.color }) },
                    });
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "font-semibold text-sm" },
                });
                (col.name);
                const __VLS_44 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                    value: (String(col.tickets.length)),
                    severity: "secondary",
                    rounded: true,
                    ...{ class: "text-xs" },
                }));
                const __VLS_46 = __VLS_45({
                    value: (String(col.tickets.length)),
                    severity: "secondary",
                    rounded: true,
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_45));
                if (col.wip_limit) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "text-xs text-color-secondary" },
                    });
                    (__VLS_ctx.$t('boards.wipLimit'));
                    (col.wip_limit);
                }
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "column-body" },
            });
            for (const [ticket] of __VLS_getVForSourceType((col.tickets))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onDragstart: (...[$event]) => {
                            if (!!(__VLS_ctx.loading))
                                return;
                            if (!!(!__VLS_ctx.board))
                                return;
                            __VLS_ctx.onDragStart(ticket, $event);
                        } },
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.loading))
                                return;
                            if (!!(!__VLS_ctx.board))
                                return;
                            __VLS_ctx.goToTicket(ticket.id);
                        } },
                    key: (ticket.id),
                    ...{ class: "ticket-card surface-card border-round shadow-1 p-3 mb-2 cursor-pointer" },
                    draggable: "true",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex align-items-center gap-2 mb-1" },
                });
                const __VLS_48 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                    value: (ticket.ticket_key),
                    severity: "info",
                    ...{ class: "text-xs" },
                }));
                const __VLS_50 = __VLS_49({
                    value: (ticket.ticket_key),
                    severity: "info",
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                    ...{ class: ([__VLS_ctx.priorityIcon(ticket.priority), __VLS_ctx.priorityClass(ticket.priority)]) },
                    ...{ style: {} },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-sm font-medium mb-2 ticket-card-title" },
                });
                (ticket.title);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex align-items-center justify-content-between" },
                });
                const __VLS_52 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                    value: (ticket.ticket_type),
                    severity: "secondary",
                    ...{ class: "text-xs" },
                }));
                const __VLS_54 = __VLS_53({
                    value: (ticket.ticket_type),
                    severity: "secondary",
                    ...{ class: "text-xs" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_53));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "flex align-items-center gap-2" },
                });
                if (ticket.story_points != null) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "text-xs text-color-secondary bg-surface-100 px-2 py-1 border-round" },
                    });
                    (ticket.story_points);
                }
                if (ticket.assignee_id) {
                    const __VLS_56 = {}.Avatar;
                    /** @type {[typeof __VLS_components.Avatar, ]} */ ;
                    // @ts-ignore
                    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                        icon: "pi pi-user",
                        shape: "circle",
                        ...{ class: "bg-primary-100 text-primary-700" },
                        ...{ style: {} },
                    }));
                    const __VLS_58 = __VLS_57({
                        icon: "pi pi-user",
                        shape: "circle",
                        ...{ class: "bg-primary-100 text-primary-700" },
                        ...{ style: {} },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
                }
            }
            if (col.tickets.length === 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "text-center text-color-secondary text-xs p-3" },
                });
                (__VLS_ctx.$t('boards.dropHere'));
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12rem']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10rem']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['board-container']} */ ;
/** @type {__VLS_StyleScopedClasses['assignee-filter-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['assignee-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
/** @type {__VLS_StyleScopedClasses['swimlane-group']} */ ;
/** @type {__VLS_StyleScopedClasses['swimlane-header']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['board-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['board-column']} */ ;
/** @type {__VLS_StyleScopedClasses['column-header']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['status-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['column-body']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-card']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-surface-100']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-1']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Tag: Tag,
            Avatar: Avatar,
            Select: Select,
            board: board,
            loading: loading,
            dragOverColumn: dragOverColumn,
            sprints: sprints,
            selectedSprintId: selectedSprintId,
            selectedAssigneeIds: selectedAssigneeIds,
            swimlaneMode: swimlaneMode,
            swimlaneOptions: swimlaneOptions,
            sprintOptions: sprintOptions,
            memberMap: memberMap,
            memberInitials: memberInitials,
            assigneesOnBoard: assigneesOnBoard,
            toggleAssigneeFilter: toggleAssigneeFilter,
            clearAssigneeFilter: clearAssigneeFilter,
            swimlanes: swimlanes,
            loadBoard: loadBoard,
            onDragStart: onDragStart,
            onDragOver: onDragOver,
            onDragLeave: onDragLeave,
            onDrop: onDrop,
            goToTicket: goToTicket,
            priorityClass: priorityClass,
            priorityIcon: priorityIcon,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
