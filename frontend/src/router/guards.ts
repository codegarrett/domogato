import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  clearEmbedMode,
  embedLoginPath,
  isEmbedMode,
  isEmbedRoute,
  setEmbedMode,
} from '@/utils/embedMode'

export async function authGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
): Promise<void> {
  const authStore = useAuthStore()

  try {
    if (!authStore.authConfig) {
      await authStore.fetchAuthConfig()
    }

    if (authStore.needsSetup && to.path !== '/setup') {
      next('/setup')
      return
    }

    if (!authStore.needsSetup && to.path === '/setup') {
      next('/auth/login')
      return
    }

    if (to.path === '/setup') {
      next()
      return
    }

    if (isEmbedRoute(to.path)) {
      setEmbedMode()
    }

    if (to.path.startsWith('/auth/embed')) {
      next()
      return
    }

    if (to.path === '/auth/silent-renew') {
      next()
      return
    }

    if (to.path.startsWith('/auth')) {
      if (isEmbedMode() && to.path === '/auth/login') {
        next(embedLoginPath(typeof to.query.returnTo === 'string' ? to.query.returnTo : undefined))
        return
      }
      next()
      return
    }

    if (isEmbedMode() && !isEmbedRoute(to.path) && to.path !== '/auth/callback') {
      next('/embed/agent')
      return
    }

    if (to.path.startsWith('/embed')) {
      if (!authStore.authConfig?.external_agent_enabled) {
        next()
        return
      }
    }

    if (authStore.isLoading && !authStore.isAuthenticated) {
      await authStore.initAuth()
    }

    if (!authStore.isAuthenticated) {
      if (to.path.startsWith('/embed')) {
        next({
          path: '/auth/embed/login',
          query: { returnTo: to.fullPath },
        })
        return
      }
      if (authStore.authMode === 'local') {
        clearEmbedMode()
        next('/auth/login')
        return
      }
      clearEmbedMode()
      await authStore.doLogin(to.fullPath)
      return
    }

    if (!authStore.currentUser && !authStore.backendLoading) {
      await authStore.fetchCurrentUser()
    }
  } catch (err) {
    console.error('Auth guard error:', err)
  }

  next()
}
