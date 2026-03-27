<template>
  <Select
    v-model="selectedOrgId"
    :options="orgStore.organizations"
    optionLabel="name"
    optionValue="id"
    :placeholder="$t('orgs.selectOrg')"
    class="org-switcher"
    @change="onOrgChange"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Select from 'primevue/select'
import { useOrganizationStore } from '@/stores/organization'

const orgStore = useOrganizationStore()
const selectedOrgId = ref<string | null>(orgStore.currentOrgId)

onMounted(async () => {
  if (orgStore.organizations.length === 0) {
    await orgStore.fetchOrganizations()
  }
  selectedOrgId.value = orgStore.currentOrgId
})

watch(() => orgStore.currentOrgId, (newId) => {
  selectedOrgId.value = newId
})

function onOrgChange(event: { value: string }) {
  orgStore.setCurrentOrg(event.value)
}
</script>

<style scoped>
.org-switcher {
  min-width: 200px;
}
</style>
