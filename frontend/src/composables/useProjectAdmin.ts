import { computed, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

/** Whether the current user may perform org/project admin actions (delete tickets, purge, etc.). */
export function useProjectAdmin(
  projectId: Ref<string | undefined> | (() => string | undefined),
  organizationId: Ref<string | undefined> | (() => string | undefined),
) {
  const authStore = useAuthStore()

  const canAdministerProject = computed(() => {
    const pid = typeof projectId === 'function' ? projectId() : projectId.value
    const oid = typeof organizationId === 'function' ? organizationId() : organizationId.value
    if (!pid || !oid) return false
    return authStore.isProjectAdmin(pid, oid)
  })

  return { canAdministerProject }
}
