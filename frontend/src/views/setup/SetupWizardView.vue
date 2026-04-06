<template>
  <div class="setup-wizard">
    <div class="setup-card">
      <!-- Step 1: Welcome -->
      <div v-if="step === 1" class="step-content">
        <div class="step-icon">
          <i class="pi pi-cog" style="font-size: 2.5rem; color: var(--p-primary-color);" />
        </div>
        <h1>{{ $t('setup.welcome') }}</h1>
        <p class="subtitle">{{ $t('setup.welcomeMessage') }}</p>
        <div class="features-list">
          <div class="feature-item">
            <i class="pi pi-shield" />
            <span>{{ $t('setup.featureAdmin') }}</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-users" />
            <span>{{ $t('setup.featureTeam') }}</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-chart-bar" />
            <span>{{ $t('setup.featureProjects') }}</span>
          </div>
        </div>
        <Button
          :label="$t('setup.getStarted')"
          icon="pi pi-arrow-right"
          icon-pos="right"
          class="w-full"
          @click="step = 2"
        />
      </div>

      <!-- Step 2: Create Admin -->
      <div v-else-if="step === 2" class="step-content">
        <h2>{{ $t('setup.createAdmin') }}</h2>
        <p class="subtitle">{{ $t('setup.createAdminMessage') }}</p>

        <div class="form-fields">
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
              @keyup.enter="handleSetup"
            />
          </div>

          <ul v-if="validationErrors.length" class="validation-errors">
            <li v-for="err in validationErrors" :key="err">{{ err }}</li>
          </ul>
        </div>

        <div class="button-row">
          <Button
            :label="$t('common.back')"
            severity="secondary"
            text
            @click="step = 1"
          />
          <Button
            :label="$t('setup.createAndContinue')"
            icon="pi pi-check"
            :loading="loading"
            :disabled="!canSubmit"
            @click="handleSetup"
          />
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>

      <!-- Step 3: Create Organization (optional) -->
      <div v-else-if="step === 3" class="step-content">
        <div class="step-icon">
          <i class="pi pi-building" style="font-size: 2.5rem; color: var(--p-primary-color);" />
        </div>
        <h2>{{ $t('setup.createOrg') }}</h2>
        <p class="subtitle">{{ $t('setup.createOrgMessage') }}</p>

        <div class="form-fields">
          <div class="field">
            <label for="orgName">{{ $t('setup.orgName') }}</label>
            <InputText
              id="orgName"
              v-model="orgName"
              :placeholder="$t('setup.orgNamePlaceholder')"
              class="w-full"
            />
          </div>
          <div class="field">
            <label for="orgDesc">{{ $t('setup.orgDescription') }}</label>
            <Textarea
              id="orgDesc"
              v-model="orgDescription"
              :placeholder="$t('setup.orgDescriptionPlaceholder')"
              rows="2"
              class="w-full"
            />
          </div>
          <div class="toggle-field">
            <label>{{ $t('orgs.autoJoinNewUsers') }}</label>
            <ToggleSwitch v-model="orgAutoJoin" />
          </div>
          <div class="toggle-field">
            <label>{{ $t('orgs.defaultOrg') }}</label>
            <ToggleSwitch v-model="orgDefaultOrg" />
          </div>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="button-row">
          <Button
            :label="$t('setup.skip')"
            severity="secondary"
            text
            @click="finishSetup"
          />
          <Button
            :label="$t('setup.createAndContinue')"
            icon="pi pi-arrow-right"
            icon-pos="right"
            :loading="loading"
            :disabled="!orgName.trim()"
            @click="handleCreateOrg"
          />
        </div>
      </div>

      <!-- Step 4: Create Project (optional) -->
      <div v-else-if="step === 4" class="step-content">
        <div class="step-icon">
          <i class="pi pi-folder" style="font-size: 2.5rem; color: var(--p-primary-color);" />
        </div>
        <h2>{{ $t('setup.createProject') }}</h2>
        <p class="subtitle">{{ $t('setup.createProjectMessage') }}</p>

        <div class="form-fields">
          <div class="field">
            <label for="projName">{{ $t('setup.projectName') }}</label>
            <InputText
              id="projName"
              v-model="projName"
              :placeholder="$t('setup.projectNamePlaceholder')"
              class="w-full"
            />
          </div>
          <div class="field">
            <label for="projKey">{{ $t('setup.projectKey') }}</label>
            <InputText
              id="projKey"
              v-model="projKey"
              :placeholder="$t('setup.projectKeyPlaceholder')"
              class="w-full"
              style="text-transform: uppercase;"
            />
          </div>
          <div class="toggle-field">
            <label>{{ $t('projects.autoAddOrgMembers') }}</label>
            <ToggleSwitch v-model="projAutoAdd" />
          </div>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="button-row">
          <Button
            :label="$t('setup.skip')"
            severity="secondary"
            text
            @click="finishSetup"
          />
          <Button
            :label="$t('setup.createAndContinue')"
            icon="pi pi-check"
            :loading="loading"
            :disabled="!projName.trim() || !projKey.trim()"
            @click="handleCreateProject"
          />
        </div>
      </div>

      <!-- Step 5: Success -->
      <div v-else class="step-content success-step">
        <div class="step-icon">
          <i class="pi pi-check-circle" style="font-size: 3rem; color: var(--p-green-500);" />
        </div>
        <h2>{{ $t('setup.success') }}</h2>
        <p class="subtitle">{{ $t('setup.successMessage') }}</p>
        <ProgressSpinner v-if="redirecting" style="width: 2rem; height: 2rem;" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import ProgressSpinner from 'primevue/progressspinner'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { createOrganization, updateOrgSettings } from '@/api/organizations'
