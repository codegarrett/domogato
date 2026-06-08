<template>
  <div class="agent-secrets-section">
    <div class="section-header">
      <div>
        <div class="font-semibold">{{ title }}</div>
        <p class="text-sm text-color-secondary mt-1 mb-0">{{ description }}</p>
      </div>
      <Button
        :label="t('agentSkills.addSecret')"
        icon="pi pi-plus"
        size="small"
        @click="openNewSecret"
      />
    </div>

    <p v-if="loadError" class="text-sm text-red-500 mt-3 mb-0">{{ loadError }}</p>

    <DataTable v-if="secretKeys.length" :value="secretRows" size="small" class="text-sm mt-3">
      <Column :header="t('agentSkills.secretKey')" field="key">
        <template #body="{ data }">
          <code class="secret-key">{{ data.key }}</code>
        </template>
      </Column>
      <Column :header="t('agentSkills.secretValue')" style="min-width: 12rem">
        <template #body="{ data }">
          <div class="value-cell">
            <i v-if="revealingKey === data.key" class="pi pi-spin pi-spinner text-xs" />
            <template v-else-if="revealedValues[data.key]">
              <code class="secret-value-inline">{{ revealedValues[data.key] }}</code>
              <Button
                icon="pi pi-copy"
                text
                rounded
                size="small"
                :aria-label="t('agentSkills.copySecret')"
                @click="copySecret(data.key)"
              />
            </template>
            <span v-else class="text-sm text-color-secondary">{{ t('agentSkills.secretValueHidden') }}</span>
          </div>
        </template>
      </Column>
      <Column style="width: 9rem">
        <template #body="{ data }">
          <Button
            v-tooltip.top="t('agentSkills.editSecret')"
            icon="pi pi-pencil"
            text
            size="small"
            @click="openEditSecret(data.key)"
          />
          <Button
            v-tooltip.top="isRevealed(data.key) ? t('agentSkills.hideSecret') : t('agentSkills.revealSecret')"
            :icon="isRevealed(data.key) ? 'pi pi-eye-slash' : 'pi pi-eye'"
            text
            size="small"
            :loading="revealingKey === data.key"
            @click="toggleReveal(data.key)"
          />
          <Button
            v-tooltip.top="t('common.delete')"
            icon="pi pi-trash"
            text
            size="small"
            severity="danger"
            @click="confirmDelete(data.key)"
          />
        </template>
      </Column>
    </DataTable>
    <p v-else class="text-sm text-color-secondary mt-3 mb-0">{{ t('agentSkills.noSecrets') }}</p>

    <Dialog
      v-model:visible="editorOpen"
      :header="editingKey ? t('agentSkills.editSecret') : t('agentSkills.addSecret')"
      modal
      :style="{ width: '28rem' }"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label class="field-label">{{ t('agentSkills.secretKey') }}</label>
          <InputText
            v-model="formKey"
            class="w-full"
            :placeholder="t('agentSkills.secretKeyPlaceholder')"
            :disabled="!!editingKey"
            @input="formKey = formKey.toUpperCase()"
          />
        </div>
        <div>
          <label class="field-label">{{ t('agentSkills.secretValue') }}</label>
          <InputText
            v-model="formValue"
            type="password"
            class="w-full"
            :placeholder="t('agentSkills.secretValue')"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="editorOpen = false" />
        <Button
          :label="t('common.save')"
          :loading="saving"
          :disabled="!formKey.trim() || !formValue"
          @click="saveSecret"
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
import { useToastService } from '@/composables/useToast'

const props = defineProps<{
  title: string
  description: string
  loadSecrets: () => Promise<{ keys: string[] }>
  saveSecretApi: (key: string, value: string) => Promise<void>
  revealSecretApi: (key: string) => Promise<{ key: string; value: string }>
  deleteSecretApi: (key: string) => Promise<void>
}>()

const { t } = useI18n()
const toast = useToastService()

const secretKeys = ref<string[]>([])
const loadError = ref<string | null>(null)
const saving = ref(false)
const editorOpen = ref(false)
const editingKey = ref<string | null>(null)
const formKey = ref('')
const formValue = ref('')
const revealedValues = ref<Record<string, string>>({})
const revealingKey = ref<string | null>(null)

const secretRows = computed(() => secretKeys.value.map((key) => ({ key })))

function isRevealed(key: string) {
  return key in revealedValues.value
}

async function refresh() {
  loadError.value = null
  try {
    secretKeys.value = (await props.loadSecrets()).keys
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : t('common.error')
    secretKeys.value = []
  }
}

onMounted(refresh)

function openNewSecret() {
  editingKey.value = null
  formKey.value = ''
  formValue.value = ''
  editorOpen.value = true
}

function openEditSecret(key: string) {
  editingKey.value = key
  formKey.value = key
  formValue.value = ''
  editorOpen.value = true
}

async function saveSecret() {
  const key = formKey.value.trim().toUpperCase()
  const value = formValue.value
  if (!key || !value) return
  saving.value = true
  try {
    await props.saveSecretApi(key, value)
    formValue.value = ''
    editorOpen.value = false
    if (isRevealed(key)) {
      revealedValues.value = { ...revealedValues.value, [key]: value }
    }
    toast.showSuccess(t('common.success'), t('agentSkills.secretSaved'))
    await refresh()
  } finally {
    saving.value = false
  }
}

async function toggleReveal(key: string) {
  if (isRevealed(key)) {
    const next = { ...revealedValues.value }
    delete next[key]
    revealedValues.value = next
    return
  }

  revealingKey.value = key
  try {
    const result = await props.revealSecretApi(key)
    revealedValues.value = { ...revealedValues.value, [result.key]: result.value }
  } catch (err: unknown) {
    toast.showError(t('common.error'), err instanceof Error ? err.message : t('common.error'))
  } finally {
    revealingKey.value = null
  }
}

async function copySecret(key: string) {
  const value = revealedValues.value[key]
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    toast.showSuccess(t('common.success'), t('agentSkills.secretCopied'))
  } catch {
    toast.showError(t('common.error'), t('common.error'))
  }
}

function confirmDelete(key: string) {
  if (!confirm(t('agentSkills.deleteSecretConfirm', { key }))) return
  props.deleteSecretApi(key).then(async () => {
    const next = { ...revealedValues.value }
    delete next[key]
    revealedValues.value = next
    toast.showSuccess(t('common.success'), t('agentSkills.secretDeleted'))
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
.field-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}
.secret-key,
.secret-value-inline {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
}
.value-cell {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  word-break: break-all;
}
</style>
