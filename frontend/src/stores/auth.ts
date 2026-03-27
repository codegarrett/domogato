import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import apiClient from '@/api/client'
import { setLocale } from '@/i18n'
import { useUiStore } from '@/stores/ui'
import axios from 'axios'

export interface AuthConfig {
  auth_mode: 'local' | 'oidc'
  needs_setup: boolean
  local_registration_enabled: boolean
  oidc: { issuer_url: string; client_id: string } | null
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  is_system_admin: boolean
  is_active: boolean
  preferences: Record<string, unknown>
  org_memberships: OrgMembership[]
  project_memberships: ProjectMembership[]
}

export interface OrgMembership {
  id: string
  organization_id: string
  organization_name: string | null
  organization_slug: string | null
  role: string
  created_at: string
}

export interface ProjectMembership {
  id: string
  project_id: string
  project_name: string | null
  project_key: string | null
  role: string
  created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const {
    isAuthenticated,
    accessToken,
    userProfile: oidcProfile,
    isLoading,
    isLocalMode,
    loggedOut,
    setAuthMode,
    setLocalToken,
    initialize,
    initializeOidc,
    login,
    handleCallback,
    logout,
    silentRenew,
  } = useAuth()

  const currentUser = ref<UserProfile | null>(null)
  const backendLoading = ref(false)
  const authConfig = ref<AuthConfig | null>(null)
  const configLoading = ref(true)
  const configError = ref<string | null>(null)

  const isFullyAuthenticated = computed(() => isAuthenticated.value && currentUser.value !== null)
  const isSystemAdmin = computed(() => currentUser.value?.is_system_admin ?? false)
  const needsSetup = computed(() => authConfig.value?.needs_setup ?? false)
  const authMode = computed(() => authConfig.value?.auth_mode ?? 'local')
  const registrationEnabled = computed(() => authConfig.value?.local_registration_enabled ?? false)

  async function fetchAuthConfig(): Promise<AuthConfig> {
    configLoading.value = true
    configError.value = null
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      const response = await axios.get(`${baseUrl}/auth/config`)
      authConfig.value = response.data
      setAuthMode(response.data.auth_mode)
      return response.data
    } catch (e: any) {
      configError.value = 'Failed to load auth configuration'
      console.error('Auth config fetch failed:', e)
      authConfig.value = {
        auth_mode: 'local',
        needs_setup: false,
        local_registration_enabled: false,
        oidc: null,
      }
      setAuthMode('local')
      return authConfig.value
    } finally {
      configLoading.value = false
    }
  }

  async function initAuth(): Promise<void> {
    const config = await fetchAuthConfig()

    if (config.auth_mode === 'oidc' && config.oidc) {
      await initializeOidc(config.oidc.issuer_url, config.oidc.client_id)
    }

    await initialize()

    if (isAuthenticated.value) {
      await fetchCurrentUser()
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    backendLoading.value = true
    try {
      const response = await apiClient.get('/users/me')
      currentUser.value = response.data
      applyUserPreferences(response.data.preferences)
    } catch (e) {
      console.error('Failed to fetch user profile:', e)
      currentUser.value = null
    } finally {
      backendLoading.value = false
    }
  }

  function applyUserPreferences(prefs: Record<string, unknown> | null) {
    if (!prefs) return
    if (typeof prefs.darkMode === 'boolean') {
      const uiStore = useUiStore()
      uiStore.setDarkMode(prefs.darkMode)
    }
    if (typeof prefs.locale === 'string' && (prefs.locale === 'en' || prefs.locale === 'es')) {
      setLocale(prefs.locale)
    }
  }

  async function doLocalLogin(email: string, password: string): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const response = await axios.post(`${baseUrl}/auth/login`, { email, password })
    const { access_token } = response.data
    setLocalToken(access_token)
    await fetchCurrentUser()
  }

  async function doLocalRegister(email: string, password: string, displayName: string): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const response = await axios.post(`${baseUrl}/auth/register`, {
      email,
      password,
      display_name: displayName,
    })
    const { access_token } = response.data
    setLocalToken(access_token)
    await fetchCurrentUser()
  }

  async function doLogin(returnTo?: string): Promise<void> {
    await login(returnTo)
  }

  async function doCallback(): Promise<string> {
    const returnTo = await handleCallback()
    await fetchCurrentUser()
    return returnTo
  }

  async function doLogout(): Promise<void> {
    currentUser.value = null
    loggedOut.value = true
    await logout()
    if (isLocalMode.value) {
      window.location.href = '/auth/login'
    }
  }

  function hasOrgRole(orgId: string, minRole: string): boolean {
    if (currentUser.value?.is_system_admin) return true
    const membership = currentUser.value?.org_memberships.find(m => m.organization_id === orgId)
    if (!membership) return false
    const hierarchy: Record<string, number> = { member: 10, admin: 20, owner: 30 }
    return (hierarchy[membership.role] ?? 0) >= (hierarchy[minRole] ?? 0)
  }

  return {
    isAuthenticated,
    isFullyAuthenticated,
    isLoading,
    backendLoading,
    accessToken,
    oidcProfile,
    currentUser,
    isSystemAdmin,
    authConfig,
    configLoading,
    configError,
    needsSetup,
    authMode,
    registrationEnabled,
    isLocalMode,
    fetchAuthConfig,
    initAuth,
    fetchCurrentUser,
    doLocalLogin,
    doLocalRegister,
    doLogin,
    doCallback,
    doLogout,
    hasOrgRole,
  }
})
