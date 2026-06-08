<template>
  <div class="agent-skills-section">
    <div class="section-header">
      <div>
        <div class="font-semibold">{{ title }}</div>
        <p class="text-sm text-color-secondary mt-1 mb-0">{{ description }}</p>
      </div>
      <Button :label="t('agentSkills.newSkill')" icon="pi pi-plus" size="small" @click="openNewSkill" />
    </div>

    <p v-if="loadError" class="text-sm text-red-500 mt-3 mb-0">{{ loadError }}</p>

    <DataTable v-if="skills.length" :value="skills" size="small" class="text-sm mt-3">
      <Column :header="t('agentSkills.slug')" field="slug" />
      <Column :header="t('agentSkills.toolName')" field="tool_name" />
      <Column :header="t('agentSkills.name')" field="name" />
      <Column :header="t('agentSkills.enabled')" style="width: 6rem">
        <template #body="{ data }">
          <Tag :value="data.enabled ? t('common.yes') : t('common.no')" :severity="data.enabled ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column style="width: 8rem">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" text size="small" @click="editSkill(data.slug)" />
          <Button icon="pi pi-trash" text size="small" severity="danger" @click="confirmDelete(data.slug)" />
        </template>
      </Column>
    </DataTable>
    <p v-else class="text-sm text-color-secondary mt-3 mb-0">{{ t('agentSkills.noSkills') }}</p>

    <Dialog v-model:visible="editorOpen" :header="editorTitle" modal :style="{ width: '48rem' }">
      <div class="flex flex-column gap-3">
        <InputText v-model="editSlug" :placeholder="t('agentSkills.slug')" :disabled="!!editingSlug" />
        <InputText v-model="editName" :placeholder="t('agentSkills.displayName')" />
        <div class="markdown-field">
          <div class="markdown-field-header">
            <span class="text-sm font-semibold">{{ t('agentSkills.markdownLabel') }}</span>
            <Button
              v-tooltip.top="aiWandTooltip"
              icon="pi pi-sparkles"
              text
              rounded
              size="small"
              :disabled="!chatStore.isConfigured || aiGenerating"
              :aria-label="t('agentSkills.aiGenerate')"
              @click="openAiDialog"
            />
          </div>
          <Textarea v-model="editContent" rows="18" class="w-full font-mono text-sm" />
        </div>
        <Message v-if="validateErrors.length" severity="error" :closable="false">
          {{ validateErrors.join('; ') }}
        </Message>
        <Message v-else-if="validateOk" severity="success" :closable="false">
          {{ t('agentSkills.validSkill', { tool: validatedToolName || '' }) }}
        </Message>
      </div>
      <template #footer>
        <Button :label="t('agentSkills.validate')" text @click="runValidate" />
        <Button :label="t('common.cancel')" text @click="editorOpen = false" />
        <Button :label="t('common.save')" :loading="saving" @click="saveSkill" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="aiDialogOpen"
      :header="t('agentSkills.aiGenerateTitle')"
      modal
      :style="{ width: '32rem' }"
    >
      <p class="text-sm text-color-secondary mt-0 mb-3">{{ t('agentSkills.aiGenerateHint') }}</p>
      <Textarea
        v-model="aiPrompt"
        rows="5"
        class="w-full"
        :placeholder="t('agentSkills.aiGeneratePrompt')"
        autofocus
      />
      <Message v-if="aiError" severity="error" :closable="false" class="mt-3">
        {{ aiError }}
      </Message>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="aiDialogOpen = false" />
        <Button
          :label="t('agentSkills.aiGenerate')"
          icon="pi pi-sparkles"
          :loading="aiGenerating"
          :disabled="!aiPrompt.trim()"
          @click="runAiGenerate"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import type {
  AgentSkillGenerateRequest,
  AgentSkillGenerateResponse,
  AgentSkillListItem,
} from '@/api/agentSkills'
import { DEFAULT_SKILL_TEMPLATE } from '@/api/agentSkills'
import { useToastService } from '@/composables/useToast'
import { useChatStore } from '@/stores/chat'

const props = defineProps<{
  title: string
  description: string
  loadSkills: () => Promise<AgentSkillListItem[]>
  loadSkill: (slug: string) => Promise<{ name: string; content_md: string }>
  saveSkillApi: (slug: string, payload: { name: string; content_md: string; enabled: boolean }) => Promise<unknown>
  deleteSkillApi: (slug: string) => Promise<void>
  validateApi: (contentMd: string) => Promise<{ valid: boolean; errors: string[]; tool_name?: string | null }>
  generateSkillApi: (payload: AgentSkillGenerateRequest) => Promise<AgentSkillGenerateResponse>
}>()

