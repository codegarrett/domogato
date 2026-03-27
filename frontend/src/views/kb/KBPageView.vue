<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getSpace,
  getPageTree,
  getPage,
  createPage,
  updatePage,
  deletePage,
  getPageAncestors,
  type KBSpace,
  type KBPage,
  type PageTreeNode,
  type PageAncestor,
} from '@/api/kb'
import { marked } from 'marked'
import TurndownService from 'turndown'
import { strikethrough, taskListItems } from 'turndown-plugin-gfm'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ProgressSpinner from 'primevue/progressspinner'
import Breadcrumb from 'primevue/breadcrumb'
import Select from 'primevue/select'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import KBVersionHistory from '@/components/kb/KBVersionHistory.vue'
import KBComments from '@/components/kb/KBComments.vue'
import KBTemplatePicker from '@/components/kb/KBTemplatePicker.vue'
import StoryStatusBar from '@/components/kb/StoryStatusBar.vue'
import StoryTicketLinks from '@/components/kb/StoryTicketLinks.vue'
import type { PageMetaBrief } from '@/api/kb'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => route.params.projectId as string)
const spaceSlug = computed(() => route.params.spaceSlug as string)
const pageSlug = computed(() => (route.params.pageSlug as string) || null)

const space = ref<KBSpace | null>(null)
const pageTree = ref<PageTreeNode[]>([])
const activePage = ref<KBPage | null>(null)
const ancestors = ref<PageAncestor[]>([])
const loading = ref(true)
const loadingPage = ref(false)

const renderedHtml = computed(() => {
  if (!activePage.value) return ''
  const html = activePage.value.content_html || ''
  if (html) return html
  const md = activePage.value.content_markdown || ''
  if (md) return marked.parse(md, { async: false }) as string
  return ''
})

const editingTitle = ref(false)
const titleDraft = ref('')

const isEditing = ref(false)
const editorContent = ref('')
const markdownDraft = ref('')
const editorMode = ref<'wysiwyg' | 'markdown'>('wysiwyg')
const savingContent = ref(false)

const showCreateDialog = ref(false)
const showTemplatePicker = ref(false)
const savingPage = ref(false)
const newPage = ref({ title: '', parent_page_id: '', content_markdown: '', content_html: '', page_type: '' })

// ── Breadcrumb model ──
const breadcrumbHome = computed(() => ({
  icon: 'pi pi-book',
  command: () =>
    router.push({
      name: 'kb-space',
      params: { projectId: projectId.value, spaceSlug: spaceSlug.value },
    }),
}))

const breadcrumbItems = computed(() =>
  ancestors.value.map((a) => ({
    label: a.title,
    command: () => navigateToPage(a.slug),
  })),
)

