import { useAuthStore } from '@/stores/auth';
export async function authGuard(to, _from, next) {
    const authStore = useAuthStore();
    try {
        if (!authStore.authConfig) {
            await authStore.fetchAuthConfig();
        }
        if (authStore.needsSetup && to.path !== '/setup') {
            next('/setup');
            return;
        }
        if (!authStore.needsSetup && to.path === '/setup') {
            next('/auth/login');
            return;
        }
        if (to.path === '/setup') {
            next();
            return;
        }
        if (to.path.startsWith('/auth')) {
            next();
            return;
        }
        if (authStore.isLoading && !authStore.isAuthenticated) {
            await authStore.initAuth();
        }
        if (!authStore.isAuthenticated) {
            if (authStore.authMode === 'local') {
                next('/auth/login');
                return;
            }
            await authStore.doLogin(to.fullPath);
            return;
        }
        if (!authStore.currentUser && !authStore.backendLoading) {
            await authStore.fetchCurrentUser();
        }
    }
    catch (err) {
        console.error('Auth guard error:', err);
    }
    next();
}
