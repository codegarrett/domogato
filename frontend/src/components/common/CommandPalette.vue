<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { globalSearch, type SearchResult as ApiSearchResult } from '@/api/search'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  route: string
  highlight?: string
}

const router = useRouter()
const { t } = useI18n()

const visible = ref(false)
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function open() {
  visible.value = true
  query.value = ''
  results.value = []
  selectedIndex.value = 0
  nextTick(() => {
    const el = document.querySelector('.cmd-palette-input input') as HTMLInputElement
    el?.focus()
  })
}

function close() {
  visible.value = false
}

async function search(q: string) {
  if (!q.trim()) {
    results.value = []
    return
  }
  loading.value = true
  try {
    const resp = await globalSearch(q, { limit: 15 })
    results.value = resp.results.map((r) => ({
      type: r.type,
      id: r.id,
      title: r.title,
      subtitle: r.subtitle || '',
      route: r.url,
      highlight: r.highlight || undefined,
    }))
    selectedIndex.value = 0
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

watch(query, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(q), 250)
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (results.value[selectedIndex.value]) {
      navigate(results.value[selectedIndex.value])
    }
  } else if (e.key === 'Escape') {
    close()
  }
}

function navigate(result: SearchResult) {
  close()
  router.push(result.route)
}

function typeIcon(type: string): string {
  if (type === 'ticket') return 'pi pi-ticket'
  if (type === 'kb_page') return 'pi pi-book'
  if (type === 'comment') return 'pi pi-comment'
  if (type === 'project') return 'pi pi-folder'
  return 'pi pi-search'
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (visible.value) close()
    else open()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
})

defineExpose({ open })
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="false"
    :showHeader="false"
    :style="{ width: '36rem', maxWidth: '95vw' }"
    contentClass="p-0"
    class="cmd-palette-dialog"
  >
    <div class="cmd-palette" @keydown="onKeydown">
      <div class="cmd-palette-search">
        <i class="pi pi-search cmd-palette-search-icon" />
        <InputText
          v-model="query"
          :placeholder="$t('search.placeholder')"
          class="cmd-palette-input w-full"
          autofocus
        />
        <kbd class="cmd-palette-kbd">ESC</kbd>
      </div>

      <div v-if="loading" class="cmd-palette-loading">
        <i class="pi pi-spin pi-spinner" />
      </div>

      <div v-else-if="results.length > 0" class="cmd-palette-results">
        <div
          v-for="(r, i) in results"
          :key="r.id + '-' + i"
          class="cmd-palette-result"
          :class="{ selected: i === selectedIndex }"
          @click="navigate(r)"
          @mouseenter="selectedIndex = i"
        >
          <i :class="typeIcon(r.type)" class="cmd-palette-result-icon" />
          <div class="flex-1 min-w-0">
            <div class="cmd-palette-result-title">{{ r.title }}</div>
            <div class="cmd-palette-result-subtitle">
              <span class="cmd-palette-result-type">{{ r.type === 'kb_page' ? 'Page' : r.type }}</span>
              <span v-if="r.subtitle"> &middot; {{ r.subtitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="query.trim()" class="cmd-palette-empty">
        {{ $t('search.noResults') }}
      </div>

      <div v-else class="cmd-palette-hint">
        {{ $t('search.hint') }}
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.cmd-palette {
  border-radius: 12px;
  overflow: hidden;
}

.cmd-palette-search {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--app-border-color);
}

.cmd-palette-search-icon {
  color: var(--p-text-muted-color);
  font-size: 1rem;
}

.cmd-palette-input :deep(input),
.cmd-palette-input :deep(.p-inputtext) {
  border: none;
  outline: none;
  box-shadow: none;
  font-size: 0.9375rem;
  padding: 0.25rem 0;
  background: transparent;
}

.cmd-palette-kbd {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--p-surface-200);
  border-radius: 4px;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.cmd-palette-loading {
  padding: 1.5rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.cmd-palette-results {
  max-height: 20rem;
  overflow-y: auto;
  padding: 0.25rem;
}

.cmd-palette-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.cmd-palette-result.selected {
  background: var(--app-hover-bg);
}

.cmd-palette-result-icon {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.cmd-palette-result-title {
  font-size: 0.8125rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmd-palette-result-subtitle {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
}

.cmd-palette-result-type {
  text-transform: capitalize;
  font-weight: 600;
}

.cmd-palette-empty,
.cmd-palette-hint {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
</style>
