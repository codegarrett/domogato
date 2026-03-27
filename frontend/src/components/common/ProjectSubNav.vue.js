import { computed, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getProject } from '@/api/projects';
const route = useRoute();
const { t } = useI18n();
const projectId = computed(() => route.params.projectId || null);
const projectName = ref(null);
const projectKey = ref(null);
watchEffect(async () => {
    const pid = projectId.value;
    if (!pid) {
        projectName.value = null;
        projectKey.value = null;
        return;
    }
    try {
        const p = await getProject(pid);
        projectName.value = p.name;
        projectKey.value = p.key;
    }
    catch {
        projectName.value = null;
        projectKey.value = null;
    }
});
const sections = computed(() => {
    const pid = projectId.value;
    if (!pid)
        return [];
    return [
        { key: 'overview', label: t('nav.overview'), to: `/projects/${pid}`, icon: 'pi pi-home' },
        { key: 'tickets', label: t('nav.ticketsList'), to: `/projects/${pid}/tickets`, icon: 'pi pi-list' },
        { key: 'board', label: t('nav.board'), to: `/projects/${pid}/board`, icon: 'pi pi-th-large' },
        { key: 'backlog', label: t('nav.backlog'), to: `/projects/${pid}/backlog`, icon: 'pi pi-inbox' },
        { key: 'sprints', label: t('nav.sprints'), to: `/projects/${pid}/sprints`, icon: 'pi pi-calendar' },
        { key: 'timeline', label: t('timeline.title'), to: `/projects/${pid}/timeline`, icon: 'pi pi-calendar-clock' },
        { key: 'reports', label: t('reports.title'), to: `/projects/${pid}/reports`, icon: 'pi pi-chart-bar' },
        { key: 'custom-fields', label: t('nav.customFields'), to: `/projects/${pid}/custom-fields`, icon: 'pi pi-sliders-h' },
        { key: 'audit-log', label: t('audit.title'), to: `/projects/${pid}/audit-log`, icon: 'pi pi-history' },
        { key: 'webhooks', label: t('webhooks.title'), to: `/projects/${pid}/webhooks`, icon: 'pi pi-link' },
        { key: 'kb', label: t('kb.title'), to: `/projects/${pid}/kb`, icon: 'pi pi-book' },
    ];
});
function isActive(section) {
    const path = route.path;
    if (section.key === 'overview') {
        return path === section.to;
    }
    return path.startsWith(section.to);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['subnav-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['subnav-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['subnav-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['subnav-tab']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.projectId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "project-subnav" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "subnav-header" },
    });
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: (`/projects/${__VLS_ctx.projectId}`),
        ...{ class: "project-link" },
    }));
    const __VLS_2 = __VLS_1({
        to: (`/projects/${__VLS_ctx.projectId}`),
        ...{ class: "project-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    if (__VLS_ctx.projectKey) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "project-key" },
        });
        (__VLS_ctx.projectKey);
    }
    if (__VLS_ctx.projectName) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "project-name" },
        });
        (__VLS_ctx.projectName);
    }
    var __VLS_3;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        ...{ class: "subnav-tabs" },
    });
    for (const [s] of __VLS_getVForSourceType((__VLS_ctx.sections))) {
        const __VLS_4 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            key: (s.key),
            to: (s.to),
            ...{ class: "subnav-tab" },
            ...{ class: ({ active: __VLS_ctx.isActive(s) }) },
        }));
        const __VLS_6 = __VLS_5({
            key: (s.key),
            to: (s.to),
            ...{ class: "subnav-tab" },
            ...{ class: ({ active: __VLS_ctx.isActive(s) }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        __VLS_7.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: (s.icon) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (s.label);
        var __VLS_7;
    }
}
/** @type {__VLS_StyleScopedClasses['project-subnav']} */ ;
/** @type {__VLS_StyleScopedClasses['subnav-header']} */ ;
/** @type {__VLS_StyleScopedClasses['project-link']} */ ;
/** @type {__VLS_StyleScopedClasses['project-key']} */ ;
/** @type {__VLS_StyleScopedClasses['project-name']} */ ;
/** @type {__VLS_StyleScopedClasses['subnav-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['subnav-tab']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            projectId: projectId,
            projectName: projectName,
            projectKey: projectKey,
            sections: sections,
            isActive: isActive,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
