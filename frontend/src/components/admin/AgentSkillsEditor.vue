<template>
  <div class="agent-skills-section">
    <div class="section-header">
      <div>
        <div class="font-semibold">{{ title }}</div>
        <p class="text-sm text-color-secondary mt-1 mb-0">{{ description }}</p>
      </div>
      <Button :label="t('agentSkills.newSkill')" icon="pi pi-plus" size="small" @click="openNewSkill" />
    </div>

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

    <div class="secrets-block mt-4">
      <div class="font-semibold mb-1">{{ t('agentSkills.secretsTitle') }}</div>
      <p class="text-sm text-color-secondary mt-0 mb-2">{{ t('agentSkills.secretsDescription') }}</p>
      <div class="flex gap-2 flex-wrap mb-2">
        <Tag v-for="key in secretKeys" :key="key" :value="key" severity="secondary" />
        <span v-if="!secretKeys.length" class="text-sm text-color-secondary">—</span>
      </div>
      <div class="flex gap-2 flex-wrap align-items-center">
        <InputText v-model="newSecretKey" :placeholder="t('agentSkills.secretKey')" class="secret-input" />
        <InputText v-model="newSecretValue" type="password" :placeholder="t('agentSkills.secretValue')" class="secret-input" />
        <Button :label="t('agentSkills.saveSecret')" size="small" :disabled="!newSecretKey || !newSecretValue" @click="saveSecret" />
      </div>
    </div>

    <Dialog v-model:visible="editorOpen" :header="editorTitle" modal :style="{ width: '48rem' }">
      <div class="flex flex-column gap-3">
        <InputText v-model="editSlug" :placeholder="t('agentSkills.slug')" :disabled="!!editingSlug" />
        <InputText v-model="editName" :placeholder="t('agentSkills.displayName')" />
        <Textarea v-model="editContent" rows="18" class="w-full font-mono text-sm" />
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
import type { AgentSkillListItem } from '@/api/agentSkills'
import { DEFAULT_SKILL_TEMPLATE } from '@/api/agentSkills'
import { useToastService } from '@/composables/useToast'

const props = defineProps<{
  title: string
  description: string
  loadSkills: () => Promise<AgentSkillListItem[]>
  loadSkill: (slug: string) => Promise<{ name: string; content_md: string }>
  saveSkillApi: (slug: string, payload: { name: string; content_md: string; enabled: boolean }) => Promise<unknown>
  deleteSkillApi: (slug: string) => Promise<void>
  validateApi: (contentMd: string) => Promise<{ valid: boolean; errors: string[]; tool_name?: string | null }>
  loadSecrets: () => Promise<{ keys: string[] }>
  saveSecretApi: (key: string, value: string) => Promise<void>
}>()

const { t } = useI18n()
const toast = useToastService()

const skills = ref<AgentSkillListItem[]>([])
const secretKeys = ref<string[]>([])
const editorOpen = ref(false)
const editingSlug = ref<string | null>(null)
const editSlug = ref('')
const editName = ref('')
const editContent = ref('')
const saving = ref(false)
const validateErrors = ref<string[]>([])
const validateOk = ref(false)
const validatedToolName = ref<string | null>(null)
const newSecretKey = ref('')
const newSecretValue = ref('')

const editorTitle = computed(() =>
  editingSlug.value ? t('agentSkills.editSkill') : t('agentSkills.newSkill'),
)

async function refresh() {
  skills.value = await props.loadSkills()
  secretKeys.value = (await props.loadSecrets()).keys
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

async function saveSecret() {
  if (!newSecretKey.value || !newSecretValue.value) return
  await props.saveSecretApi(newSecretKey.value.trim(), newSecretValue.value)
  newSecretKey.value = ''
  newSecretValue.value = ''
  toast.showSuccess(t('common.success'), t('agentSkills.secretSaved'))
  secretKeys.value = (await props.loadSecrets()).keys
}
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.secrets-block {
  border-top: 1px solid var(--app-border-color, var(--p-surface-200));
  padding-top: 1rem;
}
.secret-input {
  min-width: 10rem;
}
.font-mono {
  font-family: ui-monospace, monospace;
}
</style>
