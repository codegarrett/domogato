import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import BarChart from '@/components/charts/BarChart.vue';
import PieChart from '@/components/charts/PieChart.vue';
import StackedAreaChart from '@/components/charts/StackedAreaChart.vue';
import ScatterChart from '@/components/charts/ScatterChart.vue';
import { getProjectSummary, getVelocityReport, getCycleTimeReport, getCumulativeFlowReport, } from '@/api/reports';
const route = useRoute();
const { t } = useI18n();
const projectId = route.params.projectId;
const summary = ref(null);
const velocity = ref(null);
const cycleTime = ref(null);
const cfd = ref(null);
const loading = ref(false);
const today = new Date();
const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
const cfdStartDate = ref(thirtyDaysAgo);
const cfdEndDate = ref(today);
function fmt(d) {
    return d.toISOString().slice(0, 10);
}
const completionPercent = computed(() => {
    if (!summary.value || summary.value.total_tickets === 0)
        return 0;
    return Math.round((summary.value.done_tickets / summary.value.total_tickets) * 100);
});
const spPercent = computed(() => {
    if (!summary.value || summary.value.total_story_points === 0)
        return 0;
    return Math.round((summary.value.completed_story_points / summary.value.total_story_points) * 100);
});
const PRIORITY_COLORS = {
    highest: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#22c55e', lowest: '#94a3b8',
};
const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#64748b'];
const priorityChartData = computed(() => {
    if (!summary.value)
        return { labels: [], datasets: [] };
    const entries = Object.entries(summary.value.by_priority);
    return {
        labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
        datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: entries.map(([k]) => PRIORITY_COLORS[k] || '#94a3b8'),
            }],
    };
});
const typeChartData = computed(() => {
    if (!summary.value)
        return { labels: [], datasets: [] };
    const entries = Object.entries(summary.value.by_type);
    return {
        labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
        datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: TYPE_COLORS.slice(0, entries.length),
            }],
    };
});
const velocityChartData = computed(() => {
    if (!velocity.value || velocity.value.entries.length === 0)
        return null;
    const entries = velocity.value.entries;
    return {
        labels: entries.map(e => e.sprint_name),
        datasets: [
            {
                label: t('reports.velocity'),
                data: entries.map(e => e.velocity),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderRadius: 4,
            },
            {
                label: t('reports.averageVelocity'),
                data: entries.map(() => velocity.value.average),
                type: 'line',
                borderColor: '#f97316',
                borderDash: [6, 3],
                pointRadius: 0,
                borderWidth: 2,
                fill: false,
            },
        ],
    };
});
const cfdChartData = computed(() => {
    if (!cfd.value || cfd.value.days.length === 0)
        return null;
    const days = cfd.value.days;
    return {
        labels: days.map(d => d.date),
        datasets: [
            { label: 'Done', data: days.map(d => d.done), backgroundColor: 'rgba(34,197,94,0.5)', borderColor: '#22c55e', fill: true },
            { label: 'In Progress', data: days.map(d => d.in_progress), backgroundColor: 'rgba(59,130,246,0.5)', borderColor: '#3b82f6', fill: true },
            { label: 'To Do', data: days.map(d => d.todo), backgroundColor: 'rgba(148,163,184,0.5)', borderColor: '#94a3b8', fill: true },
        ],
    };
});
const cycleTimeChartData = computed(() => {
    if (!cycleTime.value || cycleTime.value.entries.length === 0)
        return null;
    return {
        datasets: [{
                label: t('reports.cycleTime'),
                data: cycleTime.value.entries.map((e, i) => ({ x: i + 1, y: e.cycle_time_hours })),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                pointRadius: 5,
            }],
    };
});
async function loadReports() {
    loading.value = true;
    try {
        const [s, v, ct, flow] = await Promise.all([
            getProjectSummary(projectId),
            getVelocityReport(projectId),
            getCycleTimeReport(projectId),
            getCumulativeFlowReport(projectId, fmt(cfdStartDate.value), fmt(cfdEndDate.value)),
        ]);
        summary.value = s;
        velocity.value = v;
        cycleTime.value = ct;
        cfd.value = flow;
    }
    finally {
        loading.value = false;
    }
}
async function refreshCfd() {
    try {
        cfd.value = await getCumulativeFlowReport(projectId, fmt(cfdStartDate.value), fmt(cfdEndDate.value));
    }
    catch { /* noop */ }
}
onMounted(loadReports);
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
(__VLS_ctx.$t('reports.title'));
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    text: true,
    rounded: true,
    loading: (__VLS_ctx.loading),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    icon: "pi pi-refresh",
    text: true,
    rounded: true,
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.loadReports)
};
var __VLS_3;
if (__VLS_ctx.loading && !__VLS_ctx.summary) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner text-3xl text-color-secondary" },
    });
}
else if (__VLS_ctx.summary) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1 text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-3xl font-bold text-primary" },
    });
    (__VLS_ctx.summary.total_tickets);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-color-secondary mt-1" },
    });
    (__VLS_ctx.$t('reports.totalTickets'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1 text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-3xl font-bold" },
        ...{ style: {} },
    });
    (__VLS_ctx.summary.done_tickets);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-color-secondary mt-1" },
    });
    (__VLS_ctx.$t('reports.completed'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1 text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-3xl font-bold" },
        ...{ style: {} },
    });
    (__VLS_ctx.summary.in_progress_tickets);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-color-secondary mt-1" },
    });
    (__VLS_ctx.$t('reports.inProgress'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-6 lg:col-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1 text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-3xl font-bold" },
        ...{ style: ({ color: __VLS_ctx.summary.overdue_tickets > 0 ? 'var(--p-red-500)' : 'var(--p-text-color)' }) },
    });
    (__VLS_ctx.summary.overdue_tickets);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-color-secondary mt-1" },
    });
    (__VLS_ctx.$t('reports.overdue'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
    });
    (__VLS_ctx.$t('reports.ticketCompletion'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "h-1rem border-round overflow-hidden bg-surface-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "h-full border-round bg-primary" },
        ...{ style: ({ width: __VLS_ctx.completionPercent + '%' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-color-secondary" },
    });
    (__VLS_ctx.completionPercent);
    (__VLS_ctx.summary.done_tickets);
    (__VLS_ctx.summary.total_tickets);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
    });
    (__VLS_ctx.$t('reports.storyPoints'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "h-1rem border-round overflow-hidden bg-surface-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "h-full border-round" },
        ...{ style: ({ width: __VLS_ctx.spPercent + '%', background: 'var(--p-green-500)' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm text-color-secondary" },
    });
    (__VLS_ctx.spPercent);
    (__VLS_ctx.summary.completed_story_points);
    (__VLS_ctx.summary.total_story_points);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
    });
    (__VLS_ctx.$t('reports.byPriority'));
    if (Object.keys(__VLS_ctx.summary.by_priority).length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('reports.noData'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        /** @type {[typeof PieChart, ]} */ ;
        // @ts-ignore
        const __VLS_8 = __VLS_asFunctionalComponent(PieChart, new PieChart({
            data: (__VLS_ctx.priorityChartData),
        }));
        const __VLS_9 = __VLS_8({
            data: (__VLS_ctx.priorityChartData),
        }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
    });
    (__VLS_ctx.$t('reports.byType'));
    if (Object.keys(__VLS_ctx.summary.by_type).length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('reports.noData'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        /** @type {[typeof PieChart, ]} */ ;
        // @ts-ignore
        const __VLS_11 = __VLS_asFunctionalComponent(PieChart, new PieChart({
            data: (__VLS_ctx.typeChartData),
        }));
        const __VLS_12 = __VLS_11({
            data: (__VLS_ctx.typeChartData),
        }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
    });
    (__VLS_ctx.$t('reports.velocity'));
    if (!__VLS_ctx.velocityChartData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('reports.noData'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        /** @type {[typeof BarChart, ]} */ ;
        // @ts-ignore
        const __VLS_14 = __VLS_asFunctionalComponent(BarChart, new BarChart({
            data: (__VLS_ctx.velocityChartData),
        }));
        const __VLS_15 = __VLS_14({
            data: (__VLS_ctx.velocityChartData),
        }, ...__VLS_functionalComponentArgsRest(__VLS_14));
    }
    if (__VLS_ctx.velocity) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-sm text-color-secondary mt-2" },
        });
        (__VLS_ctx.$t('reports.averageVelocity'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.velocity.average);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between flex-wrap gap-2 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary" },
    });
    (__VLS_ctx.$t('reports.cumulativeFlow'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center gap-2" },
    });
    const __VLS_17 = {}.DatePicker;
    /** @type {[typeof __VLS_components.DatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
        ...{ 'onDateSelect': {} },
        modelValue: (__VLS_ctx.cfdStartDate),
        dateFormat: "yy-mm-dd",
        showIcon: true,
        ...{ class: "w-10rem" },
    }));
    const __VLS_19 = __VLS_18({
        ...{ 'onDateSelect': {} },
        modelValue: (__VLS_ctx.cfdStartDate),
        dateFormat: "yy-mm-dd",
        showIcon: true,
        ...{ class: "w-10rem" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    let __VLS_21;
    let __VLS_22;
    let __VLS_23;
    const __VLS_24 = {
        onDateSelect: (__VLS_ctx.refreshCfd)
    };
    var __VLS_20;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-color-secondary" },
    });
    const __VLS_25 = {}.DatePicker;
    /** @type {[typeof __VLS_components.DatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
        ...{ 'onDateSelect': {} },
        modelValue: (__VLS_ctx.cfdEndDate),
        dateFormat: "yy-mm-dd",
        showIcon: true,
        ...{ class: "w-10rem" },
    }));
    const __VLS_27 = __VLS_26({
        ...{ 'onDateSelect': {} },
        modelValue: (__VLS_ctx.cfdEndDate),
        dateFormat: "yy-mm-dd",
        showIcon: true,
        ...{ class: "w-10rem" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_26));
    let __VLS_29;
    let __VLS_30;
    let __VLS_31;
    const __VLS_32 = {
        onDateSelect: (__VLS_ctx.refreshCfd)
    };
    var __VLS_28;
    if (!__VLS_ctx.cfdChartData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('reports.noData'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        /** @type {[typeof StackedAreaChart, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(StackedAreaChart, new StackedAreaChart({
            data: (__VLS_ctx.cfdChartData),
        }));
        const __VLS_34 = __VLS_33({
            data: (__VLS_ctx.cfdChartData),
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 lg:col-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "surface-card p-4 border-round shadow-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-sm font-semibold text-color-secondary mb-3" },
    });
    (__VLS_ctx.$t('reports.cycleTime'));
    if (!__VLS_ctx.cycleTimeChartData) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('reports.noData'));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ style: {} },
        });
        /** @type {[typeof ScatterChart, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(ScatterChart, new ScatterChart({
            data: (__VLS_ctx.cycleTimeChartData),
            options: ({ scales: { x: { title: { display: true, text: 'Ticket #' } }, y: { title: { display: true, text: 'Hours' }, beginAtZero: true } } }),
        }));
        const __VLS_37 = __VLS_36({
            data: (__VLS_ctx.cycleTimeChartData),
            options: ({ scales: { x: { title: { display: true, text: 'Ticket #' } }, y: { title: { display: true, text: 'Hours' }, beginAtZero: true } } }),
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    }
    if (__VLS_ctx.cycleTime) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-4 mt-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xl font-bold text-primary" },
        });
        (__VLS_ctx.cycleTime.average_hours);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xs text-color-secondary" },
        });
        (__VLS_ctx.$t('reports.average'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xl font-bold" },
            ...{ style: {} },
        });
        (__VLS_ctx.cycleTime.median_hours);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xs text-color-secondary" },
        });
        (__VLS_ctx.$t('reports.median'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xl font-bold text-color-secondary" },
        });
        (__VLS_ctx.cycleTime.entries.length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xs text-color-secondary" },
        });
        (__VLS_ctx.$t('reports.ticketsAnalyzed'));
    }
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-3']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-1rem']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-surface-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-1rem']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-surface-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10rem']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10rem']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            DatePicker: DatePicker,
            BarChart: BarChart,
            PieChart: PieChart,
            StackedAreaChart: StackedAreaChart,
            ScatterChart: ScatterChart,
            summary: summary,
            velocity: velocity,
            cycleTime: cycleTime,
            loading: loading,
            cfdStartDate: cfdStartDate,
            cfdEndDate: cfdEndDate,
            completionPercent: completionPercent,
            spPercent: spPercent,
            priorityChartData: priorityChartData,
            typeChartData: typeChartData,
            velocityChartData: velocityChartData,
            cfdChartData: cfdChartData,
            cycleTimeChartData: cycleTimeChartData,
            loadReports: loadReports,
            refreshCfd: refreshCfd,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
