<template>
  <div class="register-view">
    <p style="text-align: center; margin-bottom: 1.5rem; color: var(--p-text-muted-color);">
      {{ $t('auth.createAccountSubtitle') }}
    </p>

    <div class="register-form">
      <div class="field">
        <label for="displayName">{{ $t('auth.displayName') }}</label>
        <InputText
          id="displayName"
          v-model="displayName"
          :placeholder="$t('auth.displayNamePlaceholder')"
          class="w-full"
        />
      </div>
      <div class="field">
        <label for="email">{{ $t('auth.email') }}</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          :placeholder="$t('auth.emailPlaceholder')"
          class="w-full"
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
        />
      </div>
      <div class="field">
        <label for="confirmPassword">{{ $t('auth.confirmPassword') }}</label>
        <InputText
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          :placeholder="$t('auth.confirmPasswordPlaceholder')"
          class="w-full"
          @keyup.enter="handleRegister"
        />
      </div>

      <ul v-if="validationErrors.length" class="validation-errors">
        <li v-for="err in validationErrors" :key="err">{{ err }}</li>
      </ul>

      <Button
        :label="$t('auth.register')"
        icon="pi pi-user-plus"
        class="w-full"
        :loading="loading"
        :disabled="!canSubmit"
        @click="handleRegister"
      />

      <div class="login-link">
        <router-link to="/auth/login">{{ $t('auth.alreadyHaveAccount') }}</router-link>
      </div>
    </div>

    <p v-if="errorMsg" class="error-msg">
      {{ errorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref<string | null>(null)

const validationErrors = computed(() => {
  const errors: string[] = []
  if (password.value && password.value.length < 8) {
    errors.push(t('auth.passwordMinLength'))
  }
  if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    errors.push(t('auth.passwordsMustMatch'))
  }
  return errors
})

const canSubmit = computed(() => {
  return displayName.value.trim() &&
    email.value &&
    password.value.length >= 8 &&
    password.value === confirmPassword.value &&
    validationErrors.value.length === 0
})

async function handleRegister() {
  if (!canSubmit.value) return
  loading.value = true
  errorMsg.value = null
  try {
    await authStore.doLocalRegister(email.value, password.value, displayName.value.trim())
    router.push('/')
  } catch (e: any) {
    const detail = e.response?.data?.detail || e.response?.data?.error?.message
    errorMsg.value = detail || t('auth.registrationFailed')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-form {
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
.validation-errors {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
  color: var(--p-red-500);
}
.login-link {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}
.login-link a {
  color: var(--p-primary-color);
  text-decoration: none;
}
.login-link a:hover {
  text-decoration: underline;
}
.error-msg {
  color: var(--p-red-500);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.875rem;
}
</style>
