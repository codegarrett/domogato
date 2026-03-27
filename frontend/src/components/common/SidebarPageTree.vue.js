import { useRoute } from 'vue-router';
const props = defineProps();
const emit = defineEmits();
const route = useRoute();
function isPageActive(slug) {
    return route.params.pageSlug === slug && route.params.spaceSlug === props.spaceSlug;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
    ...{ class: "sidebar-page-tree" },
});
for (const [node] of __VLS_getVForSourceType((__VLS_ctx.nodes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        key: (node.id),
        ...{ class: "tree-node" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tree-node-row" },
        ...{ class: ({ active: __VLS_ctx.isPageActive(node.slug) }) },
    });
    if (node.children?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(node.children?.length))
                        return;
                    __VLS_ctx.emit('toggle-page', node.id);
                } },
            ...{ class: "tree-toggle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi" },
            ...{ class: (__VLS_ctx.expandedPages.has(node.id) ? 'pi-chevron-down' : 'pi-chevron-right') },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "tree-toggle-spacer" },
        });
    }
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        to: (`/projects/${__VLS_ctx.projectId}/kb/${__VLS_ctx.spaceSlug}/${node.slug}`),
        ...{ class: "tree-label" },
    }));
    const __VLS_2 = __VLS_1({
        to: (`/projects/${__VLS_ctx.projectId}/kb/${__VLS_ctx.spaceSlug}/${node.slug}`),
        ...{ class: "tree-label" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-file" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tree-text-ellipsis" },
    });
    (node.title);
    var __VLS_3;
    if (node.children?.length && __VLS_ctx.expandedPages.has(node.id)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "tree-children" },
        });
        const __VLS_4 = {}.SidebarPageTree;
        /** @type {[typeof __VLS_components.SidebarPageTree, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            ...{ 'onTogglePage': {} },
            nodes: (node.children),
            projectId: (__VLS_ctx.projectId),
            spaceSlug: (__VLS_ctx.spaceSlug),
            expandedPages: (__VLS_ctx.expandedPages),
        }));
        const __VLS_6 = __VLS_5({
            ...{ 'onTogglePage': {} },
            nodes: (node.children),
            projectId: (__VLS_ctx.projectId),
            spaceSlug: (__VLS_ctx.spaceSlug),
            expandedPages: (__VLS_ctx.expandedPages),
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
        let __VLS_8;
        let __VLS_9;
        let __VLS_10;
        const __VLS_11 = {
            onTogglePage: (...[$event]) => {
                if (!(node.children?.length && __VLS_ctx.expandedPages.has(node.id)))
                    return;
                __VLS_ctx.emit('toggle-page', $event);
            }
        };
        var __VLS_7;
    }
}
/** @type {__VLS_StyleScopedClasses['sidebar-page-tree']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle-spacer']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-file']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-text-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            emit: emit,
            isPageActive: isPageActive,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
