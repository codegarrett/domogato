<template>
  <div>
    <h2>{{ $t('projects.title') }}</h2>
    <p class="text-color-secondary mb-4">{{ $t('projects.subtitle') }}</p>
    <DataTable :value="projectStore.projects" :loading="projectStore.loading" stripedRows class="p-datatable-sm">
      <Column field="key" :header="$t('projects.key')" style="width: 80px">
        <template #body="{ data }">
          <Tag :value="data.key" severity="info" />
        </template>
      </Column>
      <Column field="name" :header="$t('common.name')">
        <template #body="{ data }">
          <router-link :to="`/projects/${data.id}`" class="font-semibold">{{ data.name }}</router-link>
        </template>
      </Column>
      <Column field="visibility" :header="$t('common.visibility')" />
      <Column field="is_archived" :header="$t('common.status')">
        <template #body="{ data }">
          <Tag
            :value="data.is_archived ? $t('common.archived') : $t('common.active')"
            :severity="data.is_archived ? 'warning' : 'success'"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { useProjectStore } from '@/stores/project'
import { useOrganizationStore } from '@/stores/organization'

const projectStore = useProjectStore()
const orgStore = useOrganizationStore()

onMounted(async () => {
  if (orgStore.currentOrgId) {
    await projectStore.fetchProjects(orgStore.currentOrgId)
  }
})
</script>
