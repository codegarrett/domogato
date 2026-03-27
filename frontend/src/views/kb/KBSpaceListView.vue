<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  listSpaces,
  createSpace,
  listRecentPages,
  searchKB,
  type KBSpace,
  type RecentPage,
  type KBSearchResult,
} from '@/api/kb'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ProgressSpinner from 'primevue/progressspinner'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const projectId = computed(() => route.params.projectId as string)
const spaces = ref<KBSpace[]>([])
const recentPages = ref<RecentPage[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const saving = ref(false)

const newSpace = ref({ name: '', description: '', icon: '' })
const iconPickerOpen = ref(false)

const searchQuery = ref('')
const searchResults = ref<KBSearchResult[]>([])
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const iconOptions = [
  'book', 'folder', 'file', 'globe', 'briefcase', 'cog',
  'star', 'bolt', 'flag', 'users', 'shield', 'lock',
  'code', 'database', 'server', 'desktop', 'mobile', 'palette',
  'chart-bar', 'megaphone', 'heart', 'home', 'map', 'wrench',
  'lightbulb', 'graduation-cap', 'sitemap', 'box', 'building', 'hashtag',
]

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      searchResults.value = await searchKB(projectId.value, { q, limit: 10 })
    } finally {
      searching.value = false
    }
  }, 300)
}

function selectSearchResult(r: KBSearchResult) {
  searchQuery.value = ''
  searchResults.value = []
  router.push({
    name: 'kb-page',
    params: { projectId: projectId.value, spaceSlug: r.space_slug, pageSlug: r.slug },
  })
}

