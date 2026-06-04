<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.embeddings.title') }}</h1>
      <AdminSubNav />
    </div>

    <Message
      v-if="aiConfig && !aiConfig.embedding_configured"
      severity="warn"
      :closable="false"
      class="mb-3"
    >
      {{ t('admin.embeddings.notConfigured') }}
    </Message>
    <div v-else-if="aiConfig" class="config-banner mb-3">
      <i class="pi pi-check-circle" />
      <span>
        {{ t('admin.embeddings.providerInfo', {
          provider: aiConfig.embedding_provider,
          model: aiConfig.embedding_model,
        }) }}
      </span>
    </div>

    <div v-if="statsLoading" class="flex justify-content-center py-4">
      <ProgressSpinner />
    </div>
    <div v-else-if="stats" class="stats-grid mb-4">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total_chunks }}</span>
        <span class="stat-label">{{ t('admin.embeddings.totalChunks') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.unique_sources }}</span>
        <span class="stat-label">{{ t('admin.embeddings.uniqueSources') }}</span>
      </div>
      <div class="stat-card stat-card-wide">
        <span class="stat-label mb-2">{{ t('admin.embeddings.byContentType') }}</span>
        <div class="type-tags">
          <Tag
            v-for="(count, type) in stats.by_content_type"
            :key="type"
            :value="`${type}: ${count}`"
            severity="secondary"
          />
          <span v-if="!Object.keys(stats.by_content_type).length" class="muted">—</span>
        </div>
      </div>
    </div>

    <div class="admin-toolbar">
      <Select
        v-model="filterProjectId"
        :options="projectOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('admin.embeddings.allProjects')"
        show-clear
        class="filter-select"
        @change="onFilterChange"
      />
      <Select
        v-model="filterContentType"
        :options="contentTypeOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('admin.embeddings.allContentTypes')"
        show-clear
        class="filter-select"
        @change="onFilterChange"
      />
      <InputText
        v-model="searchQuery"
        :placeholder="t('admin.embeddings.searchPlaceholder')"
        class="search-input"
        @input="debouncedSearch"
      />
      <Button icon="pi pi-refresh" text rounded :loading="loading" @click="refreshAll" />
    </div>

    <DataTable
      :value="embeddings"
      size="small"
      class="text-sm embeddings-table"
      :rows="limit"
      :lazy="true"
      :total-records="total"
      :first="offset"
      :loading="loading"
      paginator
      :rows-per-page-options="[25, 50, 100]"
      row-hover
      @page="onPage"
      @row-click="onRowClick"
    >
      <Column :header="t('admin.embeddings.project')" field="project_name" style="min-width: 8rem">
        <template #body="{ data }">
          {{ data.project_name || '—' }}
        </template>
      </Column>
      <Column :header="t('admin.embeddings.contentType')" field="content_type" style="width: 8rem">
        <template #body="{ data }">
          <Tag :value="data.content_type" severity="info" />
        </template>
      </Column>
      <Column :header="t('admin.embeddings.source')" style="min-width: 10rem">
        <template #body="{ data }">
          {{ sourceLabel(data) }}
        </template>
      </Column>
      <Column :header="t('admin.embeddings.chunk')" field="chunk_index" style="width: 5rem" />
      <Column :header="t('admin.embeddings.preview')" style="min-width: 16rem">
        <template #body="{ data }">
          <span class="preview-text">{{ data.chunk_text_preview }}</span>
        </template>
      </Column>
      <Column :header="t('common.created')" style="width: 10rem">
        <template #body="{ data }">
          {{ formatDate(data.created_at) }}
        </template>
      </Column>
      <Column style="width: 6rem">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            size="small"
            text
            severity="danger"
            @click.stop="confirmDeleteChunk(data)"
          />
        </template>
      </Column>
    </DataTable>

    <div class="settings-card mt-4">
      <div class="card-header">
        <h2>{{ t('admin.embeddings.semanticSearch') }}</h2>
        <p class="muted">{{ t('admin.embeddings.semanticSearchDescription') }}</p>
      </div>
      <div class="semantic-toolbar">
        <Select
          v-model="semanticProjectId"
          :options="projectSelectOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('admin.embeddings.selectProject')"
          class="filter-select"
        />
        <Select
          v-model="semanticContentType"
          :options="contentTypeOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('admin.embeddings.allContentTypes')"
          show-clear
          class="filter-select"
        />
        <InputText
          v-model="semanticQuery"
          :placeholder="t('admin.embeddings.semanticQueryPlaceholder')"
          class="search-input flex-1"
          @keyup.enter="runSemanticSearch"
        />
        <InputNumber v-model="semanticLimit" :min="1" :max="50" class="limit-input" />
        <Button
          :label="t('admin.embeddings.search')"
          icon="pi pi-search"
          :loading="semanticLoading"
          :disabled="!semanticProjectId || !semanticQuery.trim()"
          @click="runSemanticSearch"
        />
      </div>
      <DataTable
        v-if="semanticResults.length"
        :value="semanticResults"
        size="small"
        class="text-sm mt-3"
      >
        <Column :header="t('admin.embeddings.similarity')" style="width: 6rem">
          <template #body="{ data }">
            {{ (data.similarity * 100).toFixed(1) }}%
          </template>
        </Column>
        <Column :header="t('admin.embeddings.contentType')" field="content_type" style="width: 8rem" />
        <Column :header="t('admin.embeddings.source')">
          <template #body="{ data }">
            {{ sourceLabel(data) }}
          </template>
        </Column>
        <Column :header="t('admin.embeddings.preview')">
          <template #body="{ data }">
            <span class="preview-text">{{ data.chunk_text }}</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="settings-card mt-4">
      <div class="card-header">
        <h2>{{ t('admin.embeddings.reindexProject') }}</h2>
        <p class="muted">{{ t('admin.embeddings.reindexProjectDescription') }}</p>
      </div>
      <div class="reindex-row">
        <Select
          v-model="reindexProjectId"
          :options="projectSelectOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('admin.embeddings.selectProject')"
          class="filter-select"
        />
        <Button
          :label="t('admin.embeddings.reindexProject')"
          icon="pi pi-sync"
          severity="warn"
          :loading="reindexLoading"
          :disabled="!reindexProjectId"
          @click="confirmReindexProject"
        />
      </div>
    </div>

    <Dialog
      v-model:visible="showDetailDialog"
      :header="t('admin.embeddings.detailTitle')"
      modal
      :style="{ width: '42rem' }"
    >
      <template v-if="detail">
        <div class="detail-grid">
          <div><strong>{{ t('admin.embeddings.project') }}:</strong> {{ detail.project_name || '—' }}</div>
          <div><strong>{{ t('admin.embeddings.contentType') }}:</strong> {{ detail.content_type }}</div>
          <div><strong>{{ t('admin.embeddings.chunk') }}:</strong> {{ detail.chunk_index }}</div>
          <div><strong>{{ t('common.created') }}:</strong> {{ formatDate(detail.created_at) }}</div>
        </div>
        <div v-if="detailKbLink" class="mt-3">
          <router-link :to="detailKbLink">{{ t('admin.embeddings.viewKbPage') }}</router-link>
        </div>
        <h3 class="detail-section-title">{{ t('admin.embeddings.chunkText') }}</h3>
        <pre class="chunk-text">{{ detail.chunk_text }}</pre>
        <h3 class="detail-section-title">{{ t('admin.embeddings.metadata') }}</h3>
        <pre class="metadata-json">{{ formattedMetadata }}</pre>
      </template>
      <template #footer>
        <Button
          :label="t('admin.embeddings.reindexSource')"
          icon="pi pi-sync"
          text
          @click="handleReindexSource"
        />
        <Button
          :label="t('admin.embeddings.deleteSource')"
          icon="pi pi-trash"
          text
          severity="danger"
          @click="confirmDeleteSource"
        />
        <Button
          :label="t('admin.embeddings.deleteChunk')"
          icon="pi pi-trash"
          severity="danger"
          @click="confirmDeleteChunk(detail!)"
        />
        <Button :label="t('common.cancel')" @click="showDetailDialog = false" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showConfirmDialog" :header="confirmTitle" modal :style="{ width: '28rem' }">
      <p class="text-sm">{{ confirmMessage }}</p>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="showConfirmDialog = false" />
        <Button :label="t('common.save')" :severity="confirmSeverity" :loading="confirmLoading" @click="executeConfirm" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import { fetchAIConfig, type AIConfig } from '@/api/ai'
