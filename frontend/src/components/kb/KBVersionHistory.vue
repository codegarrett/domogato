<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import {
  listVersions,
  getVersion,
  restoreVersion as apiRestoreVersion,
  diffVersions,
  type VersionListItem,
  type KBPageVersion,
  type DiffResponse,
} from '@/api/kb'

const props = defineProps<{
  pageId: string
}>()

const emit = defineEmits<{
  restored: []
}>()

const { t } = useI18n()

const versions = ref<VersionListItem[]>([])
const selectedVersions = ref<string[]>([])
const showViewDialog = ref(false)
const showDiffDialog = ref(false)
const viewingVersion = ref<VersionListItem | null>(null)
const viewingVersionFull = ref<KBPageVersion | null>(null)
const diffResult = ref<DiffResponse | null>(null)

const latestVersion = computed(() =>
  versions.value.length ? versions.value[0].version_number : 0,
)

async function load() {
  const res = await listVersions(props.pageId)
  versions.value = res.items
}

function toggleSelect(id: string) {
  const idx = selectedVersions.value.indexOf(id)
  if (idx !== -1) {
    selectedVersions.value.splice(idx, 1)
  } else if (selectedVersions.value.length < 2) {
    selectedVersions.value.push(id)
  }
}

function isSelected(id: string): boolean {
  return selectedVersions.value.includes(id)
}

function clearSelection() {
  selectedVersions.value = []
}

async function viewVersion(v: VersionListItem) {
  viewingVersion.value = v
  viewingVersionFull.value = await getVersion(props.pageId, v.id)
  showViewDialog.value = true
}

async function showDiff() {
  if (selectedVersions.value.length !== 2) return
  diffResult.value = await diffVersions(
    props.pageId,
    selectedVersions.value[0],
    selectedVersions.value[1],
  )
  showDiffDialog.value = true
}

async function onRestoreVersion(v: VersionListItem) {
  if (!confirm(t('kb.confirmRestore', 'Restore this version? A new version will be created.')))
    return
  await apiRestoreVersion(props.pageId, v.id)
  await load()
  emit('restored')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

onMounted(load)
watch(() => props.pageId, load)
</script>

<template>
  <div class="kb-version-history">
    <div class="flex align-items-center justify-content-between mb-3">
      <h3 class="m-0">{{ $t('kb.versions') }}</h3>
      <div v-if="selectedVersions.length === 2" class="flex gap-2">
        <Button label="Compare" icon="pi pi-arrows-h" size="small" @click="showDiff" />
        <Button label="Clear" size="small" severity="secondary" text @click="clearSelection" />
      </div>
    </div>

    <div class="version-list">
      <div
        v-for="v in versions"
        :key="v.id"
        class="version-item surface-card border-round p-3 mb-2"
        :class="{ selected: isSelected(v.id) }"
        @click="toggleSelect(v.id)"
      >
        <div class="flex align-items-center justify-content-between">
          <div>
            <span class="font-semibold">v{{ v.version_number }}</span>
            <span class="text-color-secondary text-sm ml-2">{{ v.title }}</span>
          </div>
          <div class="flex gap-1">
            <Button
              icon="pi pi-eye"
              text
              rounded
              size="small"
              :title="$t('kb.viewVersion', 'View')"
              @click.stop="viewVersion(v)"
            />
            <Button
              v-if="v.version_number < latestVersion"
              icon="pi pi-replay"
              text
              rounded
              size="small"
              severity="warning"
              :title="$t('kb.restoreVersion', 'Restore')"
              @click.stop="onRestoreVersion(v)"
            />
          </div>
        </div>
        <div class="text-xs text-color-secondary mt-1">
          {{ v.change_summary || $t('kb.noDescription', 'No description') }} ·
          {{ formatDate(v.created_at) }}
        </div>
      </div>
    </div>

    <!-- View Version Dialog -->
    <Dialog
      v-model:visible="showViewDialog"
      :header="`Version ${viewingVersion?.version_number}`"
      modal
      :style="{ width: '50rem' }"
    >
      <div v-if="viewingVersionFull" class="prose" v-html="viewingVersionFull.content_html" />
    </Dialog>

    <!-- Diff Dialog -->
    <Dialog
      v-model:visible="showDiffDialog"
      :header="$t('kb.versionComparison', 'Version Comparison')"
      modal
      :style="{ width: '60rem' }"
    >
      <div v-if="diffResult" class="diff-view">
        <div class="diff-stats mb-3 flex gap-3 text-sm">
          <span class="text-green-600">+{{ diffResult.stats.additions }} {{ $t('kb.additions', 'additions') }}</span>
          <span class="text-red-600">-{{ diffResult.stats.deletions }} {{ $t('kb.deletions', 'deletions') }}</span>
        </div>
        <div class="diff-lines">
          <div
            v-for="(entry, i) in diffResult.diff"
            :key="i"
            class="diff-line"
            :class="{
              'diff-added': entry.type === 'added',
              'diff-removed': entry.type === 'removed',
            }"
          >
            <span class="diff-prefix">{{ entry.type === 'added' ? '+' : entry.type === 'removed' ? '-' : ' ' }}</span>
            <span>{{ entry.content }}</span>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.version-item {
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.version-item:hover {
  background: var(--app-card-alt-bg);
}

.version-item.selected {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50, #eef2ff);
}

.diff-line {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8125rem;
  padding: 1px 8px;
  white-space: pre-wrap;
}

.diff-added {
  background: var(--diff-add-bg);
  color: var(--diff-add-color);
}

.diff-removed {
  background: var(--diff-remove-bg);
  color: var(--diff-remove-color);
}

.diff-prefix {
  display: inline-block;
  width: 1.5em;
  user-select: none;
}
</style>
