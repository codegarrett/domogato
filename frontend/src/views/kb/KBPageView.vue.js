import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getSpace, getPageTree, getPage, createPage, updatePage, deletePage, getPageAncestors, } from '@/api/kb';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { strikethrough, taskListItems } from 'turndown-plugin-gfm';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import Breadcrumb from 'primevue/breadcrumb';
import Select from 'primevue/select';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import RichTextEditor from '@/components/editor/RichTextEditor.vue';
import KBVersionHistory from '@/components/kb/KBVersionHistory.vue';
import KBComments from '@/components/kb/KBComments.vue';
import KBTemplatePicker from '@/components/kb/KBTemplatePicker.vue';
import StoryStatusBar from '@/components/kb/StoryStatusBar.vue';
import StoryTicketLinks from '@/components/kb/StoryTicketLinks.vue';
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const projectId = computed(() => route.params.projectId);
const spaceSlug = computed(() => route.params.spaceSlug);
const pageSlug = computed(() => route.params.pageSlug || null);
const space = ref(null);
const pageTree = ref([]);
const activePage = ref(null);
const ancestors = ref([]);
const loading = ref(true);
const loadingPage = ref(false);
const renderedHtml = computed(() => {
    if (!activePage.value)
        return '';
    const html = activePage.value.content_html || '';
    if (html)
        return html;
    const md = activePage.value.content_markdown || '';
    if (md)
        return marked.parse(md, { async: false });
    return '';
});
const editingTitle = ref(false);
const titleDraft = ref('');
const isEditing = ref(false);
const editorContent = ref('');
const markdownDraft = ref('');
const editorMode = ref('wysiwyg');
const savingContent = ref(false);
const showCreateDialog = ref(false);
const showTemplatePicker = ref(false);
const savingPage = ref(false);
const newPage = ref({ title: '', parent_page_id: '', content_markdown: '', content_html: '', page_type: '' });
// ── Breadcrumb model ──
const breadcrumbHome = computed(() => ({
    icon: 'pi pi-book',
    command: () => router.push({
        name: 'kb-space',
        params: { projectId: projectId.value, spaceSlug: spaceSlug.value },
    }),
}));
const breadcrumbItems = computed(() => ancestors.value.map((a) => ({
    label: a.title,
    command: () => navigateToPage(a.slug),
})));
// ── Flat list for parent page dropdown ──
function flattenTree(nodes) {
    const result = [];
    function walk(items, depth) {
        for (const n of items) {
            result.push({ label: '\u00A0'.repeat(depth * 2) + n.title, value: n.id });
            if (n.children.length)
                walk(n.children, depth + 1);
        }
    }
    walk(nodes, 0);
    return result;
}
const parentPageOptions = computed(() => [
    { label: t('kb.noneTopLevel'), value: '' },
    ...flattenTree(pageTree.value),
]);
// ── Flat page list for space summary ──
function flattenPagesForSummary(nodes, depth = 0) {
    const result = [];
    for (const n of nodes) {
        result.push({ id: n.id, title: n.title, slug: n.slug, depth, hasChildren: n.children.length > 0 });
        if (n.children.length) {
            result.push(...flattenPagesForSummary(n.children, depth + 1));
        }
    }
    return result;
}
const flatPages = computed(() => flattenPagesForSummary(pageTree.value));
const totalPageCount = computed(() => flatPages.value.length);
// ── Data loading ──
async function loadSpace() {
    loading.value = true;
    try {
        space.value = await getSpace(projectId.value, spaceSlug.value);
        pageTree.value = await getPageTree(space.value.id);
        if (pageSlug.value) {
            await loadPageBySlug(pageSlug.value);
        }
        else {
            activePage.value = null;
            ancestors.value = [];
        }
    }
    finally {
        loading.value = false;
    }
}
function findNodeBySlug(nodes, slug) {
    for (const n of nodes) {
        if (n.slug === slug)
            return n;
        const found = findNodeBySlug(n.children, slug);
        if (found)
            return found;
    }
    return null;
}
async function loadPageBySlug(slug) {
    const node = findNodeBySlug(pageTree.value, slug);
    if (!node) {
        activePage.value = null;
        ancestors.value = [];
        return;
    }
    loadingPage.value = true;
    try {
        activePage.value = await getPage(node.id);
        ancestors.value = await getPageAncestors(node.id);
    }
    finally {
        loadingPage.value = false;
    }
}
watch(() => route.params.pageSlug, async (newSlug) => {
    isEditing.value = false;
    if (!newSlug) {
        activePage.value = null;
        ancestors.value = [];
        return;
    }
    if (pageTree.value.length) {
        await loadPageBySlug(newSlug);
    }
});
watch(() => route.params.spaceSlug, () => loadSpace());
// ── Title editing ──
function startEditTitle() {
    if (!activePage.value)
        return;
    titleDraft.value = activePage.value.title;
    editingTitle.value = true;
}
async function saveTitle() {
    editingTitle.value = false;
    if (!activePage.value || titleDraft.value.trim() === activePage.value.title)
        return;
    const title = titleDraft.value.trim();
    if (!title)
        return;
    try {
        activePage.value = await updatePage(activePage.value.id, { title });
        pageTree.value = await getPageTree(space.value.id);
    }
    catch {
        /* handled by global interceptor */
    }
}
// ── Create page ──
function openCreateDialog() {
    newPage.value = { title: '', parent_page_id: '', content_markdown: '', content_html: '', page_type: '' };
    showTemplatePicker.value = true;
}
function onTemplateSelected(template) {
    const md = template.content_markdown || '';
    newPage.value.content_markdown = md;
    newPage.value.content_html = template.content_html || (md ? marked.parse(md, { async: false }) : '');
    newPage.value.page_type = template.page_type || '';
    showTemplatePicker.value = false;
    showCreateDialog.value = true;
}
function skipTemplate() {
    showTemplatePicker.value = false;
    showCreateDialog.value = true;
}
async function onCreatePage() {
    const title = newPage.value.title.trim();
    if (!title || !space.value)
        return;
    savingPage.value = true;
    try {
        const body = { title };
        if (newPage.value.parent_page_id)
            body.parent_page_id = newPage.value.parent_page_id;
        if (newPage.value.content_markdown)
            body.content_markdown = newPage.value.content_markdown;
        if (newPage.value.content_html)
            body.content_html = newPage.value.content_html;
        if (newPage.value.page_type)
            body.page_type = newPage.value.page_type;
        const created = await createPage(space.value.id, body);
        showCreateDialog.value = false;
        pageTree.value = await getPageTree(space.value.id);
        router.push({
            name: 'kb-page',
            params: { projectId: projectId.value, spaceSlug: spaceSlug.value, pageSlug: created.slug },
        });
    }
    finally {
        savingPage.value = false;
    }
}
// ── Delete page ──
async function onDeletePage() {
    if (!activePage.value || !space.value)
        return;
    if (!confirm(t('kb.confirmDelete')))
        return;
    try {
        await deletePage(activePage.value.id);
        activePage.value = null;
        ancestors.value = [];
        pageTree.value = await getPageTree(space.value.id);
        router.push({
            name: 'kb-space',
            params: { projectId: projectId.value, spaceSlug: spaceSlug.value },
        });
    }
    catch {
        /* handled by global interceptor */
    }
}
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.use(strikethrough);
turndown.use(taskListItems);
function cellText(cell) {
    const p = cell.querySelector('p');
    return (p ? p.textContent : cell.textContent)?.trim() ?? '';
}
turndown.addRule('tiptapTable', {
    filter: 'table',
    replacement(_content, node) {
        const el = node;
        const rows = Array.from(el.querySelectorAll('tr'));
        if (!rows.length)
            return '';
        const matrix = rows.map((row) => Array.from(row.querySelectorAll('th, td')).map((c) => cellText(c)));
        const colCount = Math.max(...matrix.map((r) => r.length));
        const colWidths = Array.from({ length: colCount }, (_, ci) => Math.max(3, ...matrix.map((r) => (r[ci] ?? '').length)));
        const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
        const formatRow = (cells) => '| ' + Array.from({ length: colCount }, (_, i) => pad(cells[i] ?? '', colWidths[i] ?? 0)).join(' | ') + ' |';
        const headerRow = rows[0]?.querySelector('th') ? 0 : -1;
        const lines = [];
        if (headerRow === 0) {
            lines.push(formatRow(matrix[0] ?? []));
            lines.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
            for (let i = 1; i < matrix.length; i++)
                lines.push(formatRow(matrix[i] ?? []));
        }
        else {
            const emptyHeader = Array.from({ length: colCount }, () => '');
            lines.push(formatRow(emptyHeader));
            lines.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |');
            for (const row of matrix)
                lines.push(formatRow(row));
        }
        return '\n\n' + lines.join('\n') + '\n\n';
    },
});
turndown.remove('colgroup');
function startEditing() {
    if (!activePage.value)
        return;
    const html = activePage.value.content_html || '';
    const md = activePage.value.content_markdown || '';
    editorContent.value = html || (md ? marked.parse(md, { async: false }) : '');
    markdownDraft.value = md || (html ? turndown.turndown(html) : '');
    isEditing.value = true;
    editorMode.value = 'wysiwyg';
}
function cancelEditing() {
    isEditing.value = false;
}
function switchToWysiwyg() {
    if (editorMode.value === 'wysiwyg')
        return;
    if (markdownDraft.value.trim()) {
        editorContent.value = marked.parse(markdownDraft.value, { async: false });
    }
    editorMode.value = 'wysiwyg';
}
function switchToMarkdown() {
    if (editorMode.value === 'markdown')
        return;
    if (editorContent.value.trim()) {
        markdownDraft.value = turndown.turndown(editorContent.value);
    }
    editorMode.value = 'markdown';
}
async function onVersionRestored() {
    if (!activePage.value)
        return;
    activePage.value = await getPage(activePage.value.id);
    if (space.value)
        pageTree.value = await getPageTree(space.value.id);
}
async function saveContent() {
    if (!activePage.value)
        return;
    savingContent.value = true;
    try {
        const body = {};
        if (editorMode.value === 'wysiwyg') {
            body.content_html = editorContent.value;
            body.content_markdown = turndown.turndown(editorContent.value);
        }
        else {
            body.content_markdown = markdownDraft.value;
            body.content_html = marked.parse(markdownDraft.value, { async: false });
        }
        activePage.value = await updatePage(activePage.value.id, body);
        isEditing.value = false;
    }
    finally {
        savingContent.value = false;
    }
}
function onStoryMetaUpdated(updated) {
    if (activePage.value) {
        activePage.value = { ...activePage.value, meta: updated };
    }
}
function navigateToPage(slug) {
    router.push({
        name: 'kb-page',
        params: { projectId: projectId.value, spaceSlug: spaceSlug.value, pageSlug: slug },
    });
}
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function relativeTime(dateStr) {
    if (!dateStr)
        return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return t('tickets.timeAgo.justNow');
    if (mins < 60)
        return t('tickets.timeAgo.minutesAgo', { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return t('tickets.timeAgo.hoursAgo', { n: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 30)
        return t('tickets.timeAgo.daysAgo', { n: days });
    return t('tickets.timeAgo.monthsAgo', { n: Math.floor(days / 30) });
}
// React to ?newpage query param from sidebar buttons
watch(() => route.query.newpage, (val) => {
    if (val === '1') {
        router.replace({ query: {} });
        openCreateDialog();
    }
}, { immediate: true });
onMounted(loadSpace);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['page-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['page-list-link']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-content-center py-6" },
    });
    const __VLS_0 = {}.ProgressSpinner;
    /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.space) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "kb-view" },
    });
    if (__VLS_ctx.loadingPage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex justify-content-center py-6" },
        });
        const __VLS_4 = {}.ProgressSpinner;
        /** @type {[typeof __VLS_components.ProgressSpinner, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
        const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
    else if (__VLS_ctx.activePage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "page-content" },
        });
        if (__VLS_ctx.ancestors.length) {
            const __VLS_8 = {}.Breadcrumb;
            /** @type {[typeof __VLS_components.Breadcrumb, ]} */ ;
            // @ts-ignore
            const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                home: (__VLS_ctx.breadcrumbHome),
                model: (__VLS_ctx.breadcrumbItems),
                ...{ class: "mb-3" },
            }));
            const __VLS_10 = __VLS_9({
                home: (__VLS_ctx.breadcrumbHome),
                model: (__VLS_ctx.breadcrumbItems),
                ...{ class: "mb-3" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "page-header mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex align-items-center gap-2" },
        });
        if (!__VLS_ctx.editingTitle) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
                ...{ onClick: (__VLS_ctx.startEditTitle) },
                ...{ class: "page-title m-0 cursor-pointer flex-1" },
                title: (__VLS_ctx.$t('kb.editTitle')),
            });
            (__VLS_ctx.activePage.title);
        }
        else {
            const __VLS_12 = {}.InputText;
            /** @type {[typeof __VLS_components.InputText, ]} */ ;
            // @ts-ignore
            const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
                ...{ 'onBlur': {} },
                ...{ 'onKeyup': {} },
                modelValue: (__VLS_ctx.titleDraft),
                ...{ class: "w-full text-2xl font-bold flex-1" },
                autofocus: true,
            }));
            const __VLS_14 = __VLS_13({
                ...{ 'onBlur': {} },
                ...{ 'onKeyup': {} },
                modelValue: (__VLS_ctx.titleDraft),
                ...{ class: "w-full text-2xl font-bold flex-1" },
                autofocus: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_13));
            let __VLS_16;
            let __VLS_17;
            let __VLS_18;
            const __VLS_19 = {
                onBlur: (__VLS_ctx.saveTitle)
            };
            const __VLS_20 = {
                onKeyup: (__VLS_ctx.saveTitle)
            };
            var __VLS_15;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex gap-1" },
        });
        if (!__VLS_ctx.isEditing) {
            const __VLS_21 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
                ...{ 'onClick': {} },
                icon: "pi pi-pencil",
                severity: "secondary",
                text: true,
                rounded: true,
                size: "small",
                title: (__VLS_ctx.$t('common.edit')),
            }));
            const __VLS_23 = __VLS_22({
                ...{ 'onClick': {} },
                icon: "pi pi-pencil",
                severity: "secondary",
                text: true,
                rounded: true,
                size: "small",
                title: (__VLS_ctx.$t('common.edit')),
            }, ...__VLS_functionalComponentArgsRest(__VLS_22));
            let __VLS_25;
            let __VLS_26;
            let __VLS_27;
            const __VLS_28 = {
                onClick: (__VLS_ctx.startEditing)
            };
            var __VLS_24;
        }
        const __VLS_29 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
            ...{ 'onClick': {} },
            icon: "pi pi-trash",
            severity: "danger",
            text: true,
            rounded: true,
            size: "small",
        }));
        const __VLS_31 = __VLS_30({
            ...{ 'onClick': {} },
            icon: "pi pi-trash",
            severity: "danger",
            text: true,
            rounded: true,
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_30));
        let __VLS_33;
        let __VLS_34;
        let __VLS_35;
        const __VLS_36 = {
            onClick: (__VLS_ctx.onDeletePage)
        };
        var __VLS_32;
        if (__VLS_ctx.activePage.meta?.page_type === 'user_story') {
            /** @type {[typeof StoryStatusBar, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(StoryStatusBar, new StoryStatusBar({
                ...{ 'onUpdated': {} },
                pageId: (__VLS_ctx.activePage.id),
                projectId: (__VLS_ctx.projectId),
                meta: (__VLS_ctx.activePage.meta),
            }));
            const __VLS_38 = __VLS_37({
                ...{ 'onUpdated': {} },
                pageId: (__VLS_ctx.activePage.id),
                projectId: (__VLS_ctx.projectId),
                meta: (__VLS_ctx.activePage.meta),
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            let __VLS_40;
            let __VLS_41;
            let __VLS_42;
            const __VLS_43 = {
                onUpdated: (__VLS_ctx.onStoryMetaUpdated)
            };
            var __VLS_39;
        }
        if (__VLS_ctx.isEditing) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "editor-area" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "editor-toolbar-row flex align-items-center gap-2 mb-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex gap-1" },
            });
            const __VLS_44 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
                ...{ 'onClick': {} },
                label: ('WYSIWYG'),
                size: "small",
                severity: (__VLS_ctx.editorMode === 'wysiwyg' ? 'primary' : 'secondary'),
                text: (__VLS_ctx.editorMode !== 'wysiwyg'),
            }));
            const __VLS_46 = __VLS_45({
                ...{ 'onClick': {} },
                label: ('WYSIWYG'),
                size: "small",
                severity: (__VLS_ctx.editorMode === 'wysiwyg' ? 'primary' : 'secondary'),
                text: (__VLS_ctx.editorMode !== 'wysiwyg'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_45));
            let __VLS_48;
            let __VLS_49;
            let __VLS_50;
            const __VLS_51 = {
                onClick: (__VLS_ctx.switchToWysiwyg)
            };
            var __VLS_47;
            const __VLS_52 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                ...{ 'onClick': {} },
                label: "Markdown",
                size: "small",
                severity: (__VLS_ctx.editorMode === 'markdown' ? 'primary' : 'secondary'),
                text: (__VLS_ctx.editorMode !== 'markdown'),
            }));
            const __VLS_54 = __VLS_53({
                ...{ 'onClick': {} },
                label: "Markdown",
                size: "small",
                severity: (__VLS_ctx.editorMode === 'markdown' ? 'primary' : 'secondary'),
                text: (__VLS_ctx.editorMode !== 'markdown'),
            }, ...__VLS_functionalComponentArgsRest(__VLS_53));
            let __VLS_56;
            let __VLS_57;
            let __VLS_58;
            const __VLS_59 = {
                onClick: (__VLS_ctx.switchToMarkdown)
            };
            var __VLS_55;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ class: "flex-1" },
            });
            const __VLS_60 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                ...{ 'onClick': {} },
                label: (__VLS_ctx.$t('kb.cancel')),
                severity: "secondary",
                size: "small",
                text: true,
            }));
            const __VLS_62 = __VLS_61({
                ...{ 'onClick': {} },
                label: (__VLS_ctx.$t('kb.cancel')),
                severity: "secondary",
                size: "small",
                text: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            let __VLS_64;
            let __VLS_65;
            let __VLS_66;
            const __VLS_67 = {
                onClick: (__VLS_ctx.cancelEditing)
            };
            var __VLS_63;
            const __VLS_68 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
                ...{ 'onClick': {} },
                label: (__VLS_ctx.$t('kb.save')),
                icon: "pi pi-check",
                size: "small",
                loading: (__VLS_ctx.savingContent),
            }));
            const __VLS_70 = __VLS_69({
                ...{ 'onClick': {} },
                label: (__VLS_ctx.$t('kb.save')),
                icon: "pi pi-check",
                size: "small",
                loading: (__VLS_ctx.savingContent),
            }, ...__VLS_functionalComponentArgsRest(__VLS_69));
            let __VLS_72;
            let __VLS_73;
            let __VLS_74;
            const __VLS_75 = {
                onClick: (__VLS_ctx.saveContent)
            };
            var __VLS_71;
            if (__VLS_ctx.editorMode === 'wysiwyg') {
                /** @type {[typeof RichTextEditor, ]} */ ;
                // @ts-ignore
                const __VLS_76 = __VLS_asFunctionalComponent(RichTextEditor, new RichTextEditor({
                    modelValue: (__VLS_ctx.editorContent),
                    placeholder: "Start writing...",
                }));
                const __VLS_77 = __VLS_76({
                    modelValue: (__VLS_ctx.editorContent),
                    placeholder: "Start writing...",
                }, ...__VLS_functionalComponentArgsRest(__VLS_76));
            }
            else {
                const __VLS_79 = {}.Textarea;
                /** @type {[typeof __VLS_components.Textarea, ]} */ ;
                // @ts-ignore
                const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
                    modelValue: (__VLS_ctx.markdownDraft),
                    ...{ class: "w-full markdown-editor" },
                    rows: (20),
                    autoResize: true,
                }));
                const __VLS_81 = __VLS_80({
                    modelValue: (__VLS_ctx.markdownDraft),
                    ...{ class: "w-full markdown-editor" },
                    rows: (20),
                    autoResize: true,
                }, ...__VLS_functionalComponentArgsRest(__VLS_80));
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
                ...{ onDblclick: (__VLS_ctx.startEditing) },
                ...{ class: "prose cursor-pointer" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderedHtml || `<p class='text-color-secondary'>Click the edit button to start writing...</p>`) }, null, null);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "page-meta mt-6 mb-6 text-xs text-color-secondary" },
        });
        (__VLS_ctx.formatDate(__VLS_ctx.activePage.updated_at));
        const __VLS_83 = {}.TabView;
        /** @type {[typeof __VLS_components.TabView, typeof __VLS_components.TabView, ]} */ ;
        // @ts-ignore
        const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
            ...{ class: "page-tabs" },
        }));
        const __VLS_85 = __VLS_84({
            ...{ class: "page-tabs" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_84));
        __VLS_86.slots.default;
        if (__VLS_ctx.activePage.meta?.page_type === 'user_story') {
            const __VLS_87 = {}.TabPanel;
            /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
            // @ts-ignore
            const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
                value: "0",
                header: (__VLS_ctx.$t('kb.linkedTickets')),
            }));
            const __VLS_89 = __VLS_88({
                value: "0",
                header: (__VLS_ctx.$t('kb.linkedTickets')),
            }, ...__VLS_functionalComponentArgsRest(__VLS_88));
            __VLS_90.slots.default;
            /** @type {[typeof StoryTicketLinks, ]} */ ;
            // @ts-ignore
            const __VLS_91 = __VLS_asFunctionalComponent(StoryTicketLinks, new StoryTicketLinks({
                pageId: (__VLS_ctx.activePage.id),
                projectId: (__VLS_ctx.projectId),
            }));
            const __VLS_92 = __VLS_91({
                pageId: (__VLS_ctx.activePage.id),
                projectId: (__VLS_ctx.projectId),
            }, ...__VLS_functionalComponentArgsRest(__VLS_91));
            var __VLS_90;
        }
        const __VLS_94 = {}.TabPanel;
        /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
        // @ts-ignore
        const __VLS_95 = __VLS_asFunctionalComponent(__VLS_94, new __VLS_94({
            value: "1",
            header: (__VLS_ctx.$t('kb.versions')),
        }));
        const __VLS_96 = __VLS_95({
            value: "1",
            header: (__VLS_ctx.$t('kb.versions')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_95));
        __VLS_97.slots.default;
        /** @type {[typeof KBVersionHistory, ]} */ ;
        // @ts-ignore
        const __VLS_98 = __VLS_asFunctionalComponent(KBVersionHistory, new KBVersionHistory({
            ...{ 'onRestored': {} },
            pageId: (__VLS_ctx.activePage.id),
        }));
        const __VLS_99 = __VLS_98({
            ...{ 'onRestored': {} },
            pageId: (__VLS_ctx.activePage.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_98));
        let __VLS_101;
        let __VLS_102;
        let __VLS_103;
        const __VLS_104 = {
            onRestored: (__VLS_ctx.onVersionRestored)
        };
        var __VLS_100;
        var __VLS_97;
        const __VLS_105 = {}.TabPanel;
        /** @type {[typeof __VLS_components.TabPanel, typeof __VLS_components.TabPanel, ]} */ ;
        // @ts-ignore
        const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
            value: "2",
            header: (__VLS_ctx.$t('kb.comments')),
        }));
        const __VLS_107 = __VLS_106({
            value: "2",
            header: (__VLS_ctx.$t('kb.comments')),
        }, ...__VLS_functionalComponentArgsRest(__VLS_106));
        __VLS_108.slots.default;
        /** @type {[typeof KBComments, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(KBComments, new KBComments({
            pageId: (__VLS_ctx.activePage.id),
        }));
        const __VLS_110 = __VLS_109({
            pageId: (__VLS_ctx.activePage.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        var __VLS_108;
        var __VLS_86;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-summary-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-summary-title-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
            ...{ class: "space-summary-title" },
        });
        (__VLS_ctx.space.name);
        const __VLS_112 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('kb.newPage')),
            icon: "pi pi-plus",
            size: "small",
        }));
        const __VLS_114 = __VLS_113({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('kb.newPage')),
            icon: "pi pi-plus",
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_113));
        let __VLS_116;
        let __VLS_117;
        let __VLS_118;
        const __VLS_119 = {
            onClick: (__VLS_ctx.openCreateDialog)
        };
        var __VLS_115;
        if (__VLS_ctx.space.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "space-summary-desc" },
            });
            (__VLS_ctx.space.description);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-stats" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-stat" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-file" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "space-stat-value" },
        });
        (__VLS_ctx.totalPageCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "space-stat-label" },
        });
        (__VLS_ctx.$t('kb.pages'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "space-stat" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
            ...{ class: "pi pi-users" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "space-stat-value" },
        });
        (__VLS_ctx.space.contributor_count);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "space-stat-label" },
        });
        (__VLS_ctx.$t('kb.contributors'));
        if (__VLS_ctx.space.last_updated_at) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-stat" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-clock" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "space-stat-label" },
            });
            (__VLS_ctx.$t('kb.updatedAgo', { time: __VLS_ctx.relativeTime(__VLS_ctx.space.last_updated_at) }));
        }
        if (__VLS_ctx.flatPages.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-page-list" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: "space-page-list-title" },
            });
            (__VLS_ctx.$t('kb.allPages'));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "page-list" },
            });
            for (const [pg] of __VLS_getVForSourceType((__VLS_ctx.flatPages))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (pg.id),
                    ...{ class: "page-list-item" },
                    ...{ style: ({ paddingLeft: (pg.depth * 1.25 + 0.75) + 'rem' }) },
                });
                const __VLS_120 = {}.RouterLink;
                /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
                // @ts-ignore
                const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
                    to: ({ name: 'kb-page', params: { projectId: __VLS_ctx.projectId, spaceSlug: __VLS_ctx.spaceSlug, pageSlug: pg.slug } }),
                    ...{ class: "page-list-link" },
                }));
                const __VLS_122 = __VLS_121({
                    to: ({ name: 'kb-page', params: { projectId: __VLS_ctx.projectId, spaceSlug: __VLS_ctx.spaceSlug, pageSlug: pg.slug } }),
                    ...{ class: "page-list-link" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_121));
                __VLS_123.slots.default;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                    ...{ class: "pi" },
                    ...{ class: (pg.hasChildren ? 'pi-folder' : 'pi-file') },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (pg.title);
                var __VLS_123;
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "space-empty" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i)({
                ...{ class: "pi pi-file-edit space-empty-icon" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.$t('kb.noPages'));
            const __VLS_124 = {}.Button;
            /** @type {[typeof __VLS_components.Button, ]} */ ;
            // @ts-ignore
            const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
                ...{ 'onClick': {} },
                label: (__VLS_ctx.$t('kb.newPage')),
                icon: "pi pi-plus",
                size: "small",
            }));
            const __VLS_126 = __VLS_125({
                ...{ 'onClick': {} },
                label: (__VLS_ctx.$t('kb.newPage')),
                icon: "pi pi-plus",
                size: "small",
            }, ...__VLS_functionalComponentArgsRest(__VLS_125));
            let __VLS_128;
            let __VLS_129;
            let __VLS_130;
            const __VLS_131 = {
                onClick: (__VLS_ctx.openCreateDialog)
            };
            var __VLS_127;
        }
    }
    const __VLS_132 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        visible: (__VLS_ctx.showTemplatePicker),
        header: (__VLS_ctx.$t('kb.templates')),
        modal: true,
        ...{ style: ({ width: '40rem', maxWidth: '95vw' }) },
    }));
    const __VLS_134 = __VLS_133({
        visible: (__VLS_ctx.showTemplatePicker),
        header: (__VLS_ctx.$t('kb.templates')),
        modal: true,
        ...{ style: ({ width: '40rem', maxWidth: '95vw' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    /** @type {[typeof KBTemplatePicker, ]} */ ;
    // @ts-ignore
    const __VLS_136 = __VLS_asFunctionalComponent(KBTemplatePicker, new KBTemplatePicker({
        ...{ 'onSelect': {} },
        ...{ 'onCancel': {} },
        projectId: (__VLS_ctx.projectId),
    }));
    const __VLS_137 = __VLS_136({
        ...{ 'onSelect': {} },
        ...{ 'onCancel': {} },
        projectId: (__VLS_ctx.projectId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_136));
    let __VLS_139;
    let __VLS_140;
    let __VLS_141;
    const __VLS_142 = {
        onSelect: (__VLS_ctx.onTemplateSelected)
    };
    const __VLS_143 = {
        onCancel: (__VLS_ctx.skipTemplate)
    };
    var __VLS_138;
    {
        const { footer: __VLS_thisSlot } = __VLS_135.slots;
        const __VLS_144 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
            ...{ 'onClick': {} },
            label: ('Skip - Blank Page'),
            severity: "secondary",
            text: true,
        }));
        const __VLS_146 = __VLS_145({
            ...{ 'onClick': {} },
            label: ('Skip - Blank Page'),
            severity: "secondary",
            text: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_145));
        let __VLS_148;
        let __VLS_149;
        let __VLS_150;
        const __VLS_151 = {
            onClick: (__VLS_ctx.skipTemplate)
        };
        var __VLS_147;
    }
    var __VLS_135;
    const __VLS_152 = {}.Dialog;
    /** @type {[typeof __VLS_components.Dialog, typeof __VLS_components.Dialog, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        visible: (__VLS_ctx.showCreateDialog),
        header: (__VLS_ctx.$t('kb.newPage')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }));
    const __VLS_154 = __VLS_153({
        visible: (__VLS_ctx.showCreateDialog),
        header: (__VLS_ctx.$t('kb.newPage')),
        modal: true,
        ...{ style: ({ width: '28rem', maxWidth: '95vw' }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex flex-column gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold mb-1" },
    });
    (__VLS_ctx.$t('kb.pageTitle'));
    const __VLS_156 = {}.InputText;
    /** @type {[typeof __VLS_components.InputText, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        modelValue: (__VLS_ctx.newPage.title),
        ...{ class: "w-full" },
        autofocus: true,
    }));
    const __VLS_158 = __VLS_157({
        modelValue: (__VLS_ctx.newPage.title),
        ...{ class: "w-full" },
        autofocus: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "block text-sm font-semibold mb-1" },
    });
    (__VLS_ctx.$t('kb.parentPage'));
    const __VLS_160 = {}.Select;
    /** @type {[typeof __VLS_components.Select, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        modelValue: (__VLS_ctx.newPage.parent_page_id),
        options: (__VLS_ctx.parentPageOptions),
        optionLabel: "label",
        optionValue: "value",
        ...{ class: "w-full" },
    }));
    const __VLS_162 = __VLS_161({
        modelValue: (__VLS_ctx.newPage.parent_page_id),
        options: (__VLS_ctx.parentPageOptions),
        optionLabel: "label",
        optionValue: "value",
        ...{ class: "w-full" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    {
        const { footer: __VLS_thisSlot } = __VLS_155.slots;
        const __VLS_164 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('kb.cancel')),
            severity: "secondary",
            text: true,
        }));
        const __VLS_166 = __VLS_165({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.$t('kb.cancel')),
            severity: "secondary",
            text: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        let __VLS_168;
        let __VLS_169;
        let __VLS_170;
        const __VLS_171 = {
            onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.space))
                    return;
                __VLS_ctx.showCreateDialog = false;
            }
        };
        var __VLS_167;
        const __VLS_172 = {}.Button;
        /** @type {[typeof __VLS_components.Button, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.savingPage ? __VLS_ctx.$t('kb.creating') : __VLS_ctx.$t('common.create')),
            icon: "pi pi-check",
            loading: (__VLS_ctx.savingPage),
            disabled: (!__VLS_ctx.newPage.title.trim()),
        }));
        const __VLS_174 = __VLS_173({
            ...{ 'onClick': {} },
            label: (__VLS_ctx.savingPage ? __VLS_ctx.$t('kb.creating') : __VLS_ctx.$t('common.create')),
            icon: "pi pi-check",
            loading: (__VLS_ctx.savingPage),
            disabled: (!__VLS_ctx.newPage.title.trim()),
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        let __VLS_176;
        let __VLS_177;
        let __VLS_178;
        const __VLS_179 = {
            onClick: (__VLS_ctx.onCreatePage)
        };
        var __VLS_175;
    }
    var __VLS_155;
}
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['kb-view']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-6']} */ ;
/** @type {__VLS_StyleScopedClasses['page-content']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['m-0']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-area']} */ ;
/** @type {__VLS_StyleScopedClasses['editor-toolbar-row']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['prose']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
/** @type {__VLS_StyleScopedClasses['page-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-color-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['page-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['space-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['space-summary-header']} */ ;
/** @type {__VLS_StyleScopedClasses['space-summary-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['space-summary-title']} */ ;
/** @type {__VLS_StyleScopedClasses['space-summary-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-file']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-users']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-clock']} */ ;
/** @type {__VLS_StyleScopedClasses['space-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['space-page-list']} */ ;
/** @type {__VLS_StyleScopedClasses['space-page-list-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-list']} */ ;
/** @type {__VLS_StyleScopedClasses['page-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['page-list-link']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['space-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-file-edit']} */ ;
/** @type {__VLS_StyleScopedClasses['space-empty-icon']} */ ;
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
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Button: Button,
            Dialog: Dialog,
            InputText: InputText,
            Textarea: Textarea,
            ProgressSpinner: ProgressSpinner,
            Breadcrumb: Breadcrumb,
            Select: Select,
            TabView: TabView,
            TabPanel: TabPanel,
            RichTextEditor: RichTextEditor,
            KBVersionHistory: KBVersionHistory,
            KBComments: KBComments,
            KBTemplatePicker: KBTemplatePicker,
            StoryStatusBar: StoryStatusBar,
            StoryTicketLinks: StoryTicketLinks,
            projectId: projectId,
            spaceSlug: spaceSlug,
            space: space,
            activePage: activePage,
            ancestors: ancestors,
            loading: loading,
            loadingPage: loadingPage,
            renderedHtml: renderedHtml,
            editingTitle: editingTitle,
            titleDraft: titleDraft,
            isEditing: isEditing,
            editorContent: editorContent,
            markdownDraft: markdownDraft,
            editorMode: editorMode,
            savingContent: savingContent,
            showCreateDialog: showCreateDialog,
            showTemplatePicker: showTemplatePicker,
            savingPage: savingPage,
            newPage: newPage,
            breadcrumbHome: breadcrumbHome,
            breadcrumbItems: breadcrumbItems,
            parentPageOptions: parentPageOptions,
            flatPages: flatPages,
            totalPageCount: totalPageCount,
            startEditTitle: startEditTitle,
            saveTitle: saveTitle,
            openCreateDialog: openCreateDialog,
            onTemplateSelected: onTemplateSelected,
            skipTemplate: skipTemplate,
            onCreatePage: onCreatePage,
            onDeletePage: onDeletePage,
            startEditing: startEditing,
            cancelEditing: cancelEditing,
            switchToWysiwyg: switchToWysiwyg,
            switchToMarkdown: switchToMarkdown,
            onVersionRestored: onVersionRestored,
            saveContent: saveContent,
            onStoryMetaUpdated: onStoryMetaUpdated,
            formatDate: formatDate,
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
