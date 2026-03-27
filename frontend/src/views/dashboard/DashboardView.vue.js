import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import { getDashboard } from '@/api/dashboard';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const data = ref(null);
async function load() {
    loading.value = true;
    try {
        data.value = await getDashboard();
    }
    catch {
        data.value = null;
    }
    finally {
        loading.value = false;
    }
}
function prioritySeverity(p) {
    switch (p) {
        case 'highest': return 'danger';
        case 'high': return 'warning';
        case 'medium': return 'info';
        case 'low': return 'success';
        default: return 'secondary';
    }
}
function relativeTime(iso) {
    if (!iso)
        return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return 'just now';
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
function formatDate(iso) {
    if (!iso)
        return '';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const greeting = computed(() => {
    const hour = new Date().getHours();
    const name = authStore.currentUser?.display_name?.split(' ')[0] || '';
    let greet = 'Good morning';
    if (hour >= 12 && hour < 17)
        greet = 'Good afternoon';
    else if (hour >= 17)
        greet = 'Good evening';
    return name ? `${greet}, ${name}` : greet;
});
const overdueTickets = computed(() => {
    if (!data.value)
        return [];
    const today = new Date().toISOString().slice(0, 10);
    return data.value.assigned_tickets.filter((t) => t.due_date && t.due_date < today);
});
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-due']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-row']} */ ;
/** @type {__VLS_StyleScopedClasses['watched-row']} */ ;
/** @type {__VLS_StyleScopedClasses['watched-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_0 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.data) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "dashboard-greeting" },
    });
    (__VLS_ctx.greeting);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "dashboard-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stats-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.data.stats.open_tickets);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card" },
        ...{ class: ({ 'stat-alert': __VLS_ctx.data.overdue_count > 0 }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.data.overdue_count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.data.stats.completed_this_week);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-value" },
    });
    (__VLS_ctx.data.stats.hours_logged_this_week);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-label" },
    });
    if (__VLS_ctx.overdueTickets.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "overdue-banner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-exclamation-triangle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.overdueTickets.length);
        (__VLS_ctx.overdueTickets.length !== 1 ? 's' : '');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-grid" },
    });
    const __VLS_4 = {}.Card;
    /** @type {[typeof __VLS_components.Card, typeof __VLS_components.Card, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ class: "dashboard-card card-tickets" },
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: "dashboard-card card-tickets" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    {
        const { title: __VLS_thisSlot } = __VLS_7.slots;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-title-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_8 = {}.Tag;
        /** @type {[typeof __VLS_components.Tag, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            value: (String(__VLS_ctx.data.assigned_tickets.length)),
            severity: "secondary",
        }));
        const __VLS_10 = __VLS_9({
            value: (String(__VLS_ctx.data.assigned_tickets.length)),
            severity: "secondary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    }
    {
        const { content: __VLS_thisSlot } = __VLS_7.slots;
        if (__VLS_ctx.data.assigned_tickets.length === 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-check-circle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ticket-list" },
            });
            for (const [ticket] of __VLS_getVForSourceType((__VLS_ctx.data.assigned_tickets))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.loading))
                                return;
                            if (!(__VLS_ctx.data))
                                return;
                            if (!!(__VLS_ctx.data.assigned_tickets.length === 0))
                                return;
                            __VLS_ctx.router.push(`/tickets/${ticket.id}`);
                        } },
                    key: (ticket.id),
                    ...{ class: "ticket-row" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "ticket-row-left" },
                });
                const __VLS_12 = {}.Tag;
                /** @type {[typeof __VLS_components.Tag, ]} */ ;
                // @ts-ignore
                const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
                    value: (ticket.priority),
                    severity: (__VLS_ctx.prioritySeverity(ticket.priority)),
                    ...{ class: "ticket-priority-tag" },
                }));
                const __VLS_14 = __VLS_13({
                    value: (ticket.priority),
                    severity: (__VLS_ctx.prioritySeverity(ticket.priority)),
                    ...{ class: "ticket-priority-tag" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_13));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "ticket-key" },
                });
                (ticket.ticket_key);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "ticket-title-text" },
                });
                (ticket.title);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "ticket-row-right" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "ticket-status" },
                });
                (ticket.status_name);
                if (ticket.due_date) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "ticket-due" },
                        ...{ class: ({ overdue: ticket.due_date < new Date().toISOString().slice(0, 10) }) },
                    });
                    (__VLS_ctx.formatDate(ticket.due_date));
                }
            }
        }
    }
    var __VLS_7;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-right" },
    });
    if (__VLS_ctx.data.active_sprints.length > 0) {
        const __VLS_16 = {}.Card;
        /** @type {[typeof __VLS_components.Card, typeof __VLS_components.Card, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            ...{ class: "dashboard-card" },
        }));
        const __VLS_18 = __VLS_17({
            ...{ class: "dashboard-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        {
            const { title: __VLS_thisSlot } = __VLS_19.slots;
        }
        {
            const { content: __VLS_thisSlot } = __VLS_19.slots;
            for (const [sprint] of __VLS_getVForSourceType((__VLS_ctx.data.active_sprints))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (sprint.id),
                    ...{ class: "sprint-row" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "sprint-info" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "sprint-name" },
                });
                (sprint.name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "sprint-project" },
                });
                (sprint.project_name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "sprint-progress" },
                });
                const __VLS_20 = {}.ProgressBar;
                /** @type {[typeof __VLS_components.ProgressBar, ]} */ ;
                // @ts-ignore
                const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
                    value: (sprint.progress_pct),
                    showValue: (true),
                    ...{ style: {} },
                }));
                const __VLS_22 = __VLS_21({
                    value: (sprint.progress_pct),
                    showValue: (true),
                    ...{ style: {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_21));
                if (sprint.end_date) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "sprint-end" },
                    });
                    (__VLS_ctx.formatDate(sprint.end_date));
                }
            }
        }
        var __VLS_19;
    }
    if (__VLS_ctx.data.watched_recent.length > 0) {
        const __VLS_24 = {}.Card;
        /** @type {[typeof __VLS_components.Card, typeof __VLS_components.Card, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ class: "dashboard-card" },
        }));
        const __VLS_26 = __VLS_25({
            ...{ class: "dashboard-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        {
            const { title: __VLS_thisSlot } = __VLS_27.slots;
        }
        {
            const { content: __VLS_thisSlot } = __VLS_27.slots;
            for (const [w] of __VLS_getVForSourceType((__VLS_ctx.data.watched_recent))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.loading))
                                return;
                            if (!(__VLS_ctx.data))
                                return;
                            if (!(__VLS_ctx.data.watched_recent.length > 0))
                                return;
                            __VLS_ctx.router.push(`/tickets/${w.id}`);
                        } },
                    key: (w.id),
                    ...{ class: "watched-row" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "ticket-key" },
                });
                (w.ticket_key);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "watched-title" },
                });
                (w.title);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "watched-time" },
                });
                (__VLS_ctx.relativeTime(w.updated_at));
            }
        }
        var __VLS_27;
    }
    if (__VLS_ctx.data.recent_activity.length > 0) {
        const __VLS_28 = {}.Card;
        /** @type {[typeof __VLS_components.Card, typeof __VLS_components.Card, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            ...{ class: "dashboard-card" },
        }));
        const __VLS_30 = __VLS_29({
            ...{ class: "dashboard-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_31.slots.default;
        {
            const { title: __VLS_thisSlot } = __VLS_31.slots;
        }
        {
            const { content: __VLS_thisSlot } = __VLS_31.slots;
            for (const [a] of __VLS_getVForSourceType((__VLS_ctx.data.recent_activity))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (a.id),
                    ...{ class: "activity-row" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                    ...{ class: "pi pi-circle-fill activity-dot" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "activity-text" },
                });
                (a.title);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "activity-time" },
                });
                (__VLS_ctx.relativeTime(a.created_at));
            }
        }
        var __VLS_31;
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6 text-color-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-header']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-greeting']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['overdue-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-exclamation-triangle']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-tickets']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-list']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-row-left']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-priority-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-key']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-title-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-row-right']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-status']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-due']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-right']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-info']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-name']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-project']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['sprint-end']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['watched-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ticket-key']} */ ;
/** @type {__VLS_StyleScopedClasses['watched-title']} */ ;
/** @type {__VLS_StyleScopedClasses['watched-time']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-card']} */ ;
/** @type {__VLS_StyleScopedClasses['activity-row']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-circle-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['activity-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['activity-text']} */ ;
/** @type {__VLS_StyleScopedClasses['activity-time']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Card: Card,
            Tag: Tag,
            ProgressBar: ProgressBar,
            ProgressSpinner: ProgressSpinner,
            router: router,
            loading: loading,
            data: data,
            prioritySeverity: prioritySeverity,
            relativeTime: relativeTime,
            formatDate: formatDate,
            greeting: greeting,
            overdueTickets: overdueTickets,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
