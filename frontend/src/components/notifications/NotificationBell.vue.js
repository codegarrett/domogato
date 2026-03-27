import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import OverlayPanel from 'primevue/overlaypanel';
import { listNotifications, getUnreadCount, markAsRead, markAllRead, } from '@/api/notifications';
import { useWebSocket } from '@/composables/useWebSocket';
const { t } = useI18n();
const router = useRouter();
const ws = useWebSocket();
const unreadCount = ref(0);
const notifications = ref([]);
const loading = ref(false);
const panelRef = ref();
let pollTimer = null;
async function loadUnreadCount() {
    try {
        unreadCount.value = await getUnreadCount();
    }
    catch { /* ignore */ }
}
async function loadNotifications() {
    loading.value = true;
    try {
        const res = await listNotifications({ limit: 20 });
        notifications.value = res.items;
    }
    finally {
        loading.value = false;
    }
}
function togglePanel(event) {
    panelRef.value?.toggle(event);
    if (!panelRef.value?.visible) {
        void loadNotifications();
    }
}
async function onClickNotification(n) {
    if (!n.is_read) {
        await markAsRead(n.id);
        n.is_read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
    panelRef.value?.hide();
    if (n.entity_type === 'ticket' && n.entity_id) {
        router.push(`/tickets/${n.entity_id}`);
    }
}
async function onMarkAllRead() {
    await markAllRead();
    unreadCount.value = 0;
    notifications.value = notifications.value.map(n => ({ ...n, is_read: true }));
}
function onWsNotification(_data) {
    unreadCount.value++;
}
function formatTimeAgo(iso) {
    const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60)
        return t('tickets.timeAgo.justNow');
    const min = Math.round(sec / 60);
    if (min < 60)
        return t('tickets.timeAgo.minutesAgo', { n: min });
    const hr = Math.round(min / 60);
    if (hr < 24)
        return t('tickets.timeAgo.hoursAgo', { n: hr });
    const day = Math.round(hr / 24);
    return t('tickets.timeAgo.daysAgo', { n: day });
}
onMounted(() => {
    void loadUnreadCount();
    pollTimer = setInterval(loadUnreadCount, 60_000);
    ws.on('notification', onWsNotification);
});
onUnmounted(() => {
    if (pollTimer)
        clearInterval(pollTimer);
    ws.off('notification', onWsNotification);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['notification-bell']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-dot']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notification-bell-wrapper" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.togglePanel) },
    ...{ class: "notification-bell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-bell" },
});
if (__VLS_ctx.unreadCount > 0) {
    const __VLS_0 = {}.Badge;
    /** @type {[typeof __VLS_components.Badge, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        value: (__VLS_ctx.unreadCount > 99 ? '99+' : String(__VLS_ctx.unreadCount)),
        severity: "danger",
        ...{ class: "notif-badge" },
    }));
    const __VLS_2 = __VLS_1({
        value: (__VLS_ctx.unreadCount > 99 ? '99+' : String(__VLS_ctx.unreadCount)),
        severity: "danger",
        ...{ class: "notif-badge" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
const __VLS_4 = {}.OverlayPanel;
/** @type {[typeof __VLS_components.OverlayPanel, typeof __VLS_components.OverlayPanel, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ref: "panelRef",
    ...{ style: ({ width: '22rem', maxWidth: '95vw' }) },
}));
const __VLS_6 = __VLS_5({
    ref: "panelRef",
    ...{ style: ({ width: '22rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {typeof __VLS_ctx.panelRef} */ ;
var __VLS_8 = {};
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-2 px-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "font-semibold text-sm" },
});
(__VLS_ctx.$t('notifications.title'));
if (__VLS_ctx.unreadCount > 0) {
    const __VLS_10 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('notifications.markAllRead')),
        text: true,
        size: "small",
        ...{ class: "p-0 text-xs" },
    }));
    const __VLS_12 = __VLS_11({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('notifications.markAllRead')),
        text: true,
        size: "small",
        ...{ class: "p-0 text-xs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    let __VLS_14;
    let __VLS_15;
    let __VLS_16;
    const __VLS_17 = {
        onClick: (__VLS_ctx.onMarkAllRead)
    };
    var __VLS_13;
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center p-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner" },
    });
}
else if (__VLS_ctx.notifications.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-color-secondary text-sm p-3" },
    });
    (__VLS_ctx.$t('notifications.empty'));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "notification-list" },
    });
    for (const [n] of __VLS_getVForSourceType((__VLS_ctx.notifications))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.notifications.length === 0))
                        return;
                    __VLS_ctx.onClickNotification(n);
                } },
            key: (n.id),
            ...{ class: "notification-item" },
            ...{ class: ({ unread: !n.is_read }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-start gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "notif-dot" },
            ...{ class: ({ visible: !n.is_read }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1 min-w-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-sm font-medium notif-title" },
        });
        (n.title);
        if (n.body) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-xs text-color-secondary mt-1 notif-body" },
            });
            (n.body);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-xs text-color-secondary mt-1" },
        });
        (__VLS_ctx.formatTimeAgo(n.created_at));
    }
}
var __VLS_7;
/** @type {__VLS_StyleScopedClasses['notification-bell-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-bell']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-bell']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['p-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-list']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-item']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-title']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['notif-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
// @ts-ignore
var __VLS_9 = __VLS_8;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Badge: Badge,
            Button: Button,
            OverlayPanel: OverlayPanel,
            unreadCount: unreadCount,
            notifications: notifications,
            loading: loading,
            panelRef: panelRef,
            togglePanel: togglePanel,
            onClickNotification: onClickNotification,
            onMarkAllRead: onMarkAllRead,
            formatTimeAgo: formatTimeAgo,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
