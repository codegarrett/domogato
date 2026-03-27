<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h2>{{ $t('orgs.title') }}</h2>
      <Button
        v-if="authStore.isSystemAdmin"
        :label="$t('orgs.createOrg')"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
      />
    </div>

    <DataTable
      :value="orgStore.organizations"
      :loading="orgStore.loading"
      stripedRows
      class="p-datatable-sm"
    >
      <Column field="name" :header="$t('common.name')">
        <template #body="{ data }">
          <router-link :to="`/organizations/${data.id}`" class="font-semibold">
            {{ data.name }}
          </router-link>
        </template>
      </Column>
      <Column field="slug" :header="$t('orgs.slug')" />
      <Column field="description" :header="$t('common.description')" />
      <Column field="created_at" :header="$t('common.created')">
        <template #body="{ data }">
          {{ new Date(data.created_at).toLocaleDateString() }}
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreateDialog" :header="$t('orgs.createOrg')" modal :style="{ width: '450px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label for="orgName">{{ $t('common.name') }}</label>
          <InputText id="orgName" v-model="newOrg.name" />
        </div>
        <div class="flex flex-column gap-1">
          <label for="orgDesc">{{ $t('common.description') }}</label>
          <Textarea id="orgDesc" v-model="newOrg.description" rows="3" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" text @click="showCreateDialog = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" :loading="creating" @click="handleCreate" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useOrganizationStore } from '@/stores/organization'
import { useAuthStore } from '@/stores/auth'
import { createOrganization } from '@/api/organizations'

const orgStore = useOrganizationStore()
const authStore = useAuthStore()

const showCreateDialog = ref(false)
const creating = ref(false)
const newOrg = ref({ name: '', description: '' })

onMounted(() => {
  orgStore.fetchOrganizations()
})

async function handleCreate() {
  creating.value = true
  try {
    await createOrganization({ name: newOrg.value.name, description: newOrg.value.description || undefined })
    showCreateDialog.value = false
    newOrg.value = { name: '', description: '' }
    await orgStore.fetchOrganizations()
  } finally {
    creating.value = false
  }
}
</script>