const { t } = useI18n()
const toast = useToastService()
const chatStore = useChatStore()

const skills = ref<AgentSkillListItem[]>([])
const editorOpen = ref(false)
const editingSlug = ref<string | null>(null)
const editSlug = ref('')
const editName = ref('')
const editContent = ref('')
const saving = ref(false)
const validateErrors = ref<string[]>([])
const validateOk = ref(false)
const validatedToolName = ref<string | null>(null)
const loadError = ref<string | null>(null)
const aiDialogOpen = ref(false)
const aiPrompt = ref('')
const aiGenerating = ref(false)
const aiError = ref<string | null>(null)

const editorTitle = computed(() =>
  editingSlug.value ? t('agentSkills.editSkill') : t('agentSkills.newSkill'),
)

const aiWandTooltip = computed(() =>
  chatStore.isConfigured ? t('agentSkills.aiGenerate') : t('agentSkills.aiNotConfigured'),
)

async function refresh() {
  loadError.value = null
  try {
    skills.value = await props.loadSkills()
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : t('common.error')
    skills.value = []
  }
}

onMounted(refresh)

function openNewSkill() {
  editingSlug.value = null
  editSlug.value = ''
  editName.value = ''
  editContent.value = DEFAULT_SKILL_TEMPLATE
  validateErrors.value = []
  validateOk.value = false
  editorOpen.value = true
}

async function editSkill(slug: string) {
  const detail = await props.loadSkill(slug)
  editingSlug.value = slug
  editSlug.value = slug
  editName.value = detail.name
  editContent.value = detail.content_md
  validateErrors.value = []
  validateOk.value = false
  editorOpen.value = true
}

function openAiDialog() {
  if (!chatStore.isConfigured) {
    toast.showWarn(t('common.error'), t('agentSkills.aiNotConfigured'))
    return
  }
  aiPrompt.value = ''
  aiError.value = null
  aiDialogOpen.value = true
}

async function runAiGenerate() {
  const prompt = aiPrompt.value.trim()
  if (!prompt) return
  aiGenerating.value = true
  aiError.value = null
  try {
    const result = await props.generateSkillApi({
      prompt,
      current_content_md: editContent.value.trim() || null,
      display_name: editName.value.trim() || null,
    })
    editContent.value = result.content_md
    if (result.suggested_name && !editName.value.trim()) {
      editName.value = result.suggested_name
    }
    if (!editingSlug.value && result.tool_name && !editSlug.value.trim()) {
      editSlug.value = result.tool_name.replace(/_/g, '-')
    }
    validateErrors.value = result.errors
    validateOk.value = result.valid
    validatedToolName.value = result.tool_name ?? null
    aiDialogOpen.value = false
    if (result.valid) {
      toast.showSuccess(t('common.success'), t('agentSkills.aiGenerated'))
    } else {
      toast.showWarn(t('common.error'), t('agentSkills.aiGeneratedWithErrors'))
    }
  } catch (err: unknown) {
    aiError.value = err instanceof Error ? err.message : t('common.error')
  } finally {
    aiGenerating.value = false
  }
}

async function runValidate() {
  const res = await props.validateApi(editContent.value)
  validateErrors.value = res.errors
  validateOk.value = res.valid
  validatedToolName.value = res.tool_name ?? null
}

async function saveSkill() {
  const slug = (editingSlug.value || editSlug.value).trim().toLowerCase()
  if (!slug || !editName.value.trim()) return
  saving.value = true
  try {
    await props.saveSkillApi(slug, {
      name: editName.value.trim(),
      content_md: editContent.value,
      enabled: true,
    })
    toast.showSuccess(t('common.success'), t('agentSkills.saved'))
    editorOpen.value = false
    await refresh()
  } finally {
    saving.value = false
  }
}

function confirmDelete(slug: string) {
  if (!confirm(t('agentSkills.deleteConfirm', { slug }))) return
  props.deleteSkillApi(slug).then(async () => {
    toast.showSuccess(t('common.success'), t('agentSkills.deleted'))
    await refresh()
  })
}
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.markdown-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}
.font-mono {
  font-family: ui-monospace, monospace;
}
</style>