// ── Flat list for parent page dropdown ──
function flattenTree(nodes: PageTreeNode[]): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = []
  function walk(items: PageTreeNode[], depth: number) {
    for (const n of items) {
      result.push({ label: '\u00A0'.repeat(depth * 2) + n.title, value: n.id })
      if (n.children.length) walk(n.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return result
}

const parentPageOptions = computed(() => [
  { label: t('kb.noneTopLevel'), value: '' },
  ...flattenTree(pageTree.value),
])

// ── Flat page list for space summary ──
function flattenPagesForSummary(nodes: PageTreeNode[], depth = 0): { id: string; title: string; slug: string; depth: number; hasChildren: boolean }[] {
  const result: { id: string; title: string; slug: string; depth: number; hasChildren: boolean }[] = []
  for (const n of nodes) {
    result.push({ id: n.id, title: n.title, slug: n.slug, depth, hasChildren: n.children.length > 0 })
    if (n.children.length) {
      result.push(...flattenPagesForSummary(n.children, depth + 1))
    }
  }
  return result
}

const flatPages = computed(() => flattenPagesForSummary(pageTree.value))
const totalPageCount = computed(() => flatPages.value.length)

// ── Data loading ──
async function loadSpace() {
  loading.value = true
  try {
    space.value = await getSpace(projectId.value, spaceSlug.value)
    pageTree.value = await getPageTree(space.value.id)
    if (pageSlug.value) {
      await loadPageBySlug(pageSlug.value)
    } else {
      activePage.value = null
      ancestors.value = []
    }
  } finally {
    loading.value = false
  }
}

function findNodeBySlug(nodes: PageTreeNode[], slug: string): PageTreeNode | null {
  for (const n of nodes) {
    if (n.slug === slug) return n
    const found = findNodeBySlug(n.children, slug)
    if (found) return found
  }
  return null
}

async function loadPageBySlug(slug: string) {
  const node = findNodeBySlug(pageTree.value, slug)
  if (!node) {
    activePage.value = null
    ancestors.value = []
    return
  }
  loadingPage.value = true
  try {
    activePage.value = await getPage(node.id)
    ancestors.value = await getPageAncestors(node.id)
  } finally {
    loadingPage.value = false
  }
}

watch(
  () => route.params.pageSlug,
  async (newSlug) => {
    isEditing.value = false
    if (!newSlug) {
      activePage.value = null
      ancestors.value = []
      return
    }
    if (pageTree.value.length) {
      await loadPageBySlug(newSlug as string)
    }
  },
)

watch(
  () => route.params.spaceSlug,
  () => loadSpace(),
)

// ── Title editing ──
function startEditTitle() {
  if (!activePage.value) return
  titleDraft.value = activePage.value.title
  editingTitle.value = true
}

async function saveTitle() {
  editingTitle.value = false
  if (!activePage.value || titleDraft.value.trim() === activePage.value.title) return
  const title = titleDraft.value.trim()
  if (!title) return
  try {
    activePage.value = await updatePage(activePage.value.id, { title })
    pageTree.value = await getPageTree(space.value!.id)
  } catch {
    /* handled by global interceptor */
  }
}

// ── Create page ──
function openCreateDialog() {
  newPage.value = { title: '', parent_page_id: '', content_markdown: '', content_html: '', page_type: '' }
  showTemplatePicker.value = true
}

function onTemplateSelected(template: { content_markdown: string; content_html: string; page_type?: string | null }) {
  const md = template.content_markdown || ''
  newPage.value.content_markdown = md
  newPage.value.content_html = template.content_html || (md ? marked.parse(md, { async: false }) as string : '')
  newPage.value.page_type = template.page_type || ''
  showTemplatePicker.value = false
  showCreateDialog.value = true
}

function skipTemplate() {
  showTemplatePicker.value = false
  showCreateDialog.value = true
}

async function onCreatePage() {
  const title = newPage.value.title.trim()
  if (!title || !space.value) return
  savingPage.value = true
  try {
    const body: { title: string; parent_page_id?: string; content_markdown?: string; content_html?: string; page_type?: string } = { title }
    if (newPage.value.parent_page_id) body.parent_page_id = newPage.value.parent_page_id
    if (newPage.value.content_markdown) body.content_markdown = newPage.value.content_markdown
    if (newPage.value.content_html) body.content_html = newPage.value.content_html
    if (newPage.value.page_type) body.page_type = newPage.value.page_type
    const created = await createPage(space.value.id, body)
    showCreateDialog.value = false
    pageTree.value = await getPageTree(space.value.id)
    router.push({
      name: 'kb-page',
      params: { projectId: projectId.value, spaceSlug: spaceSlug.value, pageSlug: created.slug },
    })
  } finally {
    savingPage.value = false
  }
}

// ── Delete page ──
async function onDeletePage() {
  if (!activePage.value || !space.value) return
  if (!confirm(t('kb.confirmDelete'))) return
  try {
    await deletePage(activePage.value.id)
    activePage.value = null
    ancestors.value = []
    pageTree.value = await getPageTree(space.value.id)
    router.push({
      name: 'kb-space',
      params: { projectId: projectId.value, spaceSlug: spaceSlug.value },
    })
  } catch {
    /* handled by global interceptor */
  }
}

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
turndown.use(strikethrough)
turndown.use(taskListItems)

function cellText(cell: HTMLElement): string {
  const p = cell.querySelector('p')
  return (p ? p.textContent : cell.textContent)?.trim() ?? ''
}

turndown.addRule('tiptapTable', {
  filter: 'table',
  replacement(_content: string, node: TurndownService.Node) {
    const el = node as unknown as HTMLTableElement
    const rows = Array.from(el.querySelectorAll('tr'))
    if (!rows.length) return ''

    const matrix: string[][] = rows.map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((c) => cellText(c as HTMLElement)),
    )

    const colCount = Math.max(...matrix.map((r) => r.length))
    const colWidths = Array.from({ length: colCount }, (_, ci) =>
      Math.max(3, ...matrix.map((r) => (r[ci] ?? '').length)),
    )

    const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))
    const formatRow = (cells: string[]) =>
      '| ' + Array.from({ length: colCount }, (_, i) => pad(cells[i] ?? '', colWidths[i])).join(' | ') + ' |'

    const headerRow = rows[0]?.querySelector('th') ? 0 : -1
    const lines: string[] = []

    if (headerRow === 0) {
      lines.push(formatRow(matrix[0]))
      lines.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |')
      for (let i = 1; i < matrix.length; i++) lines.push(formatRow(matrix[i]))
    } else {
      const emptyHeader = Array.from({ length: colCount }, () => '')
      lines.push(formatRow(emptyHeader))
      lines.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |')
      for (const row of matrix) lines.push(formatRow(row))
    }

    return '\n\n' + lines.join('\n') + '\n\n'
  },
})

