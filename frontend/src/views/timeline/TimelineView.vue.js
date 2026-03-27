import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { getTimeline } from '@/api/timeline';
const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId;
const data = ref(null);
const loading = ref(false);
const zoomLevel = ref('week');
const zoomOptions = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
];
function parseDate(s) {
    return new Date(s + 'T00:00:00');
}
const allItems = computed(() => {
    if (!data.value)
        return [];
    const items = [];
    for (const e of data.value.epics) {
        items.push({
            id: e.id,
            label: e.title,
            start: e.start_date ? parseDate(e.start_date) : null,
            end: e.due_date ? parseDate(e.due_date) : null,
            type: 'epic',
            statusColor: '#3B82F6',
            statusCategory: 'epic',
            priority: '',
            epicId: null,
        });
    }
    for (const t of data.value.tickets) {
        items.push({
            id: t.id,
            label: `${t.ticket_key} ${t.title}`,
            start: t.start_date ? parseDate(t.start_date) : null,
            end: t.due_date ? parseDate(t.due_date) : null,
            type: 'ticket',
            statusColor: t.status_color,
            statusCategory: t.status_category,
            priority: t.priority,
            epicId: t.epic_id,
        });
    }
    return items;
});
const timeRange = computed(() => {
    const starts = [];
    const ends = [];
    for (const item of allItems.value) {
        if (item.start)
            starts.push(item.start);
        if (item.end)
            ends.push(item.end);
    }
    if (starts.length === 0) {
        const now = new Date();
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 2, 0) };
    }
    const minStart = new Date(Math.min(...starts.map(d => d.getTime())));
    const maxEnd = new Date(Math.max(...ends.map(d => d.getTime())));
    minStart.setDate(minStart.getDate() - 7);
    maxEnd.setDate(maxEnd.getDate() + 7);
    return { start: minStart, end: maxEnd };
});
const totalDays = computed(() => {
    const { start, end } = timeRange.value;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
});
const columnWidth = computed(() => {
    return zoomLevel.value === 'day' ? 40 : zoomLevel.value === 'week' ? 20 : 6;
});
const headerDates = computed(() => {
    const dates = [];
    const { start, end } = timeRange.value;
    const current = new Date(start);
    if (zoomLevel.value === 'month') {
        while (current <= end) {
            const label = current.toLocaleDateString('en', { month: 'short', year: '2-digit' });
            const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            dates.push({ label, width: daysInMonth * columnWidth.value });
            current.setMonth(current.getMonth() + 1);
        }
    }
    else if (zoomLevel.value === 'week') {
        while (current <= end) {
            const label = current.toLocaleDateString('en', { month: 'short', day: 'numeric' });
            dates.push({ label, width: 7 * columnWidth.value });
            current.setDate(current.getDate() + 7);
        }
    }
    else {
        while (current <= end) {
            const label = current.toLocaleDateString('en', { weekday: 'narrow', day: 'numeric' });
            dates.push({ label, width: columnWidth.value });
            current.setDate(current.getDate() + 1);
        }
    }
    return dates;
});
const chartWidth = computed(() => totalDays.value * columnWidth.value);
function getBarStyle(item) {
    if (!item.start && !item.end)
        return null;
    const rangeStart = timeRange.value.start.getTime();
    const itemStart = item.start ?? item.end;
    const itemEnd = item.end ?? item.start;
    const leftDays = (itemStart.getTime() - rangeStart) / (1000 * 60 * 60 * 24);
    const duration = Math.max(1, (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24));
    let bg = item.statusColor || 'var(--p-primary-color)';
    if (item.type === 'epic')
        bg = '#3B82F6';
    else if (item.statusCategory === 'done')
        bg = 'var(--p-green-500)';
    else if (item.statusCategory === 'in_progress')
        bg = 'var(--p-blue-500)';
    else
        bg = 'var(--p-surface-300)';
    return {
        left: leftDays * columnWidth.value + 'px',
        width: duration * columnWidth.value + 'px',
        background: bg,
    };
}
const todayOffset = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = (today.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
    return days * columnWidth.value;
});
function onClickItem(item) {
    if (item.type === 'ticket') {
        router.push(`/tickets/${item.id}`);
    }
}
async function loadTimeline() {
    loading.value = true;
    try {
        data.value = await getTimeline(projectId);
    }
    finally {
        loading.value = false;
    }
}
onMounted(loadTimeline);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0" },
});
(__VLS_ctx.$t('timeline.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2 align-items-center" },
});
const __VLS_0 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.zoomLevel),
    options: (__VLS_ctx.zoomOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-8rem" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.zoomLevel),
    options: (__VLS_ctx.zoomOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "w-8rem" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    text: true,
    rounded: true,
    loading: (__VLS_ctx.loading),
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    text: true,
    rounded: true,
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (__VLS_ctx.loadTimeline)
};
var __VLS_7;
if (__VLS_ctx.loading && !__VLS_ctx.data) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner text-3xl text-color-secondary" },
    });
}
else if (__VLS_ctx.data) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-container surface-card border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-header" },
        ...{ style: ({ width: (240 + __VLS_ctx.chartWidth) + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-label-col" },
    });
    (__VLS_ctx.$t('timeline.item'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-timeline-header" },
    });
    for (const [d, i] of __VLS_getVForSourceType((__VLS_ctx.headerDates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: "gantt-header-cell" },
            ...{ style: ({ width: d.width + 'px' }) },
        });
        (d.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-body" },
        ...{ style: ({ width: (240 + __VLS_ctx.chartWidth) + 'px' }) },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.allItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading && !__VLS_ctx.data))
                        return;
                    if (!(__VLS_ctx.data))
                        return;
                    __VLS_ctx.onClickItem(item);
                } },
            key: (item.id),
            ...{ class: "gantt-row" },
            ...{ class: ({ epic: item.type === 'epic' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-label-col" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "gantt-item-label" },
            ...{ class: ({ 'font-bold': item.type === 'epic' }) },
        });
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-chart-area" },
            ...{ style: ({ width: __VLS_ctx.chartWidth + 'px' }) },
        });
        if (__VLS_ctx.todayOffset > 0 && __VLS_ctx.todayOffset < __VLS_ctx.chartWidth) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "gantt-today-line" },
                ...{ style: ({ left: __VLS_ctx.todayOffset + 'px' }) },
            });
        }
        if (__VLS_ctx.getBarStyle(item)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "gantt-bar" },
                ...{ class: ({ 'gantt-bar-epic': item.type === 'epic' }) },
                ...{ style: (__VLS_ctx.getBarStyle(item)) },
            });
        }
    }
    if (__VLS_ctx.data.unscheduled.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-row gantt-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-label-col text-color-secondary text-sm font-semibold" },
        });
        (__VLS_ctx.$t('timeline.unscheduled'));
        (__VLS_ctx.data.unscheduled.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "gantt-chart-area" },
            ...{ style: ({ width: __VLS_ctx.chartWidth + 'px' }) },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.data.unscheduled))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading && !__VLS_ctx.data))
                            return;
                        if (!(__VLS_ctx.data))
                            return;
                        if (!(__VLS_ctx.data.unscheduled.length > 0))
                            return;
                        __VLS_ctx.router.push(`/tickets/${item.id}`);
                    } },
                key: (item.id),
                ...{ class: "gantt-row unscheduled" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "gantt-label-col" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "gantt-item-label text-color-secondary" },
            });
            (item.ticket_key);
            (item.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "gantt-chart-area" },
                ...{ style: ({ width: __VLS_ctx.chartWidth + 'px' }) },
            });
        }
    }
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8rem']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-container']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-label-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-body']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-label-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-item-label']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-chart-area']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-today-line']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-label-col']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-chart-area']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['unscheduled']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-label-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-item-label']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-chart-area']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Select: Select,
            router: router,
            data: data,
            loading: loading,
            zoomLevel: zoomLevel,
            zoomOptions: zoomOptions,
            allItems: allItems,
            headerDates: headerDates,
            chartWidth: chartWidth,
            getBarStyle: getBarStyle,
            todayOffset: todayOffset,
            onClickItem: onClickItem,
            loadTimeline: loadTimeline,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
