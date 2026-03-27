<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h2>{{ $t('workflows.title') }}</h2>
      <div class="flex gap-2">
        <Button :label="$t('workflows.seedDefaults')" icon="pi pi-database" severity="secondary" size="small" @click="handleSeed" :loading="seeding" />
        <Button :label="$t('workflows.newWorkflow')" icon="pi pi-plus" size="small" @click="showCreate = true" />
      </div>
    </div>

    <DataTable :value="workflows" :loading="loading" stripedRows class="p-datatable-sm">
      <Column field="name" :header="$t('common.name')">
        <template #body="{ data }">
          <router-link :to="`/workflows/${data.id}`" class="font-semibold">{{ data.name }}</router-link>
        </template>
      </Column>
      <Column field="description" :header="$t('common.description')" />
      <Column :header="$t('workflows.statuses')">
        <template #body="{ data }">{{ data.statuses?.length ?? 0 }}</template>
      </Column>
      <Column :header="$t('workflows.template')">
        <template #body="{ data }">
          <Tag v-if="data.is_template" :value="$t('workflows.template')" severity="info" />
        </template>
      </Column>
      <Column :header="$t('common.active')">
        <template #body="{ data }">
          <Tag :value="data.is_active ? $t('common.active') : $t('common.inactive')" :severity="data.is_active ? 'success' : 'danger'" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="$t('workflows.createWorkflow')" modal :style="{ width: '450px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label>{{ $t('common.name') }}</label>
          <InputText v-model="newWorkflow.name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>{{ $t('common.description') }}</label>
          <Textarea v-model="newWorkflow.description" rows="3" />
        </div>
        <div class="flex flex-column gap-1">
          <label>{{ $t('workflows.cloneFrom') }}</label>
          <Select
            v-model="newWorkflow.template_id"
            :options="templates"
            optionLabel="name"
            optionValue="id"
            :placeholder="$t('workflows.startFromScratch')"
            showClear
          />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="showCreate = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" @click="handleCreate" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { useOrganizationStore } from '@/stores/organization'
import { listWorkflows, createWorkflow, seedDefaultWorkflows, type Workflow } from '@/api/workflows'

const { t } = useI18n()
const orgStore = useOrganizationStore()
const workflows = ref<Workflow[]>([])
const loading = ref(false)
const seeding = ref(false)
const showCreate = ref(false)
const newWorkflow = ref({ name: '', description: '', template_id: null as string | null })

const templates = computed(() => workflows.value.filter(w => w.is_template))

async function fetchWorkflows() {
  if (!orgStore.currentOrgId) return
  loading.value = true
  try {
    const result = await listWorkflows(orgStore.currentOrgId)
    workflows.value = result.items
  } finally {
    loading.value = false
  }
}

onMounted(fetchWorkflows)

async function handleSeed() {
  if (!orgStore.currentOrgId) return
  seeding.value = true
  try {
    await seedDefaultWorkflows(orgStore.currentOrgId)
    await fetchWorkflows()
  } finally {
    seeding.value = false
  }
}

async function handleCreate() {
  if (!orgStore.currentOrgId) return
  await createWorkflow(orgStore.currentOrgId, {
    name: newWorkflow.value.name,
    description: newWorkflow.value.description || undefined,
    template_id: newWorkflow.value.template_id || undefined,
  })
  showCreate.value = false
  newWorkflow.value = { name: '', description: '', template_id: null }
  await fetchWorkflows()
}
</script>