turndown.remove('colgroup')

function startEditing() {
  if (!activePage.value) return
  const html = activePage.value.content_html || ''
  const md = activePage.value.content_markdown || ''
  editorContent.value = html || (md ? marked.parse(md, { async: false }) as string : '')
  markdownDraft.value = md || (html ? turndown.turndown(html) : '')
  isEditing.value = true
  editorMode.value = 'wysiwyg'
}

function cancelEditing() {
  isEditing.value = false
}

function switchToWysiwyg() {
  if (editorMode.value === 'wysiwyg') return
  if (markdownDraft.value.trim()) {
    editorContent.value = marked.parse(markdownDraft.value, { async: false }) as string
  }
  editorMode.value = 'wysiwyg'
}

function switchToMarkdown() {
  if (editorMode.value === 'markdown') return
  if (editorContent.value.trim()) {
    markdownDraft.value = turndown.turndown(editorContent.value)
  }
  editorMode.value = 'markdown'
}

async function onVersionRestored() {
  if (!activePage.value) return
  activePage.value = await getPage(activePage.value.id)
  if (space.value) pageTree.value = await getPageTree(space.value.id)
}

async function saveContent() {
  if (!activePage.value) return
  savingContent.value = true
  try {
    const body: Record<string, string> = {}
    if (editorMode.value === 'wysiwyg') {
      body.content_html = editorContent.value
      body.content_markdown = turndown.turndown(editorContent.value)
    } else {
      body.content_markdown = markdownDraft.value
      body.content_html = marked.parse(markdownDraft.value, { async: false }) as string
    }
    activePage.value = await updatePage(activePage.value.id, body)
    isEditing.value = false
  } finally {
    savingContent.value = false
  }
}

function onStoryMetaUpdated(updated: PageMetaBrief) {
  if (activePage.value) {
    activePage.value = { ...activePage.value, meta: updated }
  }
}

