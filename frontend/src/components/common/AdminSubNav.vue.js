import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
const { t } = useI18n();
const route = useRoute();
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sub-nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-nav-link']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "admin-sub-nav" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/admin/users",
    ...{ class: "sub-nav-link" },
    ...{ class: ({ active: __VLS_ctx.route.path === '/admin/users' }) },
}));
const __VLS_2 = __VLS_1({
    to: "/admin/users",
    ...{ class: "sub-nav-link" },
    ...{ class: ({ active: __VLS_ctx.route.path === '/admin/users' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-users" },
});
(__VLS_ctx.t('admin.users'));
var __VLS_3;
const __VLS_4 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    to: "/admin/organizations",
    ...{ class: "sub-nav-link" },
    ...{ class: ({ active: __VLS_ctx.route.path === '/admin/organizations' }) },
}));
const __VLS_6 = __VLS_5({
    to: "/admin/organizations",
    ...{ class: "sub-nav-link" },
    ...{ class: ({ active: __VLS_ctx.route.path === '/admin/organizations' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-building" },
});
(__VLS_ctx.t('admin.organizations'));
var __VLS_7;
const __VLS_8 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    to: "/admin/auth",
    ...{ class: "sub-nav-link" },
    ...{ class: ({ active: __VLS_ctx.route.path === '/admin/auth' }) },
}));
const __VLS_10 = __VLS_9({
    to: "/admin/auth",
    ...{ class: "sub-nav-link" },
    ...{ class: ({ active: __VLS_ctx.route.path === '/admin/auth' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-lock" },
});
(__VLS_ctx.t('admin.authentication'));
var __VLS_11;
/** @type {__VLS_StyleScopedClasses['admin-sub-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-users']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-building']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-lock']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            t: t,
            route: route,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
