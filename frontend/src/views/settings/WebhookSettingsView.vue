<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { useToastService } from '@/composables/useToast'
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  type Webhook,
  type WebhookCreate,
} from '@/api/webhooks'

const route = useRoute()
const { t } = useI18n()
const toast = useToastService()
const projectId = route.params.projectId as string

const webhooks = ref<Webhook[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const saving = ref(false)

const newWebhook = ref<WebhookCreate>({ name: '', url: '', secret: '', events: [] })
const newEvents = ref('')

async function loadWebhooks() {
  loading.value = true
  try {
    webhooks.value = await listWebhooks(projectId)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  newWebhook.value = { name: '', url: '', secret: '', events: [] }
  newEvents.value = ''
  showCreateDialog.value = true
}

async function onCreate() {
  if (!newWebhook.value.name.trim() || !newWebhook.value.url.trim()) return
  saving.value = true
  try {
    const events = newEvents.value
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
    await createWebhook(projectId, { ...newWebhook.value, events })
    showCreateDialog.value = false
    toast.showSuccess(t('common.success'), t('webhooks.created'))
    await loadWebhooks()
  } finally {
    saving.value = false
  }
}

async function onToggleActive(wh: Webhook) {
  try {
    await updateWebhook(wh.id, { is_active: !wh.is_active })
    await loadWebhooks()
  } catch { /* global interceptor */ }
}

async function onDelete(wh: Webhook) {
  try {
    await deleteWebhook(wh.id)
    toast.showSuccess(t('common.success'), t('webhooks.deleted'))
    await loadWebhooks()
  } catch { /* global interceptor */ }
}

async function onTest(wh: Webhook) {
  try {
    await testWebhook(wh.id)
    toast.showSuccess(t('common.success'), t('webhooks.testQueued'))
  } catch { /* global interceptor */ }
}

onMounted(loadWebhooks)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ $t('webhooks.title') }}</h2>
      <Button :label="$t('webhooks.create')" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <DataTable :value="webhooks" :loading="loading" stripedRows responsiveLayout="scroll">
      <template #empty>
        <div class="text-center text-color-secondary p-4">{{ $t('webhooks.empty') }}</div>
      </template>
      <Column :header="$t('webhooks.name')" field="name" />
      <Column :header="$t('webhooks.url')">
        <template #body="{ data }">
          <span class="text-xs font-mono">{{ data.url }}</span>
        </template>
      </Column>
      <Column :header="$t('webhooks.events')">
        <template #body="{ data }">
          <div v-if="data.events.length" class="flex gap-1 flex-wrap">
            <Tag v-for="ev in data.events" :key="ev" :value="ev" severity="info" class="text-xs" />
          </div>
          <span v-else class="text-color-secondary text-xs">{{ $t('webhooks.allEvents') }}</span>
        </template>
      </Column>
      <Column :header="$t('common.status')" style="width: 6rem">
        <template #body="{ data }">
          <Tag v-if="data.is_active" :value="$t('common.active')" severity="success" />
          <Tag v-else :value="$t('common.inactive')" severity="danger" />
        </template>
      </Column>
      <Column :header="$t('common.actions')" style="width: 10rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-play" severity="info" text rounded size="small" v-tooltip="$t('webhooks.test')" @click="onTest(data)" />
            <Button
              :icon="data.is_active ? 'pi pi-pause' : 'pi pi-play'"
              severity="secondary" text rounded size="small"
              @click="onToggleActive(data)"
            />
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreateDialog" :header="$t('webhooks.create')" modal :style="{ width: '32rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('webhooks.name') }}</label>
          <InputText v-model="newWebhook.name" class="w-full" :placeholder="$t('webhooks.namePlaceholder')" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('webhooks.url') }}</label>
          <InputText v-model="newWebhook.url" class="w-full" placeholder="https://example.com/hooks" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('webhooks.secret') }}</label>
          <InputText v-model="newWebhook.secret" class="w-full" :placeholder="$t('webhooks.secretPlaceholder')" type="password" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('webhooks.events') }}</label>
          <InputText v-model="newEvents" class="w-full" :placeholder="$t('webhooks.eventsPlaceholder')" />
          <small class="text-color-secondary">{{ $t('webhooks.eventsHelp') }}</small>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" :loading="saving" @click="onCreate" />
      </template>
    </Dialog>
  </div>
</template>
