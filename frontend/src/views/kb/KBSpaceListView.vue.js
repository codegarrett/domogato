import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listSpaces, createSpace, listRecentPages, searchKB, } from '@/api/kb';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
const route = useRoute();
const router = useRouter();
const projectId = computed(() => route.params.projectId);
const spaces = ref([]);
const recentPages = ref([]);
const loading = ref(false);
const showCreateDialog = ref(false);
const saving = ref(false);
const newSpace = ref({ name: '', description: '', icon: '' });
const iconPickerOpen = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
const searching = ref(false);
let searchTimer = null;
const iconOptions = [
    'book', 'folder', 'file', 'globe', 'briefcase', 'cog',
    'star', 'bolt', 'flag', 'users', 'shield', 'lock',
    'code', 'database', 'server', 'desktop', 'mobile', 'palette',
    'chart-bar', 'megaphone', 'heart', 'home', 'map', 'wrench',
    'lightbulb', 'graduation-cap', 'sitemap', 'box', 'building', 'hashtag',
];
function onSearchInput() {
    if (searchTimer)
        clearTimeout(searchTimer);
    const q = searchQuery.value.trim();
    if (!q) {
        searchResults.value = [];
        return;
    }
    searchTimer = setTimeout(async () => {
        searching.value = true;
        try {
            searchResults.value = await searchKB(projectId.value, { q, limit: 10 });
        }
        finally {
            searching.value = false;
        }
    }, 300);
}
function selectSearchResult(r) {
    searchQuery.value = '';
    searchResults.value = [];
    router.push({
        name: 'kb-page',
        params: { projectId: projectId.value, spaceSlug: r.space_slug, pageSlug: r.slug },
    });
}
async function loadData() {
    loading.value = true;
    try {
        const [spacesData, recentData] = await Promise.all([
            listSpaces(projectId.value),
            listRecentPages(projectId.value, 8),
        ]);
        spaces.value = spacesData;
        recentPages.value = recentData;
    }
    finally {
        loading.value = false;
    }
}
function openCreateDialog() {
    newSpace.value = { name: '', description: '', icon: '' };
    iconPickerOpen.value = false;
    showCreateDialog.value = true;
}
async function onCreate() {
    const name = newSpace.value.name.trim();
    if (!name)
        return;
    saving.value = true;
    try {
        const body = { name };
        if (newSpace.value.description.trim())
            body.description = newSpace.value.description.trim();
        if (newSpace.value.icon.trim())
            body.icon = newSpace.value.icon.trim();
        await createSpace(projectId.value, body);
        showCreateDialog.value = false;
        await loadData();
    }
    finally {
        saving.value = false;
    }
}
function navigateToSpace(space) {
    router.push({ name: 'kb-space', params: { projectId: projectId.value, spaceSlug: space.slug } });
}
function navigateToRecentPage(page) {
    router.push({
        name: 'kb-page',
        params: { projectId: projectId.value, spaceSlug: page.space_slug, pageSlug: page.slug },
    });
}
function toggleIconPicker() {
    iconPickerOpen.value = !iconPickerOpen.value;
}
function selectIcon(icon) {
    newSpace.value.icon = newSpace.value.icon === icon ? '' : icon;
    iconPickerOpen.value = false;
}
function spaceIcon(space) {
    return space.icon ? `pi pi-${space.icon}` : 'pi pi-book';
}
function relativeTime(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)
        return 'just now';
    if (diffMin < 60)
        return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 30)
        return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
