<template>
  <div class="login-view">
    <p style="text-align: center; margin-bottom: 1.5rem; color: var(--p-text-muted-color);">
      {{ authStore.authMode === 'oidc' ? $t('auth.signInSubtitle') : $t('auth.signInLocal') }}
    </p>

    <!-- OIDC Mode -->
    <div v-if="authStore.authMode === 'oidc'">
      <Button
        :label="$t('auth.signInSSO')"
        icon="pi pi-sign-in"
        class="w-full"
        :loading="isRedirecting"
        @click="handleOidcLogin"
      />
    </div>

    <!-- Local Mode -->
    <div v-else class="local-login-form">
      <div class="field">
        <label for="email">{{ $t('auth.email') }}</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          :placeholder="$t('auth.emailPlaceholder')"
          class="w-full"
          @keyup.enter="handleLocalLogin"
        />
      </div>
      <div class="field">
        <label for="password">{{ $t('auth.password') }}</label>
        <InputText
          id="password"
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
      <div v-if="authStore.registrationEnabled" class="register-link">
        <router-link to="/auth/register">{{ $t('auth.createAccount') }}</router-link>
      </div>
    </div>

    <p v-if="errorMsg" class="error-msg">
      {{ errorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const isRedirecting = ref(false)
const localLoading = ref(false)
const errorMsg = ref<string | null>(null)
const email = ref('')
const password = ref('')

async function handleOidcLogin() {
  isRedirecting.value = true
  errorMsg.value = null
  try {
    await authStore.doLogin()
  } catch (e) {
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
    router.push('/')
  } catch (e: any) {
    const detail = e.response?.data?.detail || e.response?.data?.error?.message
    errorMsg.value = detail || t('auth.loginFailed')
  } finally {
    localLoading.value = false
  }
}
</script>

<style scoped>
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
  color: var(--p-text-color);
}
.register-link {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}
.register-link a {
  color: var(--p-primary-color);
  text-decoration: none;
}
.register-link a:hover {
  text-decoration: underline;
}
.error-msg {
  color: var(--p-red-500);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
}
</style>
