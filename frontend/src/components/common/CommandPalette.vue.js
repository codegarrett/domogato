import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { globalSearch } from '@/api/search';
const router = useRouter();
const visible = ref(false);
const query = ref('');
const results = ref([]);
const loading = ref(false);
const selectedIndex = ref(0);
let debounceTimer = null;
function open() {
    visible.value = true;
    query.value = '';
    results.value = [];
    selectedIndex.value = 0;
    nextTick(() => {
        const el = document.querySelector('.cmd-palette-input input');
        el?.focus();
    });
}
function close() {
    visible.value = false;
}
async function search(q) {
    if (!q.trim()) {
        results.value = [];
        return;
    }
    loading.value = true;
    try {
        const resp = await globalSearch(q, { limit: 15 });
        results.value = resp.results.map((r) => ({
            type: r.type,
            id: r.id,
            title: r.title,
            subtitle: r.subtitle || '',
            route: r.url,
            highlight: r.highlight || undefined,
        }));
        selectedIndex.value = 0;
    }
    catch {
        results.value = [];
    }
    finally {
        loading.value = false;
    }
}
watch(query, (q) => {
    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(q), 250);
});
function onKeydown(e) {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1);
    }
    else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    }
    else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.value[selectedIndex.value]) {
            navigate(results.value[selectedIndex.value]);
        }
    }
    else if (e.key === 'Escape') {
        close();
    }
}
function navigate(result) {
    close();
    router.push(result.route);
}
function typeIcon(type) {
    if (type === 'ticket')
        return 'pi pi-ticket';
    if (type === 'kb_page')
        return 'pi pi-book';
    if (type === 'comment')
        return 'pi pi-comment';
    if (type === 'project')
        return 'pi pi-folder';
    return 'pi pi-search';
}
function onGlobalKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (visible.value)
            close();
        else
            open();
    }
}
onMounted(() => {
    document.addEventListener('keydown', onGlobalKeydown);
});
onUnmounted(() => {
    document.removeEventListener('keydown', onGlobalKeydown);
});
const __VLS_exposed = { open };
defineExpose(__VLS_exposed);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cmd-palette-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-result']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    visible: (__VLS_ctx.visible),
    modal: true,
    closable: (false),
    showHeader: (false),
    ...{ style: ({ width: '36rem', maxWidth: '95vw' }) },
    contentClass: "p-0",
    ...{ class: "cmd-palette-dialog" },
}));
const __VLS_2 = __VLS_1({
    visible: (__VLS_ctx.visible),
    modal: true,
    closable: (false),
    showHeader: (false),
    ...{ style: ({ width: '36rem', maxWidth: '95vw' }) },
    contentClass: "p-0",
    ...{ class: "cmd-palette-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onKeydown: (__VLS_ctx.onKeydown) },
    ...{ class: "cmd-palette" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cmd-palette-search" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-search cmd-palette-search-icon" },
});
const __VLS_5 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    modelValue: (__VLS_ctx.query),
    placeholder: (__VLS_ctx.$t('search.placeholder')),
    ...{ class: "cmd-palette-input w-full" },
    autofocus: true,
}));
const __VLS_7 = __VLS_6({
    modelValue: (__VLS_ctx.query),
    placeholder: (__VLS_ctx.$t('search.placeholder')),
    ...{ class: "cmd-palette-input w-full" },
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({
    ...{ class: "cmd-palette-kbd" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cmd-palette-loading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-spin pi-spinner" },
    });
}
else if (__VLS_ctx.results.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cmd-palette-results" },
    });
    for (const [r, i] of __VLS_getVForSourceType((__VLS_ctx.results))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.results.length > 0))
                        return;
                    __VLS_ctx.navigate(r);
                } },
            ...{ onMouseenter: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!(__VLS_ctx.results.length > 0))
                        return;
                    __VLS_ctx.selectedIndex = i;
                } },
            key: (r.id + '-' + i),
            ...{ class: "cmd-palette-result" },
            ...{ class: ({ selected: i === __VLS_ctx.selectedIndex }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: (__VLS_ctx.typeIcon(r.type)) },
            ...{ class: "cmd-palette-result-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex-1 min-w-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cmd-palette-result-title" },
        });
        (r.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cmd-palette-result-subtitle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cmd-palette-result-type" },
        });
        (r.type === 'kb_page' ? 'Page' : r.type);
        if (r.subtitle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (r.subtitle);
        }
    }
}
else if (__VLS_ctx.query.trim()) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cmd-palette-empty" },
    });
    (__VLS_ctx.$t('search.noResults'));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cmd-palette-hint" },
    });
    (__VLS_ctx.$t('search.hint'));
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['cmd-palette-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-search']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-search-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-input']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-kbd']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-results']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-result']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-result-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-result-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-result-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-result-type']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cmd-palette-hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Dialog: Dialog,
            InputText: InputText,
            visible: visible,
            query: query,
            results: results,
            loading: loading,
            selectedIndex: selectedIndex,
            onKeydown: onKeydown,
            navigate: navigate,
            typeIcon: typeIcon,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
});
; /* PartiallyEnd: #4569/main.vue */