import { createProject, updateProjectSettings } from '@/api/projects'
import axios from 'axios'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { setLocalToken } = useAuth()

const step = ref(1)
const loading = ref(false)
const redirecting = ref(false)
const errorMsg = ref<string | null>(null)

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const orgName = ref('')
const orgDescription = ref('')
const orgAutoJoin = ref(false)
const orgDefaultOrg = ref(false)
const createdOrgId = ref<string | null>(null)

const projName = ref('')
const projKey = ref('')
const projAutoAdd = ref(false)

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

async function handleSetup() {
  if (!canSubmit.value) return
  loading.value = true
  errorMsg.value = null
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const response = await axios.post(`${baseUrl}/setup/initialize`, {
      email: email.value,
      password: password.value,
      display_name: displayName.value.trim(),
    })
    const { access_token } = response.data
    setLocalToken(access_token)
    await authStore.initAuth()
    step.value = 3
  } catch (e: any) {
    const detail = e.response?.data?.detail || e.response?.data?.error?.message
    errorMsg.value = detail || t('setup.setupFailed')
  } finally {
    loading.value = false
  }
}

async function handleCreateOrg() {
  if (!orgName.value.trim()) return
  loading.value = true
  errorMsg.value = null
  try {
    const org = await createOrganization({
      name: orgName.value.trim(),
      description: orgDescription.value.trim() || undefined,
    })
    createdOrgId.value = org.id

    if (orgAutoJoin.value || orgDefaultOrg.value) {
      await updateOrgSettings(org.id, {
        auto_join_new_users: orgAutoJoin.value,
        default_org: orgDefaultOrg.value,
      })
    }

    step.value = 4
  } catch (e: any) {
    const detail = e.response?.data?.detail
    errorMsg.value = detail || t('setup.setupFailed')
  } finally {
    loading.value = false
  }
}

async function handleCreateProject() {
  if (!projName.value.trim() || !projKey.value.trim() || !createdOrgId.value) return
  loading.value = true
  errorMsg.value = null
  try {
    const project = await createProject(createdOrgId.value, {
      name: projName.value.trim(),
      key: projKey.value.trim().toUpperCase(),
    })

    if (projAutoAdd.value) {
      await updateProjectSettings(project.id, {
        auto_add_org_members: true,
      })
    }

    await finishSetup()
  } catch (e: any) {
    const detail = e.response?.data?.detail
    errorMsg.value = detail || t('setup.setupFailed')
  } finally {
    loading.value = false
  }
}

async function finishSetup() {
  step.value = 5
  redirecting.value = true
  setTimeout(() => {
    router.push('/')
  }, 1500)
}
</script>

<style scoped>
.setup-wizard {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  background: var(--p-surface-ground);
}
.setup-card {
  background: var(--p-content-background);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  padding: 2.5rem;
  max-width: 480px;
  width: 100%;
}
.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.step-icon {
  margin-bottom: 0.5rem;
}
.step-content h1,
.step-content h2 {
  margin: 0;
  text-align: center;
  color: var(--p-text-color);
}
.step-content h1 {
  font-size: 1.5rem;
}
.step-content h2 {
  font-size: 1.25rem;
}
.subtitle {
  text-align: center;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
  margin: 0;
}
.features-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 0;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--app-card-alt-bg);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--p-text-color);
}
.feature-item i {
  color: var(--p-primary-color);
  font-size: 1rem;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
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
.toggle-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}
.toggle-field label {
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
.button-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
  margin-top: 0.5rem;
}
.error-msg {
  color: var(--p-red-500);
  text-align: center;
  font-size: 0.875rem;
  margin: 0;
}
.success-step {
  padding: 2rem 0;
}
</style>
