import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import Select from 'primevue/select';
import { useAuthStore } from '@/stores/auth';
import { useOrganizationStore } from '@/stores/organization';
import { listProjects } from '@/api/projects';
import { listSpaces, createSpace, getPageTree } from '@/api/kb';
import ContextMenu from 'primevue/contextmenu';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import OrgSwitcher from '@/components/common/OrgSwitcher.vue';
import ProjectSubNav from '@/components/common/ProjectSubNav.vue';
import SidebarPageTree from '@/components/common/SidebarPageTree.vue';
import NotificationBell from '@/components/notifications/NotificationBell.vue';
import CommandPalette from '@/components/common/CommandPalette.vue';
import WsStatusIndicator from '@/components/common/WsStatusIndicator.vue';
import ChatFlyout from '@/components/chat/ChatFlyout.vue';
import { useChatStore } from '@/stores/chat';
import { useWebSocket } from '@/composables/useWebSocket';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import { setLocale, getLocale } from '@/i18n';
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const orgStore = useOrganizationStore();
const chatStore = useChatStore();
const ws = useWebSocket();
useKeyboardShortcuts();
const sidebarVisible = ref(true);
const menuRef = ref();
// ---------------------------------------------------------------------------
// Sidebar resize
// ---------------------------------------------------------------------------
const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 480;
const SIDEBAR_STORAGE_KEY = 'projecthub-sidebar-width';
const sidebarWidth = ref(parseInt(localStorage.getItem(SIDEBAR_STORAGE_KEY) || '', 10) || 240);
function onResizeStart(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth.value;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    function onMove(ev) {
        const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + ev.clientX - startX));
        sidebarWidth.value = w;
    }
    function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth.value));
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}
const localeOptions = [
    { label: 'EN', value: 'en' },
    { label: 'ES', value: 'es' },
];
const currentLocale = ref(getLocale() || 'en');
watch(currentLocale, (value) => setLocale(value));
const userMenuItems = computed(() => {
    const items = [
        { label: t('nav.profile'), icon: 'pi pi-user', command: () => router.push('/profile') },
        { label: t('nav.settings'), icon: 'pi pi-cog', command: () => router.push('/settings') },
    ];
    if (authStore.isSystemAdmin) {
        items.push({ label: t('nav.admin'), icon: 'pi pi-shield', command: () => router.push('/admin/users') });
    }
    items.push({ separator: true });
    items.push({ label: t('nav.signOut'), icon: 'pi pi-sign-out', command: () => authStore.doLogout() });
    return items;
});
// ---------------------------------------------------------------------------
// Org & Project tree (existing)
// ---------------------------------------------------------------------------
const expandedOrgs = reactive(new Set());
const orgProjects = reactive(new Map());
const orgProjectsLoading = reactive(new Set());
async function toggleOrg(orgId) {
    if (expandedOrgs.has(orgId)) {
        expandedOrgs.delete(orgId);
        return;
    }
    expandedOrgs.add(orgId);
    if (!orgProjects.has(orgId)) {
        await loadOrgProjects(orgId);
    }
}
async function loadOrgProjects(orgId) {
    orgProjectsLoading.add(orgId);
    try {
        const res = await listProjects(orgId, 0, 200);
        orgProjects.set(orgId, res.items);
    }
    catch {
        orgProjects.set(orgId, []);
    }
    finally {
        orgProjectsLoading.delete(orgId);
    }
}
function isOrgActive(orgId) {
    return route.path === `/organizations/${orgId}`;
}
function isProjectActive(projectId) {
    return route.path.startsWith(`/projects/${projectId}`);
}
// ---------------------------------------------------------------------------
// Project sections (grouped into categories)
// ---------------------------------------------------------------------------
const expandedProjects = reactive(new Set());
const expandedCategories = reactive(new Set());
function getProjectCategories(projectId) {
    return [
        {
            key: 'pm',
            label: t('nav.projectManagement'),
            icon: 'pi pi-objects-column',
            type: 'group',
            children: [
                { key: 'overview', label: t('nav.overview'), to: `/projects/${projectId}`, icon: 'pi pi-home' },
                { key: 'tickets', label: t('nav.ticketsList'), to: `/projects/${projectId}/tickets`, icon: 'pi pi-list' },
                { key: 'board', label: t('nav.board'), to: `/projects/${projectId}/board`, icon: 'pi pi-th-large' },
                { key: 'backlog', label: t('nav.backlog'), to: `/projects/${projectId}/backlog`, icon: 'pi pi-inbox' },
                { key: 'sprints', label: t('nav.sprints'), to: `/projects/${projectId}/sprints`, icon: 'pi pi-calendar' },
                { key: 'timeline', label: t('timeline.title'), to: `/projects/${projectId}/timeline`, icon: 'pi pi-calendar-clock' },
                { key: 'reports', label: t('reports.title'), to: `/projects/${projectId}/reports`, icon: 'pi pi-chart-bar' },
                { key: 'custom-fields', label: t('nav.customFields'), to: `/projects/${projectId}/custom-fields`, icon: 'pi pi-sliders-h' },
                { key: 'audit-log', label: t('audit.title'), to: `/projects/${projectId}/audit-log`, icon: 'pi pi-history' },
            ],
        },
        {
            key: 'kb',
            label: t('kb.title'),
            icon: 'pi pi-book',
            type: 'kb',
            children: [],
        },
        {
            key: 'integrations',
            label: t('nav.integrations'),
            icon: 'pi pi-link',
            type: 'group',
            children: [
                { key: 'webhooks', label: t('webhooks.title'), to: `/projects/${projectId}/webhooks`, icon: 'pi pi-link' },
            ],
        },
    ];
}
function toggleProject(projectId) {
    if (expandedProjects.has(projectId)) {
        expandedProjects.delete(projectId);
    }
    else {
        expandedProjects.add(projectId);
    }
}
function categoryKey(projectId, catKey) {
    return `${projectId}:${catKey}`;
}
function toggleCategory(projectId, cat) {
    const ck = categoryKey(projectId, cat.key);
    if (expandedCategories.has(ck)) {
        expandedCategories.delete(ck);
    }
    else {
        expandedCategories.add(ck);
    }
}
function isCategoryActive(projectId, cat) {
    if (cat.key === 'kb')
        return route.path.startsWith(`/projects/${projectId}/kb`);
    return cat.children.some((s) => isSectionActive(s));
}
function isSectionActive(section) {
    if (section.key === 'overview')
        return route.path === section.to;
    return route.path.startsWith(section.to);
}
// ---------------------------------------------------------------------------
// KB: spaces & page tree (lazy-loaded)
// ---------------------------------------------------------------------------
const expandedKb = reactive(new Set());
const kbSpaces = reactive(new Map());
const kbSpacesLoading = reactive(new Set());
const expandedSpaces = reactive(new Set());
const spacePageTree = reactive(new Map());
const spacePagesLoading = reactive(new Set());
const expandedPages = reactive(new Set());
const kbContextMenu = ref();
const kbContextItems = ref([]);
const kbContextProjectId = ref('');
const showNewSpaceDialog = ref(false);
const newSpaceName = ref('');
const newSpaceDesc = ref('');
const savingSpace = ref(false);
function onKbContextMenu(e, projectId) {
    kbContextProjectId.value = projectId;
    kbContextItems.value = [
        { label: t('kb.newSpace'), icon: 'pi pi-plus', command: () => openNewSpaceDialog(projectId) },
    ];
    kbContextMenu.value.show(e);
}
function onSpaceContextMenu(e, projectId, space) {
    kbContextProjectId.value = projectId;
    kbContextItems.value = [
        {
            label: t('kb.newPage'),
            icon: 'pi pi-file-plus',
            command: () => {
                router.push(`/projects/${projectId}/kb/${space.slug}?newpage=1`);
            },
        },
        { label: t('kb.newSpace'), icon: 'pi pi-plus', command: () => openNewSpaceDialog(projectId) },
    ];
    kbContextMenu.value.show(e);
}
function openNewSpaceDialog(projectId) {
    kbContextProjectId.value = projectId;
    newSpaceName.value = '';
    newSpaceDesc.value = '';
    showNewSpaceDialog.value = true;
}
async function onCreateSpace() {
    const name = newSpaceName.value.trim();
    if (!name)
        return;
    savingSpace.value = true;
    try {
        const body = { name };
        if (newSpaceDesc.value.trim())
            body.description = newSpaceDesc.value.trim();
        await createSpace(kbContextProjectId.value, body);
        showNewSpaceDialog.value = false;
        kbSpaces.delete(kbContextProjectId.value);
        await loadKbSpaces(kbContextProjectId.value);
    }
    finally {
        savingSpace.value = false;
    }
}
function sidebarNewPage(projectId, spaceSlug) {
    router.push(`/projects/${projectId}/kb/${spaceSlug}?newpage=1`);
}
async function toggleKb(projectId) {
    if (expandedKb.has(projectId)) {
        expandedKb.delete(projectId);
        return;
    }
    expandedKb.add(projectId);
    if (!kbSpaces.has(projectId)) {
        await loadKbSpaces(projectId);
    }
}
async function loadKbSpaces(projectId) {
    kbSpacesLoading.add(projectId);
    try {
        const spaces = await listSpaces(projectId);
        kbSpaces.set(projectId, spaces.filter((s) => !s.is_archived));
    }
    catch {
        kbSpaces.set(projectId, []);
    }
    finally {
        kbSpacesLoading.delete(projectId);
    }
}
async function toggleSpace(_projectId, space) {
    if (expandedSpaces.has(space.id)) {
        expandedSpaces.delete(space.id);
        return;
    }
    expandedSpaces.add(space.id);
    if (!spacePageTree.has(space.id)) {
        await loadSpacePages(space.id);
    }
}
async function loadSpacePages(spaceId) {
    spacePagesLoading.add(spaceId);
    try {
        const tree = await getPageTree(spaceId);
        spacePageTree.set(spaceId, tree);
    }
    catch {
        spacePageTree.set(spaceId, []);
    }
    finally {
        spacePagesLoading.delete(spaceId);
    }
}
function togglePage(pageId) {
    if (expandedPages.has(pageId)) {
        expandedPages.delete(pageId);
    }
    else {
        expandedPages.add(pageId);
    }
}
function isSpaceActive(spaceSlug) {
    return route.params.spaceSlug === spaceSlug;
}
// ---------------------------------------------------------------------------
// Auto-expand sidebar to match current route
// ---------------------------------------------------------------------------
onMounted(async () => {
    chatStore.loadConfig();
    if (authStore.currentUser) {
        ws.connect();
    }
    if (orgStore.organizations.length === 0) {
        await orgStore.fetchOrganizations();
    }
    const projectId = route.params.projectId;
    if (projectId) {
        await autoExpandForProject(projectId);
    }
});
onUnmounted(() => {
    ws.disconnect();
});
watch(() => route.params.projectId, async (pid) => {
    if (pid)
        await autoExpandForProject(pid);
});
async function autoExpandForProject(projectId) {
    for (const org of orgStore.organizations) {
        const projects = orgProjects.get(org.id);
        if (projects?.some((p) => p.id === projectId)) {
            expandedOrgs.add(org.id);
            expandedProjects.add(projectId);
            autoExpandCategoryForRoute(projectId);
            await autoExpandKbIfNeeded(projectId);
            return;
        }
    }
    for (const org of orgStore.organizations) {
        if (!orgProjects.has(org.id)) {
            await loadOrgProjects(org.id);
            const projects = orgProjects.get(org.id);
            if (projects?.some((p) => p.id === projectId)) {
                expandedOrgs.add(org.id);
                expandedProjects.add(projectId);
                autoExpandCategoryForRoute(projectId);
                await autoExpandKbIfNeeded(projectId);
                return;
            }
        }
    }
}
function autoExpandCategoryForRoute(projectId) {
    const path = route.path;
    if (path.includes('/kb'))
        return; // handled separately by autoExpandKbIfNeeded
    const pmPaths = ['/tickets', '/board', '/backlog', '/sprints', '/timeline', '/reports', '/custom-fields', '/audit-log'];
    if (pmPaths.some((p) => path.includes(p)) || path === `/projects/${projectId}`) {
        expandedCategories.add(categoryKey(projectId, 'pm'));
    }
    if (path.includes('/webhooks')) {
        expandedCategories.add(categoryKey(projectId, 'integrations'));
    }
}
async function autoExpandKbIfNeeded(projectId) {
    if (!route.path.includes('/kb'))
        return;
    expandedKb.add(projectId);
    if (!kbSpaces.has(projectId)) {
        await loadKbSpaces(projectId);
    }
    const spaceSlug = route.params.spaceSlug;
    if (!spaceSlug)
        return;
    const spaces = kbSpaces.get(projectId) ?? [];
    const space = spaces.find((s) => s.slug === spaceSlug);
    if (!space)
        return;
    expandedSpaces.add(space.id);
    if (!spacePageTree.has(space.id)) {
        await loadSpacePages(space.id);
    }
    const pageSlug = route.params.pageSlug;
    if (!pageSlug)
        return;
    const tree = spacePageTree.get(space.id) ?? [];
    expandPageAncestors(tree, pageSlug);
}
function expandPageAncestors(nodes, targetSlug) {
    for (const node of nodes) {
        if (node.slug === targetSlug)
            return true;
        if (node.children?.length && expandPageAncestors(node.children, targetSlug)) {
            expandedPages.add(node.id);
            return true;
        }
    }
    return false;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['locale-select']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['leaf']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-action-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "app-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-header-left" },
});
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    icon: "pi pi-bars",
    text: true,
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    icon: "pi pi-bars",
    text: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.sidebarVisible = !__VLS_ctx.sidebarVisible;
    }
};
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "app-title" },
});
(__VLS_ctx.$t('nav.appName'));
/** @type {[typeof OrgSwitcher, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(OrgSwitcher, new OrgSwitcher({}));
const __VLS_9 = __VLS_8({}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-header-right" },
});
const __VLS_11 = {}.Select;
/** @type {[typeof __VLS_components.Select, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    modelValue: (__VLS_ctx.currentLocale),
    options: (__VLS_ctx.localeOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "locale-select" },
    'aria-label': (__VLS_ctx.$t('nav.language')),
}));
const __VLS_13 = __VLS_12({
    modelValue: (__VLS_ctx.currentLocale),
    options: (__VLS_ctx.localeOptions),
    optionLabel: "label",
    optionValue: "value",
    ...{ class: "locale-select" },
    'aria-label': (__VLS_ctx.$t('nav.language')),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
/** @type {[typeof NotificationBell, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(NotificationBell, new NotificationBell({}));
const __VLS_16 = __VLS_15({}, ...__VLS_functionalComponentArgsRest(__VLS_15));
if (__VLS_ctx.chatStore.isConfigured) {
    const __VLS_18 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        ...{ 'onClick': {} },
        icon: "pi pi-comment",
        text: true,
        'aria-label': (__VLS_ctx.$t('ai.assistant')),
    }));
    const __VLS_20 = __VLS_19({
        ...{ 'onClick': {} },
        icon: "pi pi-comment",
        text: true,
        'aria-label': (__VLS_ctx.$t('ai.assistant')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_22;
    let __VLS_23;
    let __VLS_24;
    const __VLS_25 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.chatStore.isConfigured))
                return;
            __VLS_ctx.chatStore.toggle();
        }
    };
    var __VLS_21;
}
if (__VLS_ctx.authStore.currentUser) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "user-name" },
    });
    (__VLS_ctx.authStore.currentUser.display_name);
}
const __VLS_26 = {}.Avatar;
/** @type {[typeof __VLS_components.Avatar, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.authStore.currentUser?.display_name?.charAt(0)?.toUpperCase() ?? '?'),
    shape: "circle",
    ...{ class: "header-avatar" },
}));
const __VLS_28 = __VLS_27({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.authStore.currentUser?.display_name?.charAt(0)?.toUpperCase() ?? '?'),
    shape: "circle",
    ...{ class: "header-avatar" },
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_30;
let __VLS_31;
let __VLS_32;
const __VLS_33 = {
    onClick: (...[$event]) => {
        __VLS_ctx.menuRef.toggle($event);
    }
};
var __VLS_29;
const __VLS_34 = {}.Menu;
/** @type {[typeof __VLS_components.Menu, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    ref: "menuRef",
    model: (__VLS_ctx.userMenuItems),
    popup: (true),
}));
const __VLS_36 = __VLS_35({
    ref: "menuRef",
    model: (__VLS_ctx.userMenuItems),
    popup: (true),
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
/** @type {typeof __VLS_ctx.menuRef} */ ;
var __VLS_38 = {};
var __VLS_37;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-body" },
});
if (__VLS_ctx.sidebarVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "app-sidebar" },
        ...{ style: ({ width: __VLS_ctx.sidebarWidth + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
        ...{ class: "sidebar-inner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "sidebar-section-label" },
    });
    (__VLS_ctx.$t('nav.menu'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "sidebar-nav" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    const __VLS_40 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        to: "/",
        ...{ class: "nav-item" },
        exactActiveClass: "active",
    }));
    const __VLS_42 = __VLS_41({
        to: "/",
        ...{ class: "nav-item" },
        exactActiveClass: "active",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-home" },
    });
    (__VLS_ctx.$t('nav.dashboard'));
    var __VLS_43;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "sidebar-section-label mt-3" },
    });
    (__VLS_ctx.$t('nav.organizations'));
    if (__VLS_ctx.orgStore.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sidebar-loading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-spin pi-spinner text-xs" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "sidebar-nav sidebar-tree" },
        });
        for (const [org] of __VLS_getVForSourceType((__VLS_ctx.orgStore.organizations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (org.id),
                ...{ class: "tree-node" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "tree-node-row" },
                ...{ class: ({ active: __VLS_ctx.isOrgActive(org.id) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.sidebarVisible))
                            return;
                        if (!!(__VLS_ctx.orgStore.loading))
                            return;
                        __VLS_ctx.toggleOrg(org.id);
                    } },
                ...{ class: "tree-toggle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi" },
                ...{ class: (__VLS_ctx.expandedOrgs.has(org.id) ? 'pi-chevron-down' : 'pi-chevron-right') },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.sidebarVisible))
                            return;
                        if (!!(__VLS_ctx.orgStore.loading))
                            return;
                        __VLS_ctx.toggleOrg(org.id);
                    } },
                ...{ class: "tree-label tree-label-toggle" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-building" },
            });
            (org.name);
            if (__VLS_ctx.expandedOrgs.has(org.id)) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                    ...{ class: "tree-children" },
                });
                if (__VLS_ctx.orgProjectsLoading.has(org.id)) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                        ...{ class: "tree-loading" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                        ...{ class: "pi pi-spin pi-spinner text-xs" },
                    });
                }
                else {
                    for (const [proj] of __VLS_getVForSourceType((__VLS_ctx.orgProjects.get(org.id) ?? []))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                            key: (proj.id),
                            ...{ class: "tree-node" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "tree-node-row" },
                            ...{ class: ({ active: __VLS_ctx.isProjectActive(proj.id) && !__VLS_ctx.expandedProjects.has(proj.id) }) },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!(__VLS_ctx.sidebarVisible))
                                        return;
                                    if (!!(__VLS_ctx.orgStore.loading))
                                        return;
                                    if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                        return;
                                    if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                        return;
                                    __VLS_ctx.toggleProject(proj.id);
                                } },
                            ...{ class: "tree-toggle" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                            ...{ class: "pi" },
                            ...{ class: (__VLS_ctx.expandedProjects.has(proj.id) ? 'pi-chevron-down' : 'pi-chevron-right') },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ onClick: (...[$event]) => {
                                    if (!(__VLS_ctx.sidebarVisible))
                                        return;
                                    if (!!(__VLS_ctx.orgStore.loading))
                                        return;
                                    if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                        return;
                                    if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                        return;
                                    __VLS_ctx.toggleProject(proj.id);
                                } },
                            ...{ class: "tree-label tree-label-toggle" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                            ...{ class: "pi pi-folder" },
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: "tree-project-name" },
                        });
                        (proj.name);
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: "tree-project-key" },
                        });
                        (proj.key);
                        if (__VLS_ctx.expandedProjects.has(proj.id)) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                                ...{ class: "tree-children" },
                            });
                            for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.getProjectCategories(proj.id)))) {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                    key: (cat.key),
                                    ...{ class: "tree-node" },
                                });
                                if (cat.type === 'kb') {
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                        ...{ onContextmenu: (...[$event]) => {
                                                if (!(__VLS_ctx.sidebarVisible))
                                                    return;
                                                if (!!(__VLS_ctx.orgStore.loading))
                                                    return;
                                                if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                    return;
                                                if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                    return;
                                                if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                    return;
                                                if (!(cat.type === 'kb'))
                                                    return;
                                                __VLS_ctx.onKbContextMenu($event, proj.id);
                                            } },
                                        ...{ class: "tree-node-row" },
                                        ...{ class: ({ active: __VLS_ctx.isCategoryActive(proj.id, cat) && !__VLS_ctx.expandedKb.has(proj.id) }) },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!(__VLS_ctx.sidebarVisible))
                                                    return;
                                                if (!!(__VLS_ctx.orgStore.loading))
                                                    return;
                                                if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                    return;
                                                if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                    return;
                                                if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                    return;
                                                if (!(cat.type === 'kb'))
                                                    return;
                                                __VLS_ctx.toggleKb(proj.id);
                                            } },
                                        ...{ class: "tree-toggle" },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                        ...{ class: "pi" },
                                        ...{ class: (__VLS_ctx.expandedKb.has(proj.id) ? 'pi-chevron-down' : 'pi-chevron-right') },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!(__VLS_ctx.sidebarVisible))
                                                    return;
                                                if (!!(__VLS_ctx.orgStore.loading))
                                                    return;
                                                if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                    return;
                                                if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                    return;
                                                if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                    return;
                                                if (!(cat.type === 'kb'))
                                                    return;
                                                __VLS_ctx.toggleKb(proj.id);
                                            } },
                                        ...{ class: "tree-label tree-label-toggle tree-category-label" },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                        ...{ class: (cat.icon) },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                        ...{ class: "tree-text-ellipsis" },
                                    });
                                    (cat.label);
                                    if (__VLS_ctx.expandedKb.has(proj.id)) {
                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                                            ...{ class: "tree-children" },
                                        });
                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                            ...{ class: "tree-node" },
                                        });
                                        const __VLS_44 = {}.RouterLink;
                                        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
                                        // @ts-ignore
                                        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                                            to: (`/projects/${proj.id}/kb`),
                                            ...{ class: "tree-node-row tree-label leaf" },
                                            ...{ class: ({ active: __VLS_ctx.route.path === `/projects/${proj.id}/kb` }) },
                                        }));
                                        const __VLS_46 = __VLS_45({
                                            to: (`/projects/${proj.id}/kb`),
                                            ...{ class: "tree-node-row tree-label leaf" },
                                            ...{ class: ({ active: __VLS_ctx.route.path === `/projects/${proj.id}/kb` }) },
                                        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
                                        __VLS_47.slots.default;
                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                            ...{ class: "pi pi-home" },
                                        });
                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                            ...{ class: "tree-text-ellipsis" },
                                        });
                                        (__VLS_ctx.$t('nav.overview'));
                                        var __VLS_47;
                                        if (__VLS_ctx.kbSpacesLoading.has(proj.id)) {
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                ...{ class: "tree-loading" },
                                            });
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                ...{ class: "pi pi-spin pi-spinner text-xs" },
                                            });
                                        }
                                        else {
                                            for (const [space] of __VLS_getVForSourceType((__VLS_ctx.kbSpaces.get(proj.id) ?? []))) {
                                                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                    ...{ onContextmenu: (...[$event]) => {
                                                            if (!(__VLS_ctx.sidebarVisible))
                                                                return;
                                                            if (!!(__VLS_ctx.orgStore.loading))
                                                                return;
                                                            if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                                return;
                                                            if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                                return;
                                                            if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                                return;
                                                            if (!(cat.type === 'kb'))
                                                                return;
                                                            if (!(__VLS_ctx.expandedKb.has(proj.id)))
                                                                return;
                                                            if (!!(__VLS_ctx.kbSpacesLoading.has(proj.id)))
                                                                return;
                                                            __VLS_ctx.onSpaceContextMenu($event, proj.id, space);
                                                        } },
                                                    key: (space.id),
                                                    ...{ class: "tree-node" },
                                                });
                                                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                                    ...{ class: "tree-node-row" },
                                                    ...{ class: ({ active: __VLS_ctx.isSpaceActive(space.slug) }) },
                                                });
                                                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                                                    ...{ onClick: (...[$event]) => {
                                                            if (!(__VLS_ctx.sidebarVisible))
                                                                return;
                                                            if (!!(__VLS_ctx.orgStore.loading))
                                                                return;
                                                            if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                                return;
                                                            if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                                return;
                                                            if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                                return;
                                                            if (!(cat.type === 'kb'))
                                                                return;
                                                            if (!(__VLS_ctx.expandedKb.has(proj.id)))
                                                                return;
                                                            if (!!(__VLS_ctx.kbSpacesLoading.has(proj.id)))
                                                                return;
                                                            __VLS_ctx.toggleSpace(proj.id, space);
                                                        } },
                                                    ...{ class: "tree-toggle" },
                                                });
                                                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                    ...{ class: "pi" },
                                                    ...{ class: (__VLS_ctx.expandedSpaces.has(space.id) ? 'pi-chevron-down' : 'pi-chevron-right') },
                                                });
                                                const __VLS_48 = {}.RouterLink;
                                                /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
                                                // @ts-ignore
                                                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                                                    to: (`/projects/${proj.id}/kb/${space.slug}`),
                                                    ...{ class: "tree-label" },
                                                }));
                                                const __VLS_50 = __VLS_49({
                                                    to: (`/projects/${proj.id}/kb/${space.slug}`),
                                                    ...{ class: "tree-label" },
                                                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
                                                __VLS_51.slots.default;
                                                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                    ...{ class: "pi pi-folder-open" },
                                                });
                                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                                    ...{ class: "tree-text-ellipsis" },
                                                });
                                                (space.name);
                                                var __VLS_51;
                                                if (__VLS_ctx.expandedSpaces.has(space.id)) {
                                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                                                        ...{ class: "tree-children" },
                                                    });
                                                    if (__VLS_ctx.spacePagesLoading.has(space.id)) {
                                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                            ...{ class: "tree-loading" },
                                                        });
                                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                            ...{ class: "pi pi-spin pi-spinner text-xs" },
                                                        });
                                                    }
                                                    else if (__VLS_ctx.spacePageTree.get(space.id)?.length) {
                                                        /** @type {[typeof SidebarPageTree, ]} */ ;
                                                        // @ts-ignore
                                                        const __VLS_52 = __VLS_asFunctionalComponent(SidebarPageTree, new SidebarPageTree({
                                                            ...{ 'onTogglePage': {} },
                                                            nodes: (__VLS_ctx.spacePageTree.get(space.id)),
                                                            projectId: (proj.id),
                                                            spaceSlug: (space.slug),
                                                            expandedPages: (__VLS_ctx.expandedPages),
                                                        }));
                                                        const __VLS_53 = __VLS_52({
                                                            ...{ 'onTogglePage': {} },
                                                            nodes: (__VLS_ctx.spacePageTree.get(space.id)),
                                                            projectId: (proj.id),
                                                            spaceSlug: (space.slug),
                                                            expandedPages: (__VLS_ctx.expandedPages),
                                                        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
                                                        let __VLS_55;
                                                        let __VLS_56;
                                                        let __VLS_57;
                                                        const __VLS_58 = {
                                                            onTogglePage: (__VLS_ctx.togglePage)
                                                        };
                                                        var __VLS_54;
                                                    }
                                                    else if (!__VLS_ctx.spacePagesLoading.has(space.id)) {
                                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                            ...{ class: "tree-empty" },
                                                        });
                                                        (__VLS_ctx.$t('common.noResults'));
                                                    }
                                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                        ...{ class: "tree-node" },
                                                    });
                                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                                                        ...{ onClick: (...[$event]) => {
                                                                if (!(__VLS_ctx.sidebarVisible))
                                                                    return;
                                                                if (!!(__VLS_ctx.orgStore.loading))
                                                                    return;
                                                                if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                                    return;
                                                                if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                                    return;
                                                                if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                                    return;
                                                                if (!(cat.type === 'kb'))
                                                                    return;
                                                                if (!(__VLS_ctx.expandedKb.has(proj.id)))
                                                                    return;
                                                                if (!!(__VLS_ctx.kbSpacesLoading.has(proj.id)))
                                                                    return;
                                                                if (!(__VLS_ctx.expandedSpaces.has(space.id)))
                                                                    return;
                                                                __VLS_ctx.sidebarNewPage(proj.id, space.slug);
                                                            } },
                                                        ...{ class: "tree-action-btn" },
                                                    });
                                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                        ...{ class: "pi pi-plus" },
                                                    });
                                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                                                    (__VLS_ctx.$t('kb.newPage'));
                                                }
                                            }
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                ...{ class: "tree-node" },
                                            });
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                                                ...{ onClick: (...[$event]) => {
                                                        if (!(__VLS_ctx.sidebarVisible))
                                                            return;
                                                        if (!!(__VLS_ctx.orgStore.loading))
                                                            return;
                                                        if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                            return;
                                                        if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                            return;
                                                        if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                            return;
                                                        if (!(cat.type === 'kb'))
                                                            return;
                                                        if (!(__VLS_ctx.expandedKb.has(proj.id)))
                                                            return;
                                                        if (!!(__VLS_ctx.kbSpacesLoading.has(proj.id)))
                                                            return;
                                                        __VLS_ctx.openNewSpaceDialog(proj.id);
                                                    } },
                                                ...{ class: "tree-action-btn" },
                                            });
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                ...{ class: "pi pi-plus" },
                                            });
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                                            (__VLS_ctx.$t('kb.newSpace'));
                                        }
                                    }
                                }
                                else {
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                        ...{ class: "tree-node-row" },
                                        ...{ class: ({ active: __VLS_ctx.isCategoryActive(proj.id, cat) && !__VLS_ctx.expandedCategories.has(__VLS_ctx.categoryKey(proj.id, cat.key)) }) },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!(__VLS_ctx.sidebarVisible))
                                                    return;
                                                if (!!(__VLS_ctx.orgStore.loading))
                                                    return;
                                                if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                    return;
                                                if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                    return;
                                                if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                    return;
                                                if (!!(cat.type === 'kb'))
                                                    return;
                                                __VLS_ctx.toggleCategory(proj.id, cat);
                                            } },
                                        ...{ class: "tree-toggle" },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                        ...{ class: "pi" },
                                        ...{ class: (__VLS_ctx.expandedCategories.has(__VLS_ctx.categoryKey(proj.id, cat.key)) ? 'pi-chevron-down' : 'pi-chevron-right') },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!(__VLS_ctx.sidebarVisible))
                                                    return;
                                                if (!!(__VLS_ctx.orgStore.loading))
                                                    return;
                                                if (!(__VLS_ctx.expandedOrgs.has(org.id)))
                                                    return;
                                                if (!!(__VLS_ctx.orgProjectsLoading.has(org.id)))
                                                    return;
                                                if (!(__VLS_ctx.expandedProjects.has(proj.id)))
                                                    return;
                                                if (!!(cat.type === 'kb'))
                                                    return;
                                                __VLS_ctx.toggleCategory(proj.id, cat);
                                            } },
                                        ...{ class: "tree-label tree-label-toggle tree-category-label" },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                        ...{ class: (cat.icon) },
                                    });
                                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                        ...{ class: "tree-text-ellipsis" },
                                    });
                                    (cat.label);
                                    if (__VLS_ctx.expandedCategories.has(__VLS_ctx.categoryKey(proj.id, cat.key))) {
                                        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                                            ...{ class: "tree-children" },
                                        });
                                        for (const [section] of __VLS_getVForSourceType((cat.children))) {
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                                                key: (section.key),
                                                ...{ class: "tree-node" },
                                            });
                                            const __VLS_59 = {}.RouterLink;
                                            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
                                            // @ts-ignore
                                            const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
                                                to: (section.to),
                                                ...{ class: "tree-node-row tree-label leaf" },
                                                ...{ class: ({ active: __VLS_ctx.isSectionActive(section) }) },
                                            }));
                                            const __VLS_61 = __VLS_60({
                                                to: (section.to),
                                                ...{ class: "tree-node-row tree-label leaf" },
                                                ...{ class: ({ active: __VLS_ctx.isSectionActive(section) }) },
                                            }, ...__VLS_functionalComponentArgsRest(__VLS_60));
                                            __VLS_62.slots.default;
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                                                ...{ class: (section.icon) },
                                            });
                                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                                ...{ class: "tree-text-ellipsis" },
                                            });
                                            (section.label);
                                            var __VLS_62;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if ((__VLS_ctx.orgProjects.get(org.id) ?? []).length === 0) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                            ...{ class: "tree-empty" },
                        });
                        (__VLS_ctx.$t('common.noResults'));
                    }
                }
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "sidebar-section-label mt-3" },
    });
    (__VLS_ctx.$t('nav.settings'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "sidebar-nav" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    const __VLS_63 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        to: "/workflows",
        ...{ class: "nav-item" },
    }));
    const __VLS_65 = __VLS_64({
        to: "/workflows",
        ...{ class: "nav-item" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    __VLS_66.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-sitemap" },
    });
    (__VLS_ctx.$t('nav.workflows'));
    var __VLS_66;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onPointerdown: (__VLS_ctx.onResizeStart) },
        ...{ class: "sidebar-resize-handle" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "app-main" },
});
/** @type {[typeof ProjectSubNav, ]} */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(ProjectSubNav, new ProjectSubNav({}));
const __VLS_68 = __VLS_67({}, ...__VLS_functionalComponentArgsRest(__VLS_67));
const __VLS_70 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({}));
const __VLS_72 = __VLS_71({}, ...__VLS_functionalComponentArgsRest(__VLS_71));
/** @type {[typeof CommandPalette, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(CommandPalette, new CommandPalette({}));
const __VLS_75 = __VLS_74({}, ...__VLS_functionalComponentArgsRest(__VLS_74));
/** @type {[typeof WsStatusIndicator, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(WsStatusIndicator, new WsStatusIndicator({}));
const __VLS_78 = __VLS_77({}, ...__VLS_functionalComponentArgsRest(__VLS_77));
/** @type {[typeof ChatFlyout, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(ChatFlyout, new ChatFlyout({}));
const __VLS_81 = __VLS_80({}, ...__VLS_functionalComponentArgsRest(__VLS_80));
const __VLS_83 = {}.ContextMenu;
/** @type {[typeof __VLS_components.ContextMenu, ]} */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    ref: "kbContextMenu",
    model: (__VLS_ctx.kbContextItems),
}));
const __VLS_85 = __VLS_84({
    ref: "kbContextMenu",
    model: (__VLS_ctx.kbContextItems),
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
/** @type {typeof __VLS_ctx.kbContextMenu} */ ;
var __VLS_87 = {};
var __VLS_86;
const __VLS_89 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    visible: (__VLS_ctx.showNewSpaceDialog),
    header: (__VLS_ctx.$t('kb.newSpace')),
    modal: true,
    ...{ style: ({ width: '26rem', maxWidth: '95vw' }) },
}));
const __VLS_91 = __VLS_90({
    visible: (__VLS_ctx.showNewSpaceDialog),
    header: (__VLS_ctx.$t('kb.newSpace')),
    modal: true,
    ...{ style: ({ width: '26rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
__VLS_92.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('kb.spaceName'));
const __VLS_93 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
    modelValue: (__VLS_ctx.newSpaceName),
    ...{ class: "w-full" },
    autofocus: true,
}));
const __VLS_95 = __VLS_94({
    modelValue: (__VLS_ctx.newSpaceName),
    ...{ class: "w-full" },
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('kb.spaceDescription'));
const __VLS_97 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
    modelValue: (__VLS_ctx.newSpaceDesc),
    ...{ class: "w-full" },
    rows: (3),
}));
const __VLS_99 = __VLS_98({
    modelValue: (__VLS_ctx.newSpaceDesc),
    ...{ class: "w-full" },
    rows: (3),
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
{
    const { footer: __VLS_thisSlot } = __VLS_92.slots;
    const __VLS_101 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_102 = __VLS_asFunctionalComponent(__VLS_101, new __VLS_101({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('kb.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_103 = __VLS_102({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('kb.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_102));
    let __VLS_105;
    let __VLS_106;
    let __VLS_107;
    const __VLS_108 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showNewSpaceDialog = false;
        }
    };
    var __VLS_104;
    const __VLS_109 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_110 = __VLS_asFunctionalComponent(__VLS_109, new __VLS_109({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.savingSpace),
        disabled: (!__VLS_ctx.newSpaceName.trim()),
    }));
    const __VLS_111 = __VLS_110({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.savingSpace),
        disabled: (!__VLS_ctx.newSpaceName.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_110));
    let __VLS_113;
    let __VLS_114;
    let __VLS_115;
    const __VLS_116 = {
        onClick: (__VLS_ctx.onCreateSpace)
    };
    var __VLS_112;
}
var __VLS_92;
/** @type {__VLS_StyleScopedClasses['app-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['app-title']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header-right']} */ ;
/** @type {__VLS_StyleScopedClasses['locale-select']} */ ;
/** @type {__VLS_StyleScopedClasses['user-name']} */ ;
/** @type {__VLS_StyleScopedClasses['header-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['app-body']} */ ;
/** @type {__VLS_StyleScopedClasses['app-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-home']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-tree']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-building']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-folder']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-project-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-project-key']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-category-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-text-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['leaf']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-home']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-text-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-folder-open']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-text-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-category-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-text-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['leaf']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-text-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-sitemap']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-resize-handle']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
// @ts-ignore
var __VLS_39 = __VLS_38, __VLS_88 = __VLS_87;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Avatar: Avatar,
            Menu: Menu,
            Select: Select,
            ContextMenu: ContextMenu,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            OrgSwitcher: OrgSwitcher,
            ProjectSubNav: ProjectSubNav,
            SidebarPageTree: SidebarPageTree,
            NotificationBell: NotificationBell,
            CommandPalette: CommandPalette,
            WsStatusIndicator: WsStatusIndicator,
            ChatFlyout: ChatFlyout,
            route: route,
            authStore: authStore,
            orgStore: orgStore,
            chatStore: chatStore,
            sidebarVisible: sidebarVisible,
            menuRef: menuRef,
            sidebarWidth: sidebarWidth,
            onResizeStart: onResizeStart,
            localeOptions: localeOptions,
            currentLocale: currentLocale,
            userMenuItems: userMenuItems,
            expandedOrgs: expandedOrgs,
            orgProjects: orgProjects,
            orgProjectsLoading: orgProjectsLoading,
            toggleOrg: toggleOrg,
            isOrgActive: isOrgActive,
            isProjectActive: isProjectActive,
            expandedProjects: expandedProjects,
            expandedCategories: expandedCategories,
            getProjectCategories: getProjectCategories,
            toggleProject: toggleProject,
            categoryKey: categoryKey,
            toggleCategory: toggleCategory,
            isCategoryActive: isCategoryActive,
            isSectionActive: isSectionActive,
            expandedKb: expandedKb,
            kbSpaces: kbSpaces,
            kbSpacesLoading: kbSpacesLoading,
            expandedSpaces: expandedSpaces,
            spacePageTree: spacePageTree,
            spacePagesLoading: spacePagesLoading,
            expandedPages: expandedPages,
            kbContextMenu: kbContextMenu,
            kbContextItems: kbContextItems,
            showNewSpaceDialog: showNewSpaceDialog,
            newSpaceName: newSpaceName,
            newSpaceDesc: newSpaceDesc,
            savingSpace: savingSpace,
            onKbContextMenu: onKbContextMenu,
            onSpaceContextMenu: onSpaceContextMenu,
            openNewSpaceDialog: openNewSpaceDialog,
            onCreateSpace: onCreateSpace,
            sidebarNewPage: sidebarNewPage,
            toggleKb: toggleKb,
            toggleSpace: toggleSpace,
            togglePage: togglePage,
            isSpaceActive: isSpaceActive,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