import { listOrganizations } from '@/api/organizations'
import { listProjects } from '@/api/projects'
import {
  getEmbeddingStats,
  listEmbeddings,
  getEmbedding,
  deleteEmbedding,
  deleteContentEmbeddings,
  reindexContent,
  reindexProject,
  semanticSearchEmbeddings,
  sourceLabel,
  kbPageRoute,
  type EmbeddingListItem,
  type EmbeddingDetail,
  type EmbeddingStats,
  type SemanticSearchResult,
  type ProjectOption,
} from '@/api/embeddings'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()

const aiConfig = ref<AIConfig | null>(null)
const stats = ref<EmbeddingStats | null>(null)
const statsLoading = ref(false)
const embeddings = ref<EmbeddingListItem[]>([])
const total = ref(0)
const offset = ref(0)
const limit = ref(50)
const loading = ref(false)
const searchQuery = ref('')
const filterProjectId = ref<string | null>(null)
const filterContentType = ref<string | null>(null)

const projects = ref<ProjectOption[]>([])
const semanticProjectId = ref<string | null>(null)
const semanticContentType = ref<string | null>(null)
const semanticQuery = ref('')
const semanticLimit = ref(10)
const semanticResults = ref<SemanticSearchResult[]>([])
const semanticLoading = ref(false)
const reindexProjectId = ref<string | null>(null)
const reindexLoading = ref(false)