onMounted(loadData);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-card']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-select-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-select-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-picker-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-picker-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "kb-space-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header flex align-items-center justify-content-between mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "m-0 mb-1" },
});
(__VLS_ctx.$t('kb.title'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "m-0 text-color-secondary text-sm" },
});
(__VLS_ctx.spaces.length);
(__VLS_ctx.spaces.length === 1 ? 'space' : 'spaces');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex gap-2" },
});
const __VLS_0 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    icon: "pi pi-cog",
    label: (__VLS_ctx.$t('kb.storyWorkflow')),
    severity: "secondary",
    outlined: true,
    size: "small",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    icon: "pi pi-cog",
    label: (__VLS_ctx.$t('kb.storyWorkflow')),
    severity: "secondary",
    outlined: true,
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.router.push({ name: 'story-workflow-settings', params: { projectId: __VLS_ctx.projectId } });
    }
};
var __VLS_3;
const __VLS_8 = {}.Button;
/** @type {[typeof __VLS_components.Button, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('kb.createSpace')),
    icon: "pi pi-plus",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
    label: (__VLS_ctx.$t('kb.createSpace')),
    icon: "pi pi-plus",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.openCreateDialog)
};
var __VLS_11;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_16 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
    const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-section mb-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-wrapper" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: "pi pi-search search-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onInput: (__VLS_ctx.onSearchInput) },
        value: (__VLS_ctx.searchQuery),
        type: "text",
        ...{ class: "search-input" },
        placeholder: (__VLS_ctx.$t('kb.searchAll')),
    });
    if (__VLS_ctx.searching) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-spin pi-spinner search-spinner" },
        });
    }
    if (__VLS_ctx.searchQuery.trim() && !__VLS_ctx.searching && __VLS_ctx.searchResults.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-results-dropdown" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "px-4 py-3 text-color-secondary text-sm" },
        });
        (__VLS_ctx.$t('kb.noResults'));
    }
    if (__VLS_ctx.searchResults.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-results-dropdown" },
        });
        for (const [r] of __VLS_getVForSourceType((__VLS_ctx.searchResults))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.searchResults.length > 0))
                            return;
                        __VLS_ctx.selectSearchResult(r);
                    } },
                key: (r.id),
                ...{ class: "search-result-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex align-items-center gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "font-semibold text-sm" },
            });
            (r.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "result-space-badge" },
            });
            (r.space_name);
            if (r.headline) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                    ...{ class: "text-xs text-color-secondary mt-1 search-headline" },
                });
                __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (r.headline) }, null, null);
            }
        }
    }
    if (__VLS_ctx.recentPages.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-section mb-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-clock" },
        });
        (__VLS_ctx.$t('kb.recentlyUpdated'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "recent-grid" },
        });
        for (const [page] of __VLS_getVForSourceType((__VLS_ctx.recentPages))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.recentPages.length > 0))
                            return;
                        __VLS_ctx.navigateToRecentPage(page);
                    } },
                key: (page.id),
                ...{ class: "recent-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "recent-card-title" },
            });
            (page.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "recent-card-meta" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "recent-space-badge" },
            });
            (page.space_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "recent-time" },
            });
            (__VLS_ctx.relativeTime(page.updated_at));
            if (page.last_edited_by_name) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "recent-card-editor" },
                });
                (page.last_edited_by_name);
            }
        }
    }
    if (__VLS_ctx.spaces.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state text-center py-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-book text-4xl text-color-secondary mb-3" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-color-secondary" },
        });
        (__VLS_ctx.$t('kb.emptySpaces'));
        const __VLS_20 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('kb.createFirstSpace')),
            icon: "pi pi-plus",
            ...{ class: "mt-3" },
        }));
        const __VLS_22 = __VLS_21({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('kb.createFirstSpace')),
            icon: "pi pi-plus",
            ...{ class: "mt-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        let __VLS_24;
        let __VLS_25;
        let __VLS_26;
        const __VLS_27 = {
            onClick: (__VLS_ctx.openCreateDialog)
        };
        var __VLS_23;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "section-title mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-th-large" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-grid" },
        });
        for (const [space] of __VLS_getVForSourceType((__VLS_ctx.spaces))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(__VLS_ctx.spaces.length === 0))
                            return;
                        __VLS_ctx.navigateToSpace(space);
                    } },
                key: (space.id),
                ...{ class: "space-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-icon-wrapper" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: (__VLS_ctx.spaceIcon(space)) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-card-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "space-card-name" },
            });
            (space.name);
            if (space.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "space-card-desc" },
                });
                (space.description);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-card-footer" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-stat" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-file" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (space.page_count);
            (__VLS_ctx.$t('kb.pages'));
            if (space.contributor_count > 0) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "space-stat" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                    ...{ class: "pi pi-users" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (space.contributor_count);
            }
            if (space.last_updated_at) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "space-stat ml-auto" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-color-secondary" },
                });
                (__VLS_ctx.relativeTime(space.last_updated_at));
            }
        }
    }
}
const __VLS_28 = {}.Dialog;
/** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('kb.createSpace')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}));
const __VLS_30 = __VLS_29({
    visible: (__VLS_ctx.showCreateDialog),
    header: (__VLS_ctx.$t('kb.createSpace')),
    modal: true,
    ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-column gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('kb.spaceName'));
const __VLS_32 = {}.InputText;
/** @type {[typeof __VLS_components.InputText, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.newSpace.name),
    ...{ class: "w-full" },
    autofocus: true,
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.newSpace.name),
    ...{ class: "w-full" },
    autofocus: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('kb.spaceDescription'));
const __VLS_36 = {}.Textarea;
/** @type {[typeof __VLS_components.Textarea, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    modelValue: (__VLS_ctx.newSpace.description),
    ...{ class: "w-full" },
    rows: "3",
}));
const __VLS_38 = __VLS_37({
    modelValue: (__VLS_ctx.newSpace.description),
    ...{ class: "w-full" },
    rows: "3",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "icon-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "block text-sm font-semibold mb-1" },
});
(__VLS_ctx.$t('kb.spaceIcon'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleIconPicker) },
    type: "button",
    ...{ class: "icon-select-trigger" },
});
if (__VLS_ctx.newSpace.icon) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
        ...{ class: ('pi pi-' + __VLS_ctx.newSpace.icon) },
        ...{ class: "icon-select-preview" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "icon-select-placeholder" },
    });
    (__VLS_ctx.$t('kb.chooseIcon'));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
    ...{ class: "pi pi-chevron-down icon-select-chevron" },
    ...{ class: ({ open: __VLS_ctx.iconPickerOpen }) },
});
if (__VLS_ctx.iconPickerOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "icon-picker-dropdown" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "icon-picker-grid" },
    });
    for (const [icon] of __VLS_getVForSourceType((__VLS_ctx.iconOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.iconPickerOpen))
                        return;
                    __VLS_ctx.selectIcon(icon);
                } },
            key: (icon),
            type: "button",
            ...{ class: "icon-picker-btn" },
            ...{ class: ({ selected: __VLS_ctx.newSpace.icon === icon }) },
            title: (icon),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: ('pi pi-' + icon) },
        });
    }
}
{
    const { footer: __VLS_thisSlot } = __VLS_31.slots;
    const __VLS_40 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('kb.cancel')),
        severity: "secondary",
        text: true,
    }));
    const __VLS_42 = __VLS_41({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.$t('kb.cancel')),
        severity: "secondary",
        text: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    let __VLS_44;
    let __VLS_45;
    let __VLS_46;
    const __VLS_47 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showCreateDialog = false;
        }
    };
    var __VLS_43;
    const __VLS_48 = {}.Button;
    /** @type {[typeof __VLS_components.Button, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.saving ? __VLS_ctx.$t('kb.creating') : __VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
        disabled: (!__VLS_ctx.newSpace.name.trim()),
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        label: (__VLS_ctx.saving ? __VLS_ctx.$t('kb.creating') : __VLS_ctx.$t('common.create')),
        icon: "pi pi-check",
        loading: (__VLS_ctx.saving),
        disabled: (!__VLS_ctx.newSpace.name.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (__VLS_ctx.onCreate)
    };
    var __VLS_51;
}
var __VLS_31;
/** @type {__VLS_StyleScopedClasses['kb-space-list']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['search-section']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
/** @type {__VLS_StyleScopedClasses['search-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['search-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['search-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['search-results-dropdown']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['search-results-dropdown']} */ ;
/** @type {__VLS_StyleScopedClasses['search-result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['result-space-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['search-headline']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-section']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-clock']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-card']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-space-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-time']} */ ;
/** @type {__VLS_StyleScopedClasses['recent-card-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-book']} */ ;
/** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-th-large']} */ ;
/** @type {__VLS_StyleScopedClasses['space-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['space-icon-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card-info']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['space-card-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-file']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-users']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['icon-field']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-select-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-select-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-select-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-chevron-down']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-select-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-picker-dropdown']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-picker-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-picker-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            ProgressSpinner: ProgressSpinner,
            router: router,
            projectId: projectId,
            spaces: spaces,
            recentPages: recentPages,
            loading: loading,
            showCreateDialog: showCreateDialog,
            saving: saving,
            newSpace: newSpace,
            iconPickerOpen: iconPickerOpen,
            searchQuery: searchQuery,
            searchResults: searchResults,
            searching: searching,
            iconOptions: iconOptions,
            onSearchInput: onSearchInput,
            selectSearchResult: selectSearchResult,
            openCreateDialog: openCreateDialog,
            onCreate: onCreate,
            navigateToSpace: navigateToSpace,
            navigateToRecentPage: navigateToRecentPage,
            toggleIconPicker: toggleIconPicker,
            selectIcon: selectIcon,
            spaceIcon: spaceIcon,
            relativeTime: relativeTime,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
