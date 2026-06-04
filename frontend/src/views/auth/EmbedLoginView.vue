<template>
  <div class="embed-login-view">
    <div v-if="!authStore.authConfig?.external_agent_enabled" class="embed-disabled">
      <i class="pi pi-ban" />
      <p>{{ $t('embed.disabled') }}</p>
    </div>

    <template v-else>
      <p class="embed-login-subtitle">
        {{ authStore.authMode === 'oidc' ? $t('auth.signInSubtitle') : $t('auth.embedSignInLocal') }}
      </p>

      <div v-if="authStore.authMode === 'oidc'">
        <Button
          :label="$t('auth.signInSSO')"
          icon="pi pi-sign-in"
          class="w-full"
          :loading="isRedirecting"
          @click="handleOidcLogin"
        />
      </div>

      <div v-else class="local-login-form">
        <div class="field">
          <label for="embed-email">{{ $t('auth.email') }}</label>
          <InputText
            id="embed-email"
            v-model="email"
            type="email"
            :placeholder="$t('auth.emailPlaceholder')"
            class="w-full"
            @keyup.enter="handleLocalLogin"
          />
        </div>
        <div class="field">
          <label for="embed-password">{{ $t('auth.password') }}</label>
          <InputText
            id="embed-password"
            v-model="password"
            type="password"
            :placeholder="$t('auth.passwordPlaceholder')"
            class="w-full"
            @keyup.enter="handleLocalLogin"
          />
        </div>
        <Button
          :label="$t('auth.signIn')"
          icon="pi pi-sign-in"
          class="w-full"
          :loading="localLoading"
          :disabled="!email || !password"
          @click="handleLocalLogin"
        />
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { embedReturnPath, setEmbedMode } from '@/utils/embedMode'
import { syncSessionCookie } from '@/utils/sessionCookie'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const localLoading = ref(false)
const isRedirecting = ref(false)
const errorMsg = ref<string | null>(null)

const returnTo = embedReturnPath(route.query as Record<string, string | string[] | undefined>)

onMounted(async () => {
  setEmbedMode()
  if (!authStore.authConfig) {
    await authStore.fetchAuthConfig()
  }
  if (authStore.isAuthenticated) {
    router.replace(returnTo)
  }
})

async function handleOidcLogin() {
  isRedirecting.value = true
  errorMsg.value = null
  try {
    await authStore.doLogin(returnTo)
  } catch {
    errorMsg.value = t('auth.loginFailed')
    isRedirecting.value = false
  }
}

async function handleLocalLogin() {
  if (!email.value || !password.value) return
  localLoading.value = true
  errorMsg.value = null
  try {
    await authStore.doLocalLogin(email.value, password.value)
    await syncSessionCookie()
    router.push(returnTo)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } } }
    errorMsg.value = err.response?.data?.detail || t('auth.loginFailed')
  } finally {
    localLoading.value = false
  }
}
</script>

<style scoped>
.embed-login-view {
  max-width: 420px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.embed-login-subtitle {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--p-text-muted-color);
}

.embed-disabled {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--p-text-muted-color);
}

.embed-disabled i {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.local-login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.8125rem;
  font-weight: 500;
}

.error-msg {
  color: var(--p-red-500);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
}
</style>
