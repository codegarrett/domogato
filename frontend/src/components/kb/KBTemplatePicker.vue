<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { listTemplates, type KBTemplate } from '@/api/kb'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

const props = defineProps<{
  projectId: string
}>()

const emit = defineEmits<{
  select: [template: KBTemplate]
  cancel: []
}>()

const templates = ref<KBTemplate[]>([])
const previewTemplate = ref<KBTemplate | null>(null)
const loading = ref(false)
const loadError = ref('')

const builtinTemplates = computed(() => templates.value.filter(t => t.is_builtin))
const customTemplates = computed(() => templates.value.filter(t => !t.is_builtin))

const iconMap: Record<string, string> = {
  'file-text': 'pi pi-file',
  'users': 'pi pi-users',
  'git-branch': 'pi pi-sitemap',
  'book-open': 'pi pi-book',
  'code': 'pi pi-code',
  'clipboard': 'pi pi-clipboard',
}

function templateIcon(t: KBTemplate): string {
  return iconMap[t.icon || ''] || 'pi pi-file'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    templates.value = await listTemplates(props.projectId)
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load templates'
  } finally {
    loading.value = false
  }
}

watch(() => props.projectId, load, { immediate: true })
</script>

<template>
  <div class="kb-template-picker">
    <div v-if="loading" class="flex justify-content-center py-4">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <div v-else-if="loadError" class="text-center py-4">
      <p class="text-color-secondary mb-2">{{ loadError }}</p>
      <Button label="Retry" icon="pi pi-refresh" size="small" severity="secondary" @click="load" />
    </div>

    <div v-else-if="!templates.length" class="text-center py-4">
      <p class="text-color-secondary">No templates available.</p>
    </div>

    <div v-else class="template-grid">
      <div class="template-section" v-if="builtinTemplates.length">
        <h4 class="text-sm text-color-secondary mb-2">Built-in Templates</h4>
        <div class="grid">
          <div
            v-for="t in builtinTemplates"
            :key="t.id"
            class="template-card surface-card border-round shadow-1 p-3 cursor-pointer"
            :class="{ selected: previewTemplate?.id === t.id }"
            @click="previewTemplate = t"
            @dblclick="emit('select', t)"
          >
            <div class="flex align-items-center gap-2 mb-1">
              <i :class="templateIcon(t)" class="text-primary" />
              <span class="font-semibold text-sm">{{ t.name }}</span>
            </div>
            <p v-if="t.description" class="text-xs text-color-secondary m-0">{{ t.description }}</p>
          </div>
        </div>
      </div>

      <div class="template-section mt-3" v-if="customTemplates.length">
        <h4 class="text-sm text-color-secondary mb-2">Custom Templates</h4>
        <div class="grid">
          <div
            v-for="t in customTemplates"
            :key="t.id"
            class="template-card surface-card border-round shadow-1 p-3 cursor-pointer"
            :class="{ selected: previewTemplate?.id === t.id }"
            @click="previewTemplate = t"
            @dblclick="emit('select', t)"
          >
            <div class="flex align-items-center gap-2 mb-1">
              <i :class="templateIcon(t)" class="text-primary" />
              <span class="font-semibold text-sm">{{ t.name }}</span>
            </div>
            <p v-if="t.description" class="text-xs text-color-secondary m-0">{{ t.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="previewTemplate" class="template-preview mt-3 p-3 surface-card border-round">
      <div class="flex align-items-center justify-content-between mb-2">
        <span class="font-semibold">{{ previewTemplate.name }}</span>
        <Button
          label="Use Template"
          size="small"
          icon="pi pi-check"
          @click="emit('select', previewTemplate)"
        />
      </div>
      <pre class="text-xs overflow-auto preview-content">{{ previewTemplate.content_markdown }}</pre>
    </div>

    <div class="flex justify-content-end mt-3">
      <Button label="Cancel" severity="secondary" text size="small" @click="emit('cancel')" />
    </div>
  </div>
</template>

<style scoped>
.template-grid .grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.template-card {
  border: 1px solid transparent;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.template-card:hover {
  border-color: var(--p-surface-200);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.template-card.selected {
  border-color: var(--p-primary-color);
}

.preview-content {
  max-height: 200px;
  white-space: pre-wrap;
}
</style>