function navigateToPage(slug: string) {
  router.push({
    name: 'kb-page',
    params: { projectId: projectId.value, spaceSlug: spaceSlug.value, pageSlug: slug },
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('tickets.timeAgo.justNow')
  if (mins < 60) return t('tickets.timeAgo.minutesAgo', { n: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('tickets.timeAgo.hoursAgo', { n: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 30) return t('tickets.timeAgo.daysAgo', { n: days })
  return t('tickets.timeAgo.monthsAgo', { n: Math.floor(days / 30) })
}

// React to ?newpage query param from sidebar buttons
watch(
  () => route.query.newpage,
  (val) => {
    if (val === '1') {
      router.replace({ query: {} })
      openCreateDialog()
    }
  },
  { immediate: true },
)

onMounted(loadSpace)
</script>

<template>
  <div v-if="loading" class="flex justify-content-center py-6">
    <ProgressSpinner />
  </div>

  <div v-else-if="space" class="kb-view">
    <!-- Active page content -->
    <div v-if="loadingPage" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <div v-else-if="activePage" class="page-content">
      <Breadcrumb
        v-if="ancestors.length"
        :home="breadcrumbHome"
        :model="breadcrumbItems"
        class="mb-3"
      />

      <div class="page-header mb-4">
        <div class="flex align-items-center gap-2">
          <h1
            v-if="!editingTitle"
            class="page-title m-0 cursor-pointer flex-1"
            :title="$t('kb.editTitle')"
            @click="startEditTitle"
          >
            {{ activePage.title }}
          </h1>
          <InputText
            v-else
            v-model="titleDraft"
            class="w-full text-2xl font-bold flex-1"
            autofocus
            @blur="saveTitle"
            @keyup.enter="saveTitle"
          />
          <div class="flex gap-1">
            <Button
              v-if="!isEditing"
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              size="small"
              :title="$t('common.edit')"
              @click="startEditing"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              @click="onDeletePage"
            />
          </div>
        </div>
      </div>

      <StoryStatusBar
        v-if="activePage.meta?.page_type === 'user_story'"
        :page-id="activePage.id"
        :project-id="projectId"
        :meta="activePage.meta"
        @updated="onStoryMetaUpdated"
      />

      <div v-if="isEditing" class="editor-area">
        <div class="editor-toolbar-row flex align-items-center gap-2 mb-2">
          <div class="flex gap-1">
            <Button
              :label="'WYSIWYG'"
              size="small"
              :severity="editorMode === 'wysiwyg' ? 'primary' : 'secondary'"
              :text="editorMode !== 'wysiwyg'"
              @click="switchToWysiwyg"
            />
            <Button
              label="Markdown"
              size="small"
              :severity="editorMode === 'markdown' ? 'primary' : 'secondary'"
              :text="editorMode !== 'markdown'"
              @click="switchToMarkdown"
            />
          </div>
          <div class="flex-1" />
          <Button :label="$t('kb.cancel')" severity="secondary" size="small" text @click="cancelEditing" />
          <Button :label="$t('kb.save')" icon="pi pi-check" size="small" :loading="savingContent" @click="saveContent" />
        </div>

        <RichTextEditor
          v-if="editorMode === 'wysiwyg'"
          v-model="editorContent"
          placeholder="Start writing..."
        />
        <Textarea
          v-else
          v-model="markdownDraft"
          class="w-full markdown-editor"
          :rows="20"
          autoResize
        />
      </div>

      <template v-else>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div
          class="prose cursor-pointer"
          v-html="renderedHtml || `<p class='text-color-secondary'>Click the edit button to start writing...</p>`"
          @dblclick="startEditing"
        />
      </template>

      <div class="page-meta mt-6 mb-6 text-xs text-color-secondary">
        Updated {{ formatDate(activePage.updated_at) }}
      </div>

      <TabView class="page-tabs">
        <TabPanel v-if="activePage.meta?.page_type === 'user_story'" :header="$t('kb.linkedTickets')">
          <StoryTicketLinks :page-id="activePage.id" :project-id="projectId" />
        </TabPanel>
        <TabPanel :header="$t('kb.versions')">
          <KBVersionHistory :page-id="activePage.id" @restored="onVersionRestored" />
        </TabPanel>
        <TabPanel :header="$t('kb.comments')">
          <KBComments :page-id="activePage.id" />
        </TabPanel>
      </TabView>
    </div>

    <!-- Space summary (no page selected) -->
    <div v-else class="space-summary">
      <div class="space-summary-header">
        <div class="space-summary-title-row">
          <h1 class="space-summary-title">{{ space.name }}</h1>
          <Button
            :label="$t('kb.newPage')"
            icon="pi pi-plus"
            size="small"
            @click="openCreateDialog"
          />
        </div>
        <p v-if="space.description" class="space-summary-desc">{{ space.description }}</p>
      </div>

      <div class="space-stats">
        <div class="space-stat">
          <i class="pi pi-file" />
          <span class="space-stat-value">{{ totalPageCount }}</span>
          <span class="space-stat-label">{{ $t('kb.pages') }}</span>
        </div>
        <div class="space-stat">
          <i class="pi pi-users" />
          <span class="space-stat-value">{{ space.contributor_count }}</span>
          <span class="space-stat-label">{{ $t('kb.contributors') }}</span>
        </div>
        <div v-if="space.last_updated_at" class="space-stat">
          <i class="pi pi-clock" />
          <span class="space-stat-label">{{ $t('kb.updatedAgo', { time: relativeTime(space.last_updated_at) }) }}</span>
        </div>
      </div>

      <div v-if="flatPages.length" class="space-page-list">
        <h2 class="space-page-list-title">{{ $t('kb.allPages') }}</h2>
        <ul class="page-list">
          <li
            v-for="pg in flatPages"
            :key="pg.id"
            class="page-list-item"
            :style="{ paddingLeft: (pg.depth * 1.25 + 0.75) + 'rem' }"
          >
            <router-link
              :to="{ name: 'kb-page', params: { projectId, spaceSlug, pageSlug: pg.slug } }"
              class="page-list-link"
            >
              <i class="pi" :class="pg.hasChildren ? 'pi-folder' : 'pi-file'" />
              <span>{{ pg.title }}</span>
            </router-link>
          </li>
        </ul>
      </div>
      <div v-else class="space-empty">
        <i class="pi pi-file-edit space-empty-icon" />
        <p>{{ $t('kb.noPages') }}</p>
        <Button
          :label="$t('kb.newPage')"
          icon="pi pi-plus"
          size="small"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Template picker dialog -->
    <Dialog
      v-model:visible="showTemplatePicker"
      :header="$t('kb.templates')"
      modal
      :style="{ width: '40rem', maxWidth: '95vw' }"
    >
      <KBTemplatePicker :project-id="projectId" @select="onTemplateSelected" @cancel="skipTemplate" />
      <template #footer>
        <Button :label="'Skip - Blank Page'" severity="secondary" text @click="skipTemplate" />
      </template>
    </Dialog>

    <!-- Create page dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      :header="$t('kb.newPage')"
      modal
      :style="{ width: '28rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.pageTitle') }}</label>
          <InputText v-model="newPage.title" class="w-full" autofocus />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.parentPage') }}</label>
          <Select
            v-model="newPage.parent_page_id"
            :options="parentPageOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('kb.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button
          :label="savingPage ? $t('kb.creating') : $t('common.create')"
          icon="pi pi-check"
          :loading="savingPage"
          :disabled="!newPage.title.trim()"
          @click="onCreatePage"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.kb-view {
  max-width: 960px;
}

.page-title {
  font-size: 1.75rem;
  line-height: 1.3;
}

.page-title:hover {
  color: var(--p-primary-color, #6366f1);
}

/* ── Space summary ── */
.space-summary {
  max-width: 720px;
}

.space-summary-header {
  margin-bottom: 1.5rem;
}

.space-summary-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.space-summary-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.space-summary-desc {
  color: var(--p-text-muted-color);
  font-size: 0.9375rem;
  margin: 0;
  line-height: 1.5;
}

.space-stats {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 0;
  border-top: 1px solid var(--p-content-border-color);
  border-bottom: 1px solid var(--p-content-border-color);
  margin-bottom: 1.5rem;
}

.space-stat {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.space-stat i {
  font-size: 0.875rem;
}

.space-stat-value {
  font-weight: 700;
  color: var(--p-text-color);
}

.space-page-list-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.page-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.page-list-item {
  border-radius: 6px;
  transition: background 0.12s;
}

.page-list-item:hover {
  background: var(--app-hover-bg);
}

.page-list-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.75rem;
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.875rem;
}

.page-list-link i {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.space-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--p-text-muted-color);
}

.space-empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

/* ── Prose ── */
.prose {
  line-height: 1.7;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose :deep(p) {
  margin-bottom: 1em;
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 1em;
}

.prose :deep(pre) {
  background: var(--app-card-alt-bg);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.prose :deep(code) {
  font-size: 0.875em;
}

.prose :deep(blockquote) {
  border-left: 3px solid var(--p-primary-200, #c7d2fe);
  padding-left: 1rem;
  color: var(--p-text-muted-color, #64748b);
  margin: 1em 0;
}

.prose :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  overflow-x: auto;
  display: block;
}

.prose :deep(table th),
.prose :deep(table td) {
  border: 1px solid var(--p-content-border-color, #dee2e6);
  padding: 8px 12px;
  text-align: left;
}

.prose :deep(table th) {
  background: var(--app-card-alt-bg);
  font-weight: 600;
}

.prose :deep(table tr:nth-child(even)) {
  background: var(--p-content-background);
}

.prose :deep(table tr:hover) {
  background: var(--app-card-alt-bg);
}

.markdown-editor {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.editor-area {
  margin-bottom: 2rem;
}
</style>
