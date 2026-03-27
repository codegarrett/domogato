import { useI18n } from 'vue-i18n';
const __VLS_props = defineProps();
const { t } = useI18n();
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['locked']} */ ;
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.locked) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "source-badge locked" },
        title: (__VLS_ctx.t('admin.setByEnv')),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-lock" },
    });
    (__VLS_ctx.t('admin.envVar'));
}
else if (__VLS_ctx.source === 'database') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "source-badge database" },
    });
    (__VLS_ctx.t('admin.database'));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "source-badge default-source" },
    });
    (__VLS_ctx.t('admin.default'));
}
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['locked']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-lock']} */ ;
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['database']} */ ;
/** @type {__VLS_StyleScopedClasses['source-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['default-source']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            t: t,
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
