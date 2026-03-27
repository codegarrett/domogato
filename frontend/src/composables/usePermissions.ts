import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermissions() {
  const authStore = useAuthStore()

  const isSystemAdmin = computed(() => authStore.isSystemAdmin)

  function hasOrgRole(orgId: string, minRole: string): boolean {
    return authStore.hasOrgRole(orgId, minRole)
  }

  function can(action: string): boolean {
    if (authStore.isSystemAdmin) return true
    return false
  }

  return {
    isSystemAdmin,
    hasOrgRole,
    can,
  }
}