async function loadData() {
  loading.value = true
  try {
    const [spacesData, recentData] = await Promise.all([
      listSpaces(projectId.value),
      listRecentPages(projectId.value, 8),
    ])
    spaces.value = spacesData
    recentPages.value = recentData
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  newSpace.value = { name: '', description: '', icon: '' }
  iconPickerOpen.value = false
  showCreateDialog.value = true
}

async function onCreate() {
  const name = newSpace.value.name.trim()
  if (!name) return
  saving.value = true
  try {
    const body: { name: string; description?: string; icon?: string } = { name }
    if (newSpace.value.description.trim()) body.description = newSpace.value.description.trim()
    if (newSpace.value.icon.trim()) body.icon = newSpace.value.icon.trim()
    await createSpace(projectId.value, body)
    showCreateDialog.value = false
    await loadData()
  } finally {
    saving.value = false
  }
}

function navigateToSpace(space: KBSpace) {
  router.push({ name: 'kb-space', params: { projectId: projectId.value, spaceSlug: space.slug } })
}

function navigateToRecentPage(page: RecentPage) {
  router.push({
    name: 'kb-page',
    params: { projectId: projectId.value, spaceSlug: page.space_slug, pageSlug: page.slug },
  })
}

function toggleIconPicker() {
  iconPickerOpen.value = !iconPickerOpen.value
}

function selectIcon(icon: string) {
  newSpace.value.icon = newSpace.value.icon === icon ? '' : icon
  iconPickerOpen.value = false
}

function spaceIcon(space: KBSpace): string {
  return space.icon ? `pi pi-${space.icon}` : 'pi pi-book'
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

onMounted(loadData)
</script>

<template>
  <div class="kb-space-list">
    <!-- Header -->
    <div class="page-header flex align-items-center justify-content-between mb-4">
      <div>
        <h2 class="m-0 mb-1">{{ $t('kb.title') }}</h2>
        <p class="m-0 text-color-secondary text-sm">
          {{ spaces.length }} {{ spaces.length === 1 ? 'space' : 'spaces' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          icon="pi pi-cog"
          :label="$t('kb.storyWorkflow')"
          severity="secondary"
          outlined
          size="small"
          @click="router.push({ name: 'story-workflow-settings', params: { projectId } })"
        />
        <Button :label="$t('kb.createSpace')" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <template v-else>
      <!-- Global Search -->
      <div class="search-section mb-5">
        <div class="search-wrapper">
          <i class="pi pi-search search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="$t('kb.searchAll')"
            @input="onSearchInput"
          />
          <i v-if="searching" class="pi pi-spin pi-spinner search-spinner" />
        </div>
        <div v-if="searchQuery.trim() && !searching && searchResults.length === 0" class="search-results-dropdown">
          <div class="px-4 py-3 text-color-secondary text-sm">{{ $t('kb.noResults') }}</div>
        </div>
        <div v-if="searchResults.length > 0" class="search-results-dropdown">
          <div
            v-for="r in searchResults"
            :key="r.id"
            class="search-result-item"
            @click="selectSearchResult(r)"
          >
            <div class="flex align-items-center gap-2">
              <span class="font-semibold text-sm">{{ r.title }}</span>
              <span class="result-space-badge">{{ r.space_name }}</span>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="r.headline" class="text-xs text-color-secondary mt-1 search-headline" v-html="r.headline" />
          </div>
        </div>
      </div>

      <!-- Recently Updated Pages -->
      <div v-if="recentPages.length > 0" class="recent-section mb-5">
        <h3 class="section-title">
          <i class="pi pi-clock" />
          {{ $t('kb.recentlyUpdated') }}
        </h3>
        <div class="recent-grid">
          <div
            v-for="page in recentPages"
            :key="page.id"
            class="recent-card"
            @click="navigateToRecentPage(page)"
          >
            <div class="recent-card-title">{{ page.title }}</div>
            <div class="recent-card-meta">
              <span class="recent-space-badge">{{ page.space_name }}</span>
              <span class="recent-time">{{ relativeTime(page.updated_at) }}</span>
            </div>
            <div v-if="page.last_edited_by_name" class="recent-card-editor">
              {{ page.last_edited_by_name }}
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="spaces.length === 0" class="empty-state text-center py-6">
        <i class="pi pi-book text-4xl text-color-secondary mb-3" style="display: block;" />
        <p class="text-color-secondary">{{ $t('kb.emptySpaces') }}</p>
        <Button :label="$t('kb.createFirstSpace')" icon="pi pi-plus" @click="openCreateDialog" class="mt-3" />
      </div>

      <!-- Space Cards -->
      <div v-else>
        <h3 class="section-title mb-3">
          <i class="pi pi-th-large" />
          Spaces
        </h3>
        <div class="space-grid">
          <div
            v-for="space in spaces"
            :key="space.id"
            class="space-card"
            @click="navigateToSpace(space)"
          >
            <div class="space-card-header">
              <div class="space-icon-wrapper">
                <i :class="spaceIcon(space)" />
              </div>
              <div class="space-card-info">
                <span class="space-card-name">{{ space.name }}</span>
                <p v-if="space.description" class="space-card-desc">
                  {{ space.description }}
                </p>
              </div>
            </div>
            <div class="space-card-footer">
              <div class="space-stat">
                <i class="pi pi-file" />
                <span>{{ space.page_count }} {{ $t('kb.pages') }}</span>
              </div>
              <div v-if="space.contributor_count > 0" class="space-stat">
                <i class="pi pi-users" />
                <span>{{ space.contributor_count }}</span>
              </div>
              <div v-if="space.last_updated_at" class="space-stat ml-auto">
                <span class="text-color-secondary">{{ relativeTime(space.last_updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Create Space Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      :header="$t('kb.createSpace')"
      modal
      :style="{ width: '28rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.spaceName') }}</label>
          <InputText v-model="newSpace.name" class="w-full" autofocus />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.spaceDescription') }}</label>
          <Textarea v-model="newSpace.description" class="w-full" rows="3" />
        </div>
        <div class="icon-field">
          <label class="block text-sm font-semibold mb-1">{{ $t('kb.spaceIcon') }}</label>
          <button type="button" class="icon-select-trigger" @click="toggleIconPicker">
            <i v-if="newSpace.icon" :class="'pi pi-' + newSpace.icon" class="icon-select-preview" />
            <span v-else class="icon-select-placeholder">{{ $t('kb.chooseIcon') }}</span>
            <i class="pi pi-chevron-down icon-select-chevron" :class="{ open: iconPickerOpen }" />
          </button>
          <div v-if="iconPickerOpen" class="icon-picker-dropdown">
            <div class="icon-picker-grid">
              <button
                v-for="icon in iconOptions"
                :key="icon"
                type="button"
                class="icon-picker-btn"
                :class="{ selected: newSpace.icon === icon }"
                :title="icon"
                @click="selectIcon(icon)"
              >
                <i :class="'pi pi-' + icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('kb.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button
          :label="saving ? $t('kb.creating') : $t('common.create')"
          icon="pi pi-check"
          :loading="saving"
          :disabled="!newSpace.name.trim()"
          @click="onCreate"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
/* Search */
.search-section {
  position: relative;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  font-size: 1rem;
  color: var(--p-text-muted-color);
  pointer-events: none;
}

.search-spinner {
  position: absolute;
  right: 1rem;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

.search-input {
  width: 100%;
  padding: 0.85rem 2.5rem 0.85rem 2.75rem;
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 10px;
  background: var(--p-content-background);
  color: var(--p-text-color);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: var(--p-primary-color);
  box-shadow: 0 0 0 3px var(--p-primary-100, rgba(99, 102, 241, 0.15));
}

.search-input::placeholder {
  color: var(--p-text-muted-color);
}

.search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  margin-top: 4px;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 10px;
  background: var(--p-content-background);
  box-shadow: 0 8px 24px var(--shadow-color, rgba(0, 0, 0, 0.1));
  max-height: 360px;
  overflow-y: auto;
}

.search-result-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.12s;
}

.search-result-item:hover {
  background: var(--app-card-alt-bg);
}

.search-result-item:not(:last-child) {
  border-bottom: 1px solid var(--p-surface-100, #f1f5f9);
}

.result-space-badge {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--p-primary-50, #eef2ff);
  color: var(--p-primary-600, #4f46e5);
  font-weight: 600;
}

.search-headline :deep(b) {
  color: var(--p-primary-color, #6366f1);
}

/* Section titles */
.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
  margin: 0 0 0.75rem 0;
}

.section-title i {
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
}

/* Recent pages */
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
}

.recent-card {
  padding: 0.875rem 1rem;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 8px;
  background: var(--p-content-background);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.recent-card:hover {
  border-color: var(--p-primary-200, #c7d2fe);
  box-shadow: 0 2px 8px var(--shadow-color, rgba(0, 0, 0, 0.06));
}

.recent-card-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.recent-space-badge {
  font-size: 0.675rem;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--p-primary-50, #eef2ff);
  color: var(--p-primary-600, #4f46e5);
  font-weight: 600;
}

.recent-time {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.recent-card-editor {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Space cards */
.space-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.space-card {
  padding: 1.25rem;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 10px;
  background: var(--p-content-background);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.space-card:hover {
  border-color: var(--p-primary-200, #c7d2fe);
  box-shadow: 0 4px 16px var(--shadow-color, rgba(0, 0, 0, 0.08));
  transform: translateY(-1px);
}

.space-card-header {
  display: flex;
  gap: 0.875rem;
  margin-bottom: 1rem;
}

.space-icon-wrapper {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 10px;
  background: var(--p-primary-50, #eef2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--p-primary-color, #6366f1);
}

.space-card-info {
  flex: 1;
  min-width: 0;
}

.space-card-name {
  font-weight: 700;
  font-size: 1.05rem;
  display: block;
  margin-bottom: 0.25rem;
}

.space-card-desc {
  margin: 0;
  font-size: 0.825rem;
  color: var(--p-text-muted-color);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.space-card-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-surface-100, #f1f5f9);
}

.space-stat {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.space-stat i {
  font-size: 0.75rem;
}

/* Create dialog */
.icon-field {
  position: relative;
}

.icon-select-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 6px;
  background: var(--p-content-background);
  cursor: pointer;
  transition: border-color 0.15s;
  gap: 0.5rem;
}

.icon-select-trigger:hover {
  border-color: var(--p-primary-color, #6366f1);
}

.icon-select-preview {
  font-size: 1.125rem;
  color: var(--p-primary-color, #6366f1);
}

.icon-select-placeholder {
  font-size: 0.875rem;
  color: var(--p-text-muted-color, #94a3b8);
}

.icon-select-chevron {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--p-text-muted-color, #94a3b8);
  transition: transform 0.15s;
}

.icon-select-chevron.open {
  transform: rotate(180deg);
}

.icon-picker-dropdown {
  margin-top: 4px;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 8px;
  background: var(--p-content-background);
  box-shadow: 0 4px 16px var(--shadow-color);
  padding: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: 4px;
}

.icon-picker-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--app-card-alt-bg);
  cursor: pointer;
  color: var(--p-text-color, #334155);
  font-size: 1rem;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.icon-picker-btn:hover {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-surface-300, #cbd5e1);
}

.icon-picker-btn.selected {
  background: var(--p-primary-50, #eef2ff);
  border-color: var(--p-primary-color, #6366f1);
  color: var(--p-primary-color, #6366f1);
}
</style>