const showDetailDialog = ref(false)
const detail = ref<EmbeddingDetail | null>(null)

const showConfirmDialog = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmSeverity = ref<'danger' | 'warn' | 'success'>('warn')
const confirmLoading = ref(false)
let confirmAction: (() => Promise<void>) | null = null

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const contentTypeOptions = computed(() => {
  const types = stats.value?.by_content_type ?? {}
  return Object.keys(types).map((type) => ({ label: type, value: type }))
})

const projectSelectOptions = computed(() =>
  projects.value.map((p) => ({ label: `${p.name} (${p.key})`, value: p.id })),
)

const projectOptions = computed(() => [
  ...projectSelectOptions.value,
])

const detailKbLink = computed(() => {
  if (!detail.value) return null
  return kbPageRoute(detail.value.project_id, detail.value.metadata)
})

const formattedMetadata = computed(() => {
  if (!detail.value) return ''
  return JSON.stringify(detail.value.metadata, null, 2)
})

onMounted(async () => {
  await Promise.all([loadConfig(), loadProjects(), refreshAll()])
})

async function loadConfig() {
  try {
    aiConfig.value = await fetchAIConfig()
  } catch {
    // handled by interceptor
  }
}

async function loadProjects() {
  try {
    const orgs = await listOrganizations(0, 200)
    const loaded: ProjectOption[] = []
    for (const org of orgs.items) {
      const res = await listProjects(org.id, 0, 200)
      for (const p of res.items) {
        loaded.push({
          id: p.id,
          name: p.name,
          key: p.key,
          organization_id: org.id,
        })
      }
    }
    projects.value = loaded
  } catch {
    // handled by interceptor
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await getEmbeddingStats()
  } finally {
    statsLoading.value = false
  }
}

async function loadEmbeddings() {
  loading.value = true
  try {
    const res = await listEmbeddings({
      offset: offset.value,
      limit: limit.value,
      project_id: filterProjectId.value || undefined,
      content_type: filterContentType.value || undefined,
      q: searchQuery.value || undefined,
    })
    embeddings.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadStats(), loadEmbeddings()])
}

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    offset.value = 0
    loadEmbeddings()
  }, 300)
}

function onFilterChange() {
  offset.value = 0
  loadEmbeddings()
}

