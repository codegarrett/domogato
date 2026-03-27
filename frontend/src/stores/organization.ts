import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listOrganizations, getOrganization, type Organization } from '@/api/organizations'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Organization[]>([])
  const currentOrg = ref<Organization | null>(null)
  const loading = ref(false)

  const currentOrgId = computed(() => currentOrg.value?.id ?? null)

  async function fetchOrganizations() {
    loading.value = true
    try {
      const result = await listOrganizations()
      organizations.value = result.items
      if (!currentOrg.value && result.items.length > 0) {
        currentOrg.value = result.items[0]!
      }
    } finally {
      loading.value = false
    }
  }

  async function setCurrentOrg(orgId: string) {
    const existing = organizations.value.find(o => o.id === orgId)
    if (existing) {
      currentOrg.value = existing
    } else {
      currentOrg.value = await getOrganization(orgId)
    }
  }

  function clearCurrentOrg() {
    currentOrg.value = null
  }

  return { organizations, currentOrg, currentOrgId, loading, fetchOrganizations, setCurrentOrg, clearCurrentOrg }
})
