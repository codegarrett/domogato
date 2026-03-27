import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { listVersions, getVersion, restoreVersion as apiRestoreVersion, diffVersions, } from '@/api/kb';
const props = defineProps();
const emit = defineEmits();
const { t } = useI18n();
const versions = ref([]);
const selectedVersions = ref([]);
const showViewDialog = ref(false);
const showDiffDialog = ref(false);
const viewingVersion = ref(null);
const viewingVersionFull = ref(null);
const diffResult = ref(null);
const latestVersion = computed(() => versions.value.length ? versions.value[0].version_number : 0);
async function load() {
    const res = await listVersions(props.pageId);
    versions.value = res.items;
}
function toggleSelect(id) {
    const idx = selectedVersions.value.indexOf(id);
    if (idx !== -1) {
        selectedVersions.value.splice(idx, 1);
    }
    else if (selectedVersions.value.length < 2) {
        selectedVersions.value.push(id);
    }
}
function isSelected(id) {
    return selectedVersions.value.includes(id);
}
function clearSelection() {
    selectedVersions.value = [];
}
async function viewVersion(v) {
    viewingVersion.value = v;
    viewingVersionFull.value = await getVersion(props.pageId, v.id);
    showViewDialog.value = true;
}
async function showDiff() {
    if (selectedVersions.value.length !== 2)
        return;
    diffResult.value = await diffVersions(props.pageId, selectedVersions.value[0], selectedVersions.value[1]);
    showDiffDialog.value = true;
}
async function onRestoreVersion(v) {
    if (!confirm(t('kb.confirmRestore', 'Restore this version? A new version will be created.')))
        return;
    await apiRestoreVersion(props.pageId, v.id);
    await load();
    emit('restored');
}
function formatDate(iso) {
    return new Date(iso).toLocaleString();
}
onMounted(load);
watch(() => props.pageId, load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['version-item']} */ ;
/** @type {__VLS_StyleScopedClasses['version-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kb-version-history" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex align-items-center justify-content-between mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "m-0" },
});
(__VLS_ctx.$t('kb.versions'));
if (__VLS_ctx.selectedVersions.length === 2) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-2" },
    });
    const __VLS_0 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        label: "Compare",
        icon: "pi pi-arrows-h",
        size: "small",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        label: "Compare",
        icon: "pi pi-arrows-h",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.showDiff)
    };
    var __VLS_3;
    const __VLS_8 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        label: "Clear",
        size: "small",
        severity: "secondary",
        text: true,
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        label: "Clear",
        size: "small",
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (__VLS_ctx.clearSelection)
    };
    var __VLS_11;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "version-list" },
});
for (const [v] of __VLS_getVForSourceType((__VLS_ctx.versions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleSelect(v.id);
            } },
        key: (v.id),
        ...{ class: "version-item surface-card border-round p-3 mb-2" },
        ...{ class: ({ selected: __VLS_ctx.isSelected(v.id) }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex align-items-center justify-content-between" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "font-semibold" },
    });
    (v.version_number);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-color-secondary text-sm ml-2" },
    });
    (v.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex gap-1" },
    });
    const __VLS_16 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        icon: "pi pi-eye",
        text: true,
        rounded: true,
        size: "small",
        title: (__VLS_ctx.$t('kb.viewVersion', 'View')),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        icon: "pi pi-eye",
        text: true,
        rounded: true,
        size: "small",
        title: (__VLS_ctx.$t('kb.viewVersion', 'View')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (...[$event]) => {
            __VLS_ctx.viewVersion(v);
        }
    };
    var __VLS_19;
    if (v.version_number < __VLS_ctx.latestVersion) {
        const __VLS_24 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            ...{ 'onClick': {} },
            icon: "pi pi-replay",
            text: true,
            rounded: true,
            size: "small",
            severity: "warning",
            title: (__VLS_ctx.$t('kb.restoreVersion', 'Restore')),
        }));
        const __VLS_26 = __VLS_25({
            ...{ 'onClick': {} },
            icon: "pi pi-replay",
            text: true,
            rounded: true,
            size: "small",
            severity: "warning",
            title: (__VLS_ctx.$t('kb.restoreVersion', 'Restore')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        let __VLS_28;
        let __VLS_29;
        let __VLS_30;
        const __VLS_31 = {
            onClick: (...[$event]) => {
                if (!(v.version_number < __VLS_ctx.latestVersion))
                    return;
                __VLS_ctx.onRestoreVersion(v);
            }
        };
        var __VLS_27;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-xs text-color-secondary mt-1" },
    });
    (v.change_summary || __VLS_ctx.$t('kb.noDescription', 'No description'));
    (__VLS_ctx.formatDate(v.created_at));
}
const __VLS_32 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    visible: (__VLS_ctx.showViewDialog),
    header: (`Version ${__VLS_ctx.viewingVersion?.version_number}`),
    modal: true,
    ...{ style: ({ width: '50rem' }) },
}));
const __VLS_34 = __VLS_33({
    visible: (__VLS_ctx.showViewDialog),
    header: (`Version ${__VLS_ctx.viewingVersion?.version_number}`),
    modal: true,
    ...{ style: ({ width: '50rem' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
if (__VLS_ctx.viewingVersionFull) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "prose" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.viewingVersionFull.content_html) }, null, null);
}
var __VLS_35;
const __VLS_36 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    visible: (__VLS_ctx.showDiffDialog),
    header: (__VLS_ctx.$t('kb.versionComparison', 'Version Comparison')),
    modal: true,
    ...{ style: ({ width: '60rem' }) },
}));
const __VLS_38 = __VLS_37({
    visible: (__VLS_ctx.showDiffDialog),
    header: (__VLS_ctx.$t('kb.versionComparison', 'Version Comparison')),
    modal: true,
    ...{ style: ({ width: '60rem' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
if (__VLS_ctx.diffResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diff-view" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diff-stats mb-3 flex gap-3 text-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-green-600" },
    });
    (__VLS_ctx.diffResult.stats.additions);
    (__VLS_ctx.$t('kb.additions', 'additions'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-red-600" },
    });
    (__VLS_ctx.diffResult.stats.deletions);
    (__VLS_ctx.$t('kb.deletions', 'deletions'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diff-lines" },
    });
    for (const [entry, i] of __VLS_getVForSourceType((__VLS_ctx.diffResult.diff))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: "diff-line" },
            ...{ class: ({
                    'diff-added': entry.type === 'added',
                    'diff-removed': entry.type === 'removed',
                }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "diff-prefix" },
        });
        (entry.type === 'added' ? '+' : entry.type === 'removed' ? '-' : ' ');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (entry.content);
    }
}
var __VLS_39;
/** @type {__VLS_StyleScopedClasses['kb-version-history']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['version-list']} */ ;
/** @type {__VLS_StyleScopedClasses['version-item']} */ ;
/** @type {__VLS_StyleScopedClasses['surface-card']} */ ;
/** @type {__VLS_StyleScopedClasses['border-round']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['diff-view']} */ ;
/** @type {__VLS_StyleScopedClasses['diff-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['diff-lines']} */ ;
/** @type {__VLS_StyleScopedClasses['diff-line']} */ ;
/** @type {__VLS_StyleScopedClasses['diff-prefix']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Dialog: Dialog,
            versions: versions,
            selectedVersions: selectedVersions,
            showViewDialog: showViewDialog,
            showDiffDialog: showDiffDialog,
            viewingVersion: viewingVersion,
            viewingVersionFull: viewingVersionFull,
            diffResult: diffResult,
            latestVersion: latestVersion,
            toggleSelect: toggleSelect,
            isSelected: isSelected,
            clearSelection: clearSelection,
            viewVersion: viewVersion,
            showDiff: showDiff,
            onRestoreVersion: onRestoreVersion,
            formatDate: formatDate,
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