function onPage(event: { first: number; rows: number }) {
  offset.value = event.first
  limit.value = event.rows
  loadEmbeddings()
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

async function onRowClick(event: { data: EmbeddingListItem }) {
  try {
    detail.value = await getEmbedding(event.data.id)
    showDetailDialog.value = true
  } catch {
    // handled by interceptor
  }
}

function openConfirm(
  title: string,
  message: string,
  severity: 'danger' | 'warn' | 'success',
  action: () => Promise<void>,
) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmSeverity.value = severity
  confirmAction = action
  showConfirmDialog.value = true
}

async function executeConfirm() {
  if (!confirmAction) return
  confirmLoading.value = true
  try {
    await confirmAction()
    showConfirmDialog.value = false
  } finally {
    confirmLoading.value = false
    confirmAction = null
  }
}

function confirmDeleteChunk(item: EmbeddingListItem | EmbeddingDetail) {
  openConfirm(
    t('admin.embeddings.deleteChunkTitle'),
    t('admin.embeddings.deleteChunkConfirm'),
    'danger',
    async () => {
      await deleteEmbedding(item.id)
      toast.showSuccess(t('common.success'), t('admin.embeddings.deleteChunkDone'))
      showDetailDialog.value = false
      await refreshAll()
    },
  )
}

function confirmDeleteSource() {
  if (!detail.value) return
  openConfirm(
    t('admin.embeddings.deleteSourceTitle'),
    t('admin.embeddings.deleteSourceConfirm'),
    'danger',
    async () => {
      await deleteContentEmbeddings(detail.value!.content_type, detail.value!.content_id)
      toast.showSuccess(t('common.success'), t('admin.embeddings.deleteSourceDone'))
      showDetailDialog.value = false
      await refreshAll()
    },
  )
}

async function handleReindexSource() {
  if (!detail.value) return
  try {
    await reindexContent(detail.value.content_type, detail.value.content_id)
    toast.showSuccess(t('common.success'), t('admin.embeddings.reindexSourceDone'))
  } catch {
    // handled by interceptor
  }
}

function confirmReindexProject() {
  if (!reindexProjectId.value) return
  openConfirm(
    t('admin.embeddings.reindexProjectTitle'),
    t('admin.embeddings.reindexProjectConfirm'),
    'warn',
    async () => {
      reindexLoading.value = true
      try {
        const res = await reindexProject(reindexProjectId.value!)
        toast.showSuccess(
          t('common.success'),
          t('admin.embeddings.reindexProjectDone', {
            pages: res.pages_queued,
            attachments: res.attachments_queued,
          }),
        )
      } finally {
        reindexLoading.value = false
      }
    },
  )
}

async function runSemanticSearch() {
  if (!semanticProjectId.value || !semanticQuery.value.trim()) return
  semanticLoading.value = true
  try {
    const res = await semanticSearchEmbeddings({
      query: semanticQuery.value.trim(),
      project_id: semanticProjectId.value,
      content_types: semanticContentType.value ? [semanticContentType.value] : undefined,
      limit: semanticLimit.value,
    })
    semanticResults.value = res.results
  } finally {
    semanticLoading.value = false
  }
}
</script>

<style scoped>
.admin-page {
  max-width: 1200px;
  margin: 0 auto;
}
.admin-header {
  margin-bottom: 1.25rem;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}
.config-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--p-green-50);
  color: var(--p-green-700);
  border-radius: 8px;
  font-size: 0.875rem;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.stat-card {
  background: var(--app-card-alt-bg);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.stat-card-wide {
  grid-column: span 1;
}
.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
}
.stat-label {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.admin-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.search-input {
  flex: 1;
  min-width: 12rem;
}
.filter-select {
  min-width: 12rem;
}
.preview-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--p-text-muted-color);
}
.settings-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  padding: 1.25rem;
}
.card-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
}
.muted {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  margin: 0;
}
.semantic-toolbar,
.reindex-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
.limit-input {
  width: 5rem;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.detail-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}
.chunk-text,
.metadata-json {
  background: var(--app-card-alt-bg);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 12rem;
  overflow: auto;
  margin: 0;
}
.embeddings-table :deep(.p-datatable-tbody > tr) {
  cursor: pointer;
}
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
