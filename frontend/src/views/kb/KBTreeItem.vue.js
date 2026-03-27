import { inject } from 'vue';
const __VLS_props = defineProps();
const isExpanded = inject('kbTreeIsExpanded', () => false);
const toggleExpand = inject('kbTreeToggleExpand', () => { });
const isActive = inject('kbTreeIsActive', () => false);
const selectPage = inject('kbTreeSelectPage', () => { });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
// CSS variable injection 
// CSS variable injection end 
for (const [node] of __VLS_getVForSourceType((__VLS_ctx.nodes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (node.id),
        ...{ class: "kb-tree-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectPage(node);
            } },
        ...{ class: "tree-node" },
        ...{ class: ({ active: __VLS_ctx.isActive(node) }) },
        ...{ style: ({ paddingLeft: ((__VLS_ctx.depth ?? 0) * 16 + 8) + 'px' }) },
    });
    if (node.children.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ onClick: (...[$event]) => {
                    if (!(node.children.length))
                        return;
                    __VLS_ctx.toggleExpand(node.id);
                } },
            ...{ class: (__VLS_ctx.isExpanded(node.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right') },
            ...{ class: "tree-toggle text-xs mr-1" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-file text-xs mr-1 text-color-secondary" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-sm tree-label" },
    });
    (node.title);
    if (__VLS_ctx.isExpanded(node.id) && node.children.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_0 = {}.KBTreeItem;
        /** @type {[typeof __VLS_components.KBTreeItem, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            nodes: (node.children),
            depth: ((__VLS_ctx.depth ?? 0) + 1),
        }));
        const __VLS_2 = __VLS_1({
            nodes: (node.children),
            depth: ((__VLS_ctx.depth ?? 0) + 1),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    }
}
/** @type {__VLS_StyleScopedClasses['kb-tree-item']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-file']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-label']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            isExpanded: isExpanded,
            toggleExpand: toggleExpand,
            isActive: isActive,
            selectPage: selectPage,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
