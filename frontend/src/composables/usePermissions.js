import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
export function usePermissions() {
    const authStore = useAuthStore();
    const isSystemAdmin = computed(() => authStore.isSystemAdmin);
    function hasOrgRole(orgId, minRole) {
        return authStore.hasOrgRole(orgId, minRole);
    }
    function can(_action) {
        if (authStore.isSystemAdmin)
            return true;
        return false;
    }
    return {
        isSystemAdmin,
        hasOrgRole,
        can,
    };
}
